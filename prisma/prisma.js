import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

// Verificar que prisma se haya inicializado correctamente
if (!prisma) {
  throw new Error('Failed to initialize Prisma Client');
}

export default prisma;
