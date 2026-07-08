import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinLeagueAndPay } from "@/lib/leagues";
import { EngineError } from "@/lib/engine";

export default async function JoinLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  async function join(formData: FormData) {
    "use server";
    const code = String(formData.get("code") ?? "")
      .trim()
      .toUpperCase();

    const league = await prisma.league.findUnique({ where: { inviteCode: code } });
    if (!league) {
      redirect(`/leagues/join?error=${encodeURIComponent("Codice invito non valido.")}`);
    }

    try {
      await joinLeagueAndPay(user.id, league.id);
    } catch (e) {
      const message = e instanceof EngineError ? e.message : "Impossibile iscriversi.";
      redirect(`/leagues/join?error=${encodeURIComponent(message)}`);
    }
    redirect(`/leagues/${league.id}`);
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Unisciti a una lega privata</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Inserisci il codice invito condiviso dall&apos;host della lega.
      </p>
      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <form action={join} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Codice invito
          <input
            name="code"
            required
            maxLength={6}
            placeholder="ES. AB12CD"
            className="rounded-md border border-black/15 px-3 py-2 uppercase tracking-widest dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          Unisciti e paga (simulato)
        </button>
      </form>
    </div>
  );
}
