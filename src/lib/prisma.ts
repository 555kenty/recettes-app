import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // En production (Vercel → Supabase) : SSL requis + limite connexions serverless
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  return new PrismaClient({
    adapter,
    log: isProduction ? ['error'] : ['error', 'warn'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
