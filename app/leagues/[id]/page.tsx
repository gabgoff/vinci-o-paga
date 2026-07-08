import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuroCents, formatDate } from "@/lib/format";
import { toCents, getAvailableTeams, getLeaguePrizePool } from "@/lib/engine";
import PickForm from "@/components/PickForm";

const statusLabel: Record<string, string> = {
  ACTIVE: "In corsa",
  ELIMINATED: "Eliminato",
  WINNER: "Vincitore",
};

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) notFound();

  const membership = await prisma.membership.findUnique({
    where: { userId_leagueId: { userId: user.id, leagueId: league.id } },
  });

  if (!membership) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Non sei iscritto a questa lega
          {league.type === "PRIVATE" ? " privata." : "."}
        </p>
        {league.type === "PUBLIC" ? (
          <Link href="/leagues/public" className="w-fit underline">
            Vai alla pagina della lega pubblica per iscriverti
          </Link>
        ) : (
          <Link href="/leagues/join" className="w-fit underline">
            Hai un codice invito? Unisciti qui
          </Link>
        )}
      </div>
    );
  }

  const memberships = await prisma.membership.findMany({
    where: { leagueId: league.id },
    include: { user: true },
    orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
  });

  const currentRound = await prisma.round.findFirst({
    where: { seasonId: league.seasonId, status: "OPEN" },
    orderBy: { number: "asc" },
  });

  const myPicks = await prisma.pick.findMany({
    where: { membershipId: membership.id },
    include: { round: true, team: true },
    orderBy: { round: { number: "asc" } },
  });

  const pickForCurrentRound = currentRound
    ? myPicks.find((p) => p.roundId === currentRound.id)
    : undefined;

  const availableTeams =
    currentRound && membership.status === "ACTIVE" && !pickForCurrentRound
      ? await getAvailableTeams(membership.id)
      : [];

  const { totalCents, winnerCount, perWinnerCents } = await getLeaguePrizePool(league.id);
  const isHost = league.hostId === user.id;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {league.type === "PUBLIC" ? "Lega pubblica" : "Lega privata"} ·{" "}
            {league.status === "OPEN"
              ? "Iscrizioni aperte"
              : league.status === "IN_PROGRESS"
                ? "In corso"
                : "Conclusa"}
          </p>
        </div>
        {(isHost || user.isSiteAdmin) && (
          <Link
            href={`/leagues/${league.id}/admin`}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Gestione lega
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm sm:grid-cols-4 dark:border-white/15">
        <div>
          <dt className="text-black/50 dark:text-white/50">Quota</dt>
          <dd className="font-medium">{formatEuroCents(toCents(league.entryFee))}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Iscritti</dt>
          <dd className="font-medium">{memberships.length}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Montepremi</dt>
          <dd className="font-medium">{formatEuroCents(totalCents)}</dd>
        </div>
        {league.type === "PRIVATE" && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Codice invito</dt>
            <dd className="font-mono font-medium tracking-widest">{league.inviteCode}</dd>
          </div>
        )}
      </dl>

      {league.status === "FINISHED" && winnerCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
          <p className="font-medium">
            {winnerCount === 1 ? "Vincitore" : `${winnerCount} vincitori a pari merito`}:{" "}
            {formatEuroCents(perWinnerCents ?? 0)}
            {winnerCount > 1 ? " a testa" : ""}.
          </p>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">La tua situazione</h2>
        <p className="mt-1 text-sm">
          Stato:{" "}
          <span className="font-medium">{statusLabel[membership.status]}</span>
          {!membership.paid && " · Pagamento in sospeso"}
        </p>

        {membership.status === "ACTIVE" && currentRound && (
          <div className="mt-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <p className="text-sm font-medium">
              Giornata {currentRound.number} · scadenza {formatDate(currentRound.deadline)}
            </p>
            {pickForCurrentRound ? (
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Hai scelto <strong>{pickForCurrentRound.team.name}</strong>. Risultato:{" "}
                {pickForCurrentRound.result === "PENDING"
                  ? "in attesa"
                  : pickForCurrentRound.result === "WIN"
                    ? "vinta ✅"
                    : "persa/pareggiata ❌"}
              </p>
            ) : (
              <div className="mt-3">
                <PickForm
                  leagueId={league.id}
                  roundId={currentRound.id}
                  teams={availableTeams}
                />
              </div>
            )}
          </div>
        )}

        {membership.status === "ACTIVE" && !currentRound && (
          <p className="mt-3 text-sm text-black/60 dark:text-white/60">
            Nessun turno aperto al momento. Torna più tardi.
          </p>
        )}

        {myPicks.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Storico scelte</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-black/70 dark:text-white/70">
              {myPicks.map((p) => (
                <li key={p.id}>
                  Giornata {p.round.number}: {p.team.name} —{" "}
                  {p.result === "PENDING" ? "in attesa" : p.result === "WIN" ? "vinta" : "eliminato"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Classifica partecipanti</h2>
        <ul className="mt-3 flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {memberships.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>{m.user.name}</span>
              <span className="text-black/50 dark:text-white/50">
                {statusLabel[m.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
