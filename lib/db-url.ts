/**
 * Resolves the Postgres connection string regardless of which env var name the
 * hosting platform's storage integration happened to use (Vercel storage
 * integrations let the user pick a custom prefix, e.g. STORAGE_URL instead of
 * DATABASE_URL). Also backfills process.env.DATABASE_URL so the Prisma CLI
 * (migrate/seed) and any third-party code that reads it directly still work.
 */
const CANDIDATE_ENV_VARS = [
  "DATABASE_URL",
  "STORAGE_URL",
  "POSTGRES_URL",
  "PRISMA_DATABASE_URL",
  "STORAGE_DATABASE_URL",
  "STORAGE_POSTGRES_URL",
];

export function resolveDatabaseUrl(): string | undefined {
  for (const name of CANDIDATE_ENV_VARS) {
    const value = process.env[name];
    if (value) {
      if (!process.env.DATABASE_URL) process.env.DATABASE_URL = value;
      return value;
    }
  }
  return undefined;
}
