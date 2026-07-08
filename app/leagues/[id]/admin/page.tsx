import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuroCents } from "@/lib/format";
import { toCents } from "@/lib/engine";
import SettleButton from "@/components/SettleButton";

const roundStatusLabel: Record<string, string> = {
  SCHEDULED: "Programmato",
  OPEN: "Aperto alle scelte",
  CLOSED: "Chiuso",
  SETTLED: "Concluso",
};

export default async function LeagueAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) notFound();
  if (league.hostId !== user.id && !user.isSiteAdmin) {
    redirect(`/leagues/${id}`);
  }

  const rounds = await prisma.round.findMany({
    where: { seasonId: league.seasonId },
    orderBy: { number: "asc" },
  });

  const memberships = await prisma.membership.findMany({
    where: { leagueId: league.id },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/leagues/${league.id}`} className="text-sm underline">
          ← Torna alla lega
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Gestione: {league.name}</h1>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Turni Serie A</h2>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Il calendario è condiviso da tutte le leghe della stagione. Sincronizzando i
          risultati di un turno si valutano automaticamente tutte le leghe collegate.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {rounds.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-black/10 p-3 text-sm dark:border-white/15"
            >
              <span>
                Giornata {r.number} · {roundStatusLabel[r.status]} · scadenza{" "}
                {formatDate(r.deadline)}
              </span>
              {(r.status === "OPEN" || r.status === "CLOSED") && (
                <SettleButton leagueId={league.id} roundId={r.id} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          Iscritti ({memberships.length}) · Montepremi{" "}
          {formatEuroCents(
            toCents(league.entryFee) * memberships.filter((m) => m.paid).length
          )}
        </h2>
        <ul className="mt-3 flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {memberships.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {m.user.name} <span className="text-black/40">({m.user.email})</span>
              </span>
              <span className="text-black/50 dark:text-white/50">
                {m.paid ? "Pagato" : "Non pagato"} · {m.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
