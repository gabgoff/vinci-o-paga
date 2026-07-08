import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuroCents } from "@/lib/format";
import { toCents } from "@/lib/engine";

const statusLabel: Record<string, string> = {
  ACTIVE: "In corsa",
  ELIMINATED: "Eliminato",
  WINNER: "Vincitore",
};

const statusClass: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  ELIMINATED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  WINNER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { league: true },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Le tue leghe</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/leagues/public" className="underline">
            Lega pubblica
          </Link>
          <Link href="/leagues/join" className="underline">
            Unisciti con codice
          </Link>
          <Link href="/leagues/create" className="underline">
            Crea lega privata
          </Link>
        </div>
      </div>

      {memberships.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Non sei ancora iscritto a nessuna lega. Entra nella lega pubblica o creane una
          privata per iniziare.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {memberships.map((m) => (
          <Link
            key={m.id}
            href={`/leagues/${m.leagueId}`}
            className="flex items-center justify-between rounded-lg border border-black/10 p-4 hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/5"
          >
            <div>
              <p className="font-medium">{m.league.name}</p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {m.league.type === "PUBLIC" ? "Lega pubblica" : "Lega privata"} · Quota{" "}
                {formatEuroCents(toCents(m.league.entryFee))} ·{" "}
                {m.paid ? "Iscrizione pagata" : "Pagamento in sospeso"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[m.status]}`}
            >
              {statusLabel[m.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
