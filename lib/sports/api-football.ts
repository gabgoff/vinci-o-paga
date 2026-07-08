import { prisma } from "@/lib/prisma";
import type { SportsDataProvider } from "./provider";

const API_BASE = "https://v3.football.api-sports.io";
const SERIE_A_LEAGUE_ID = 135;

type ApiFootballTeam = {
  team: { id: number; name: string; code: string | null; logo: string };
};

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: { round: string };
  teams: {
    home: { id: number; winner: boolean | null };
    away: { id: number; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
};

/** Extracts the matchday number from a round label like "Regular Season - 12". */
function roundNumberFromLabel(label: string): number | null {
  const match = label.match(/(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

function mapFixtureStatus(short: string): "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" {
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (["1H", "2H", "HT", "ET", "P", "LIVE"].includes(short)) return "LIVE";
  if (["PST", "CANC", "ABD"].includes(short)) return "POSTPONED";
  return "SCHEDULED";
}

/** Live provider backed by api-football (api-sports.io). Requires API_FOOTBALL_KEY. */
export class ApiFootballProvider implements SportsDataProvider {
  constructor(private readonly apiKey: string) {}

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "x-apisports-key": this.apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`API-Football request failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    return json.response as T;
  }

  async syncSeasonFixtures(seasonId: string): Promise<void> {
    const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } });

    const teams = await this.request<ApiFootballTeam[]>(
      `/teams?league=${SERIE_A_LEAGUE_ID}&season=${season.year}`
    );
    for (const t of teams) {
      await prisma.team.upsert({
        where: { externalId: String(t.team.id) },
        create: {
          externalId: String(t.team.id),
          name: t.team.name,
          shortName: t.team.code ?? t.team.name.slice(0, 3).toUpperCase(),
          logoUrl: t.team.logo,
        },
        update: { name: t.team.name, logoUrl: t.team.logo },
      });
    }

    const fixtures = await this.request<ApiFootballFixture[]>(
      `/fixtures?league=${SERIE_A_LEAGUE_ID}&season=${season.year}`
    );

    const byRound = new Map<string, ApiFootballFixture[]>();
    for (const fx of fixtures) {
      const list = byRound.get(fx.league.round) ?? [];
      list.push(fx);
      byRound.set(fx.league.round, list);
    }

    for (const [label, fxs] of byRound) {
      const number = roundNumberFromLabel(label);
      if (number === null) continue;

      const earliestKickoff = fxs
        .map((f) => new Date(f.fixture.date))
        .sort((a, b) => a.getTime() - b.getTime())[0];

      const round = await prisma.round.upsert({
        where: { seasonId_number: { seasonId, number } },
        create: { seasonId, number, deadline: earliestKickoff, status: "SCHEDULED" },
        update: { deadline: earliestKickoff },
      });

      for (const fx of fxs) {
        const homeTeam = await prisma.team.findUnique({
          where: { externalId: String(fx.teams.home.id) },
        });
        const awayTeam = await prisma.team.findUnique({
          where: { externalId: String(fx.teams.away.id) },
        });
        if (!homeTeam || !awayTeam) continue;

        await prisma.match.upsert({
          where: { externalId: String(fx.fixture.id) },
          create: {
            externalId: String(fx.fixture.id),
            roundId: round.id,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            status: mapFixtureStatus(fx.fixture.status.short),
          },
          update: {},
        });
      }
    }
  }

  async syncRoundResults(roundId: string): Promise<void> {
    const round = await prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      include: { matches: true, season: true },
    });

    const fixtures = await this.request<ApiFootballFixture[]>(
      `/fixtures?league=${SERIE_A_LEAGUE_ID}&season=${round.season.year}&round=Regular Season - ${round.number}`
    );

    for (const fx of fixtures) {
      const status = mapFixtureStatus(fx.fixture.status.short);
      const existing = round.matches.find((m) => m.externalId === String(fx.fixture.id));
      if (!existing) continue;

      const isDraw =
        status === "FINISHED" && fx.goals.home !== null && fx.goals.home === fx.goals.away;
      const winnerTeamId =
        status === "FINISHED" && !isDraw
          ? fx.teams.home.winner
            ? existing.homeTeamId
            : existing.awayTeamId
          : null;

      await prisma.match.update({
        where: { id: existing.id },
        data: {
          status,
          homeScore: fx.goals.home,
          awayScore: fx.goals.away,
          isDraw,
          winnerTeamId,
        },
      });
    }
  }
}
