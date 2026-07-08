import { execSync } from "node:child_process";

// Only apply migrations/seed automatically during a Vercel build. Vercel sets
// VERCEL=1 for every build it runs; local `npm run build` must not touch a
// shared database, so it's a no-op outside Vercel.
if (process.env.VERCEL) {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma db seed", { stdio: "inherit" });
}
