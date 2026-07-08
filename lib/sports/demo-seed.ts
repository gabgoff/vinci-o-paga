import { prisma } from "@/lib/prisma";
import type { SportsDataProvider } from "./provider";

/** Deterministic pseudo-random score generator so demo results are reproducible. */
function hashSeed(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function scoreFor(seed: number, salt: number) {
  return (seed + salt) % 4; // 0-3 goals
}

/**
 * No external network calls: fixtures come from `prisma/seed.ts`. Used automatically
 * when API_FOOTBALL_KEY is not configured, so the whole app is testable without
 * external credentials.
 */
export class DemoSeedProvider implements SportsDataProvider {
  async syncSeasonFixtures(): Promise<void> {
    // Demo fixtures are created once by `prisma/seed.ts`; nothing to fetch here.
  }

  async syncRoundResults(roundId: string): Promise<void> {
    const matches = await prisma.match.findMany({ where: { roundId } });

    for (const match of matches) {
      if (match.status === "FINISHED") continue;

      const seed = hashSeed(match.id);
      const homeScore = scoreFor(seed, 0);
      const awayScore = scoreFor(seed, 1);
      const isDraw = homeScore === awayScore;
      const winnerTeamId = isDraw
        ? null
        : homeScore > awayScore
          ? match.homeTeamId
          : match.awayTeamId;

      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: "FINISHED",
          homeScore,
          awayScore,
          isDraw,
          winnerTeamId,
        },
      });
    }
  }
}
