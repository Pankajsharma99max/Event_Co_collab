import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    return;
  }

  const adminEmail = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("No ADMIN_EMAILS or ADMIN_PASSWORD set in env. Skipping admin seeding.");
    return;
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  try {
    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: "ADMIN",
        passwordHash,
      },
      create: {
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`SUCCESS: Admin user ${user.email} seeded successfully.`);
  } catch (error) {
    console.error("Failed to seed admin:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
