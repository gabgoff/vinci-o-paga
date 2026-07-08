import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { joinLeagueAndPay } from "@/lib/leagues";
import { EngineError } from "@/lib/engine";

/** Simulated payment endpoint: joins (if needed) and pays the entry fee for a league. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Devi accedere." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const leagueId = body?.leagueId as string | undefined;
  if (!leagueId) {
    return NextResponse.json({ error: "leagueId mancante." }, { status: 400 });
  }

  try {
    const membership = await joinLeagueAndPay(user.id, leagueId);
    return NextResponse.json({ membership });
  } catch (e) {
    const message = e instanceof EngineError ? e.message : "Pagamento non riuscito.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
