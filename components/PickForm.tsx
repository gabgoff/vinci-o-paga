"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Team = { id: string; name: string };

export default function PickForm({
  leagueId,
  roundId,
  teams,
}: {
  leagueId: string;
  roundId: string;
  teams: Team[];
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Seleziona una squadra.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, teamId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Errore durante la scelta.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Scegli la squadra che pensi vincerà
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        >
          <option value="">— seleziona —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Invio..." : "Conferma scelta"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400 sm:ml-2">{error}</p>}
    </form>
  );
}
