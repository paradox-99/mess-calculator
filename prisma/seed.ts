/**
 * Development seed: one group with a leader and two members, and a handful of
 * meal entries so the dashboard, daily details, and audit log all have
 * something to show.
 *
 * Run with: npm run db:seed
 * Every seeded account uses the password `messpass123`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient, Prisma } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const PASSWORD = "messpass123";
const SEED_INVITE_CODE = "seedmess";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const people = [
    {
      username: "nayeem",
      email: "nayeem@example.com",
      firstName: "Nayeem",
      lastName: "R",
      isSuperuser: true,
    },
    { username: "jhon", email: "jhon@example.com", firstName: "Jhon", lastName: "D" },
    { username: "rafi", email: "rafi@example.com", firstName: "Rafi", lastName: "H" },
  ];

  const users = [];
  for (const person of people) {
    users.push(
      await prisma.user.upsert({
        where: { username: person.username },
        create: { ...person, passwordHash },
        update: { isSuperuser: person.isSuperuser ?? false },
      }),
    );
  }
  const [leader, ...members] = users;

  // A fixed invite code keeps the seed idempotent — re-running it updates the
  // same group instead of creating another one. Real groups get a random code.
  const group = await prisma.group.upsert({
    where: { inviteCode: SEED_INVITE_CODE },
    create: {
      name: "Flat 6B",
      inviteCode: SEED_INVITE_CODE,
      createdById: leader.id,
    },
    update: {},
  });

  for (const [index, user] of users.entries()) {
    await prisma.groupMembership.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      create: {
        groupId: group.id,
        userId: user.id,
        role: index === 0 ? "LEADER" : "MEMBER",
      },
      update: {},
    });
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const monthCycle = await prisma.monthCycle.upsert({
    where: { groupId_year_month: { groupId: group.id, year, month } },
    create: { groupId: group.id, year, month },
    update: {},
  });

  // Five days of meals: everyone eats both sittings, the leader pays.
  for (let day = 1; day <= 5; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    for (const user of users) {
      await prisma.dailyEntry.upsert({
        where: {
          monthCycleId_userId_date: { monthCycleId: monthCycle.id, userId: user.id, date },
        },
        create: {
          monthCycleId: monthCycle.id,
          userId: user.id,
          date,
          lunch: new Prisma.Decimal(1),
          dinner: new Prisma.Decimal(1),
          cost: user.id === leader.id ? new Prisma.Decimal(210) : new Prisma.Decimal(0),
        },
        update: {},
      });
    }
  }

  // Recompute the cached totals the same way the app does.
  const entries = await prisma.dailyEntry.findMany({
    where: { monthCycleId: monthCycle.id },
    select: { lunch: true, dinner: true, cost: true },
  });
  let totalCost = new Prisma.Decimal(0);
  let totalMeals = new Prisma.Decimal(0);
  for (const entry of entries) {
    totalCost = totalCost.plus(entry.cost);
    totalMeals = totalMeals.plus(entry.lunch).plus(entry.dinner);
  }
  await prisma.monthCycle.update({
    where: { id: monthCycle.id },
    data: {
      cachedTotalCost: totalCost,
      cachedTotalMeals: totalMeals,
      cachedMealRate: totalMeals.isZero() ? totalMeals : totalCost.dividedBy(totalMeals),
    },
  });

  console.log(`Seeded group "${group.name}" (invite code ${group.inviteCode})`);
  console.log(`  leader:  ${leader.username}`);
  console.log(`  members: ${members.map((m) => m.username).join(", ")}`);
  console.log(`  password for every account: ${PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
