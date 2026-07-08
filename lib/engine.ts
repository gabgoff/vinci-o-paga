import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

type MatchOutcome = {
  homeTeamId: string;
  awayTeamId: string;
  isDraw: boolean;
  winnerTeamId: string | null;
  status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";
};

/** Pure decision: did the picked team win its match? Assumes the match is FINISHED. */
export function computePickResult(
  pickedTeamId: string,
  match: MatchOutcome
): "WIN" | "OUT" {
  if (match.isDraw) return "OUT";
  return match.winnerTeamId === pickedTeamId ? "WIN" : "OUT";
}

/** Pure decision: given how many members were active before/after a round settles,
 * decide what happens to the league. */
export function determineRoundOutcome(
  activeBeforeCount: number,
  activeAfterCount: number
): "CONTINUE" | "ALL_ELIMINATED_JOINT_WINNERS" | "SINGLE_WINNER" {
  if (activeAfterCount === 0 && activeBeforeCount > 0) {
    return "ALL_ELIMINATED_JOINT_WINNERS";
  }
  if (activeAfterCount === 1) return "SINGLE_WINNER";
  return "CONTINUE";
}

/** Pure calculation: equal split of the prize pool across winners, rounded to cents. */
export function splitPrize(totalPrizeCents: number, winnerCount: number): number {
  if (winnerCount <= 0) return 0;
  return Math.floor(totalPrizeCents / winnerCount);
}

export function toCents(amount: Prisma.Decimal | number | string): number {
  return Math.round(Number(amount) * 100);
}

export class EngineError extends Error {}

export async function getAvailableTeams(membershipId: string) {
  const usedTeamIds = (
    await prisma.pick.findMany({
      where: { membershipId },
      select: { teamId: true },
    })
  ).map((p) => p.teamId);

  return prisma.team.findMany({
    where: { id: { notIn: usedTeamIds } },
    orderBy: { name: "asc" },
  });
}

export async function submitPick(
  membershipId: string,
  roundId: string,
  teamId: string
) {
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { id: membershipId },
  });
  if (membership.status !== "ACTIVE") {
    throw new EngineError("Sei eliminato da questa lega.");
  }

  const round = await prisma.round.findUniqueOrThrow({ where: { id: roundId } });
  if (round.status !== "OPEN") {
    throw new EngineError("Questo turno non è aperto per le scelte.");
  }
  if (round.deadline.getTime() < Date.now()) {
    throw new EngineError("Il termine per scegliere è scaduto.");
  }

  const alreadyUsed = await prisma.pick.findUnique({
    where: { membershipId_teamId: { membershipId, teamId } },
  });
  if (alreadyUsed) {
    throw new EngineError("Hai già scelto questa squadra in questa competizione.");
  }

  const alreadyPickedThisRound = await prisma.pick.findUnique({
    where: { membershipId_roundId: { membershipId, roundId } },
  });
  if (alreadyPickedThisRound) {
    throw new EngineError("Hai già fatto una scelta per questo turno.");
  }

  return prisma.pick.create({
    data: { membershipId, roundId, teamId },
  });
}

/** Settles a round: evaluates every ACTIVE membership in the round's league,
 * marks eliminations, and advances/finishes the league as appropriate. */
export async function settleRound(roundId: string) {
  const round = await prisma.round.findUniqueOrThrow({
    where: { id: roundId },
    include: { matches: true },
  });

  const leagues = await prisma.league.findMany({
    where: { seasonId: round.seasonId, status: { in: ["OPEN", "IN_PROGRESS"] } },
  });

  for (const league of leagues) {
    const activeMemberships = await prisma.membership.findMany({
      where: { leagueId: league.id, status: "ACTIVE" },
      include: { picks: { where: { roundId } } },
    });
    if (activeMemberships.length === 0) continue;

    const activeBeforeCount = activeMemberships.length;
    const eliminatedIds: string[] = [];

    for (const membership of activeMemberships) {
      const pick = membership.picks[0];
      if (!pick) {
        eliminatedIds.push(membership.id);
        continue;
      }

      const match = round.matches.find(
        (m) => m.homeTeamId === pick.teamId || m.awayTeamId === pick.teamId
      );
      if (!match || match.status !== "FINISHED") continue; // not settleable yet

      const result = computePickResult(pick.teamId, {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        isDraw: match.isDraw,
        winnerTeamId: match.winnerTeamId,
        status: match.status,
      });

      await prisma.pick.update({ where: { id: pick.id }, data: { result } });

      if (result === "OUT") eliminatedIds.push(membership.id);
    }

    if (eliminatedIds.length > 0) {
      await prisma.membership.updateMany({
        where: { id: { in: eliminatedIds } },
        data: { status: "ELIMINATED", eliminatedRoundId: roundId },
      });
    }

    const activeAfterCount = activeBeforeCount - eliminatedIds.length;
    const outcome = determineRoundOutcome(activeBeforeCount, activeAfterCount);

    if (outcome === "ALL_ELIMINATED_JOINT_WINNERS") {
      await prisma.membership.updateMany({
        where: { id: { in: eliminatedIds } },
        data: { status: "WINNER" },
      });
      await prisma.league.update({
        where: { id: league.id },
        data: { status: "FINISHED" },
      });
    } else if (outcome === "SINGLE_WINNER") {
      await prisma.membership.updateMany({
        where: { leagueId: league.id, status: "ACTIVE" },
        data: { status: "WINNER" },
      });
      await prisma.league.update({
        where: { id: league.id },
        data: { status: "FINISHED" },
      });
    } else if (league.status === "OPEN") {
      await prisma.league.update({
        where: { id: league.id },
        data: { status: "IN_PROGRESS" },
      });
    }
  }

  await prisma.round.update({ where: { id: roundId }, data: { status: "SETTLED" } });
}

export async function getLeaguePrizePool(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const paidCount = await prisma.membership.count({
    where: { leagueId, paid: true },
  });
  const totalCents = toCents(league.entryFee) * paidCount;
  const winners = await prisma.membership.findMany({
    where: { leagueId, status: "WINNER" },
  });
  const perWinnerCents =
    winners.length > 0 ? splitPrize(totalCents, winners.length) : null;
  return { totalCents, winnerCount: winners.length, perWinnerCents };
}
