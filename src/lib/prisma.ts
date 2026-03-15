import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Vérifier que DATABASE_URL existe
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    throw new Error('DATABASE_URL is required');
  }

  const adapter = new PrismaPg({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
