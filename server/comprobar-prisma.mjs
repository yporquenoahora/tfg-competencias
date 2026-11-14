import { prisma } from './src/db.js';

console.log('Modelo Valoracion:', typeof prisma.valoracion);

await prisma.$disconnect();
