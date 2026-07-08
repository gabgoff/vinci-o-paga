import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuroCents } from "@/lib/format";
import { toCents, getLeaguePrizePool, EngineError } from "@/lib/engine";
import { joinLeagueAndPay } from "@/lib/leagues";

export default async function PublicLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  const league = await prisma.league.findFirst({
    where: { type: "PUBLIC" },
    orderBy: { createdAt: "desc" },
  });

  if (!league) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        Nessuna lega pubblica disponibile al momento.
      </p>
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId: league.id } },
  });
  const memberCount = await prisma.membership.count({ where: { leagueId: league.id } });
  const { totalCents } = await getLeaguePrizePool(league.id);

  async function join(formData: FormData) {
    "use server";
    const leagueId = String(formData.get("leagueId"));
    try {
      await joinLeagueAndPay(user.id, leagueId);
    } catch (e) {
      const message = e instanceof EngineError ? e.message : "Impossibile iscriversi.";
      redirect(`/leagues/public?error=${encodeURIComponent(message)}`);
    }
    redirect(`/leagues/${leagueId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Lega pubblica aperta a tutti gli utenti registrati.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <dl className="grid grid-cols-3 gap-4 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
        <div>
          <dt className="text-black/50 dark:text-white/50">Quota</dt>
          <dd className="font-medium">{formatEuroCents(toCents(league.entryFee))}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Iscritti</dt>
          <dd className="font-medium">{memberCount}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Montepremi</dt>
          <dd className="font-medium">{formatEuroCents(totalCents)}</dd>
        </div>
      </dl>

      {membership ? (
        <a
          href={`/leagues/${league.id}`}
          className="w-fit rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Vai alla lega
        </a>
      ) : (
        <form action={join}>
          <input type="hidden" name="leagueId" value={league.id} />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Iscriviti e paga {formatEuroCents(toCents(league.entryFee))} (simulato)
          </button>
        </form>
      )}
    </div>
  );
}
