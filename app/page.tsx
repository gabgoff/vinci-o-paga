import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-10">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Vinci o Paga</h1>
        <p className="mt-3 text-lg text-black/60 dark:text-white/60">
          Il gioco a eliminazione della Serie A: scegli bene, o sei fuori.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
            >
              Vai alla dashboard
            </Link>
          ) : (
            <Link
              href="/register"
              className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
            >
              Iscriviti ora
            </Link>
          )}
          <Link
            href="/leagues/public"
            className="rounded-md border border-black/15 px-5 py-2.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Lega pubblica
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-xl font-semibold">Come si gioca</h2>
        <ol className="mt-4 flex flex-col gap-3 text-sm">
          <li>
            <strong>1.</strong> Ogni giornata scegli una squadra che pensi vincerà.
          </li>
          <li>
            <strong>2.</strong> Se la squadra vince, passi al turno successivo.
          </li>
          <li>
            <strong>3.</strong> Se pareggia o perde, sei eliminato.
          </li>
          <li>
            <strong>4.</strong> Non puoi scegliere la stessa squadra due volte nella
            competizione.
          </li>
          <li>
            <strong>5.</strong> Vince l&apos;ultimo partecipante rimasto in gioco (il
            montepremi si divide se restano più vincitori a pari merito).
          </li>
        </ol>
      </section>

      <section className="rounded-xl border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-xl font-semibold">Leghe pubbliche e private</h2>
        <p className="mt-3 text-sm text-black/70 dark:text-white/70">
          Iscriviti pagando la quota d&apos;ingresso e gioca nella lega pubblica, oppure
          crea una lega privata e invita i tuoi amici con un codice. Il montepremi di ogni
          lega è dato dalla somma delle quote pagate dagli iscritti e viene diviso tra i
          vincitori finali.
        </p>
      </section>

      <p className="text-center text-xs text-black/40 dark:text-white/40">
        Nota: in questa versione demo i pagamenti sono simulati (nessun addebito reale).
        Un montepremi con denaro reale può essere soggetto a normativa sui giochi a
        pronostico: verificare i requisiti legali prima di un lancio reale.
      </p>
    </div>
  );
}
