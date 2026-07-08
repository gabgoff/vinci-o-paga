import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Vinci o Paga
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/leagues/public" className="hover:underline">
                Lega pubblica
              </Link>
              <Link href="/leagues/create" className="hover:underline">
                Crea lega
              </Link>
              {user.isSiteAdmin && (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              <span className="text-black/50 dark:text-white/50">{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Accedi
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
              >
                Registrati
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
