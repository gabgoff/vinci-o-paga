import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/mock";
import { EngineError } from "@/lib/engine";

export function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** Joins a league (if not already a member) and immediately pays the entry fee. */
export async function joinLeagueAndPay(userId: string, leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  if (league.status !== "OPEN") {
    throw new EngineError("Le iscrizioni a questa lega sono chiuse.");
  }

  await prisma.membership.upsert({
    where: { userId_leagueId: { userId, leagueId } },
    create: { userId, leagueId },
    update: {},
  });

  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId_leagueId: { userId, leagueId } },
  });

  if (!membership.paid) {
    await getPaymentProvider().createPayment(userId, leagueId);
  }

  return membership;
}

export async function createPrivateLeague(
  hostId: string,
  name: string,
  entryFeeEuros: number,
  seasonId: string
) {
  let inviteCode = generateInviteCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const existing = await prisma.league.findUnique({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const league = await prisma.league.create({
    data: {
      name,
      type: "PRIVATE",
      hostId,
      inviteCode,
      seasonId,
      entryFee: entryFeeEuros,
      status: "OPEN",
    },
  });

  await joinLeagueAndPay(hostId, league.id);

  return league;
}
