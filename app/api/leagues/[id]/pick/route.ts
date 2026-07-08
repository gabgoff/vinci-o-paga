import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitPick, EngineError } from "@/lib/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Devi accedere." }, { status: 401 });
  }

  const { id: leagueId } = await params;
  const body = await request.json().catch(() => null);
  const roundId = body?.roundId as string | undefined;
  const teamId = body?.teamId as string | undefined;

  if (!roundId || !teamId) {
    return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Non sei iscritto a questa lega." }, { status: 403 });
  }

  try {
    const pick = await submitPick(membership.id, roundId, teamId);
    return NextResponse.json({ pick });
  } catch (e) {
    const message = e instanceof EngineError ? e.message : "Errore durante la scelta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
