
import { prisma } from './src/db.js';

async function main() {
  try {
    const total = await prisma.competencia.count();

    console.log('Conexión con PostgreSQL correcta');
    console.log('Número de competencias:', total);
  } catch (error) {
    console.error('Error al conectar con PostgreSQL:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
