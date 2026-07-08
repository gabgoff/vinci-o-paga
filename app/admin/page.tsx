import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { getSportsDataProvider } from "@/lib/sports/provider";

const roundStatusLabel: Record<string, string> = {
  SCHEDULED: "Programmato",
  OPEN: "Aperto alle scelte",
  CLOSED: "Chiuso",
  SETTLED: "Concluso",
};

export default async function SiteAdminPage() {
  const user = await requireUser();
  if (!user.isSiteAdmin) redirect("/dashboard");

  const season = await prisma.season.findFirst({ orderBy: { year: "desc" } });
  const rounds = season
    ? await prisma.round.findMany({
        where: { seasonId: season.id },
        orderBy: { number: "asc" },
      })
    : [];
  const leagues = await prisma.league.findMany({
    include: { host: true, _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
  });

  async function openRound(formData: FormData) {
    "use server";
    const roundId = String(formData.get("roundId"));
    await prisma.round.update({ where: { id: roundId }, data: { status: "OPEN" } });
    redirect("/admin");
  }

  async function closeRound(formData: FormData) {
    "use server";
    const roundId = String(formData.get("roundId"));
    await prisma.round.update({ where: { id: roundId }, data: { status: "CLOSED" } });
    redirect("/admin");
  }

  async function syncFixtures() {
    "use server";
    if (!season) return;
    const provider = await getSportsDataProvider();
    await provider.syncSeasonFixtures(season.id);
    redirect("/admin");
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Amministrazione sito</h1>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Calendario {season?.label ?? "(nessuna stagione)"}
          </h2>
          <form action={syncFixtures}>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Sincronizza calendario stagione
            </button>
          </form>
        </div>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {process.env.API_FOOTBALL_KEY
            ? "Sorgente dati: API-Football (live)."
            : "Sorgente dati: demo seed (nessuna chiave API-Football configurata)."}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {rounds.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-black/10 p-3 text-sm dark:border-white/15"
            >
              <span>
                Giornata {r.number} · {roundStatusLabel[r.status]} · scadenza{" "}
                {formatDate(r.deadline)}
              </span>
              <div className="flex gap-2">
                {r.status === "SCHEDULED" && (
                  <form action={openRound}>
                    <input type="hidden" name="roundId" value={r.id} />
                    <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">
                      Apri turno
                    </button>
                  </form>
                )}
                {r.status === "OPEN" && (
                  <form action={closeRound}>
                    <input type="hidden" name="roundId" value={r.id} />
                    <button className="rounded-md bg-black px-3 py-1 text-xs text-white hover:bg-black/80 dark:bg-white dark:text-black">
                      Chiudi turno
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Leghe ({leagues.length})</h2>
        <ul className="mt-3 flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {leagues.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/leagues/${l.id}`} className="underline">
                {l.name}
              </Link>
              <span className="text-black/50 dark:text-white/50">
                {l.type} · {l._count.memberships} iscritti · {l.status}
                {l.host ? ` · host: ${l.host.name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
