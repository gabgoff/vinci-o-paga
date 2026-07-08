import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleRound } from "@/lib/engine";
import { getSportsDataProvider } from "@/lib/sports/provider";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Devi accedere." }, { status: 401 });
  }

  const { id: leagueId } = await params;
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) {
    return NextResponse.json({ error: "Lega non trovata." }, { status: 404 });
  }
  if (league.hostId !== user.id && !user.isSiteAdmin) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const roundId = body?.roundId as string | undefined;
  if (!roundId) {
    return NextResponse.json({ error: "roundId mancante." }, { status: 400 });
  }

  const provider = await getSportsDataProvider();
  await provider.syncRoundResults(roundId);
  await settleRound(roundId);

  return NextResponse.json({ ok: true });
}
