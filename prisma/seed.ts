import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { resolveDatabaseUrl } from "../lib/db-url";

const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const SERIE_A_TEAMS = [
  "Atalanta",
  "Bologna",
  "Cagliari",
  "Como",
  "Empoli",
  "Fiorentina",
  "Genoa",
  "Hellas Verona",
  "Inter",
  "Juventus",
  "Lazio",
  "Lecce",
  "Milan",
  "Monza",
  "Napoli",
  "Parma",
  "Roma",
  "Torino",
  "Udinese",
  "Venezia",
];

function shortNameFor(name: string) {
  return name.slice(0, 3).toUpperCase();
}

function dayFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Round-robin pairing so each round pairs all teams exactly once, rotating for variety. */
function pairingsForRound(teamIds: string[], roundIndex: number): [string, string][] {
  const n = teamIds.length;
  const rotated = [
    teamIds[0],
    ...teamIds.slice(1).map((_, i) => teamIds[1 + ((i + roundIndex) % (n - 1))]),
  ];
  const pairs: [string, string][] = [];
  for (let i = 0; i < n / 2; i++) {
    pairs.push([rotated[i], rotated[n - 1 - i]]);
  }
  return pairs;
}

async function main() {
  console.log("Seeding demo data (Serie A, dati fittizi)...");

  const season = await prisma.season.upsert({
    where: { id: "demo-season-2025-26" },
    create: { id: "demo-season-2025-26", year: 2025, label: "Serie A 2025/26" },
    update: {},
  });

  const teams = [];
  for (const name of SERIE_A_TEAMS) {
    const team = await prisma.team.upsert({
      where: { externalId: `demo-${name}` },
      create: { name, shortName: shortNameFor(name), externalId: `demo-${name}` },
      update: {},
    });
    teams.push(team);
  }
  const teamIds = teams.map((t) => t.id);

  const roundDefs = [
    { number: 1, deadlineInDays: 4, status: "OPEN" as const },
    { number: 2, deadlineInDays: 11, status: "SCHEDULED" as const },
    { number: 3, deadlineInDays: 18, status: "SCHEDULED" as const },
  ];

  for (const def of roundDefs) {
    const round = await prisma.round.upsert({
      where: { seasonId_number: { seasonId: season.id, number: def.number } },
      create: {
        seasonId: season.id,
        number: def.number,
        deadline: dayFromNow(def.deadlineInDays),
        status: def.status,
      },
      update: { status: def.status },
    });

    const pairs = pairingsForRound(teamIds, def.number - 1);
    for (const [homeTeamId, awayTeamId] of pairs) {
      const externalId = `demo-r${def.number}-${homeTeamId}-${awayTeamId}`;
      await prisma.match.upsert({
        where: { externalId },
        create: { externalId, roundId: round.id, homeTeamId, awayTeamId, status: "SCHEDULED" },
        update: {},
      });
    }
  }

  await prisma.league.upsert({
    where: { id: "demo-public-league" },
    create: {
      id: "demo-public-league",
      name: "Lega Pubblica Serie A 2025/26",
      type: "PUBLIC",
      seasonId: season.id,
      entryFee: 1.0,
      status: "OPEN",
      startRoundNumber: 1,
    },
    update: {},
  });

  const adminEmail = "admin@vinciopaga.demo";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        passwordHash: await bcrypt.hash("admin1234", 10),
        isSiteAdmin: true,
      },
    });
    console.log(`Utente admin creato: ${adminEmail} / admin1234`);
  }

  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
