import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPrivateLeague } from "@/lib/leagues";

export default async function CreateLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const entryFee = Number(formData.get("entryFee") ?? "1");

    if (!name || !Number.isFinite(entryFee) || entryFee <= 0) {
      redirect(
        `/leagues/create?error=${encodeURIComponent("Inserisci un nome e una quota valida.")}`
      );
    }

    const season = await prisma.season.findFirstOrThrow({
      orderBy: { year: "desc" },
    });

    const league = await createPrivateLeague(user.id, name, entryFee, season.id);
    redirect(`/leagues/${league.id}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Crea una lega privata</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Diventerai l&apos;host della lega e riceverai un codice invito da condividere con
        gli amici.
      </p>
      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <form action={create} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome della lega
          <input
            name="name"
            required
            placeholder="Es. Lega degli amici"
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Quota d&apos;iscrizione (€)
          <input
            type="number"
            name="entryFee"
            min="0.5"
            step="0.5"
            defaultValue={1}
            required
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          Crea lega
        </button>
      </form>
    </div>
  );
}
