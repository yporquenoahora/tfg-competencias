
import 'dotenv/config';
import { prisma } from '../src/db.js';

const NOMBRE_FUENTE = 'Datos sintéticos TFE';
const NOMBRE_COMPETENCIA = 'Organización del trabajo (DEMO)';

const dimensiones = [
  {
    nombre: 'Planificación',
    indicadores: [
      'Identifica las tareas necesarias antes de comenzar.',
      'Establece un orden de ejecución coherente.'
    ]
  },
  {
    nombre: 'Seguimiento',
    indicadores: [
      'Comprueba el progreso de la actividad.',
      'Identifica tareas pendientes y ajusta su planificación.'
    ]
  }
];

async function main() {
  const fuenteExistente = await prisma.fuenteCompetencial.findFirst({
    where: { nombre: NOMBRE_FUENTE }
  });

  const fuente = fuenteExistente ?? await prisma.fuenteCompetencial.create({
    data: {
      nombre: NOMBRE_FUENTE,
      organismo: 'Datos de demostración',
      descripcion: 'Catálogo ficticio para pruebas del TFE'
    }
  });

  const competenciaExistente = await prisma.competencia.findFirst({
    where: {
      nombre: NOMBRE_COMPETENCIA,
      fuenteId: fuente.id
    }
  });

  const competencia = competenciaExistente ?? await prisma.competencia.create({
    data: {
      nombre: NOMBRE_COMPETENCIA,
      descripcion: 'Competencia ficticia para validar la estructura del catálogo',
      fuenteId: fuente.id
    }
  });

  for (const [indice, item] of dimensiones.entries()) {
    const dimension = await prisma.dimension.upsert({
      where: {
        competenciaId_nombre: {
          competenciaId: competencia.id,
          nombre: item.nombre
        }
      },
      update: {},
      create: {
        competenciaId: competencia.id,
        nombre: item.nombre,
        orden: indice + 1
      }
    });

    for (const descripcion of item.indicadores) {
      // Evita duplicados dentro de esta competencia de prueba.
      const existente = await prisma.indicador.findFirst({
        where: {
          competenciaId: competencia.id,
          dimensionId: dimension.id,
          descripcion
        }
      });

      if (!existente) {
        await prisma.indicador.create({
          data: {
            descripcion,
            competenciaId: competencia.id,
            dimensionId: dimension.id
          }
        });
      }
    }
  }

  console.log('Datos sintéticos cargados correctamente.');
  console.log(`Competencia: ${competencia.nombre}`);
  console.log('Dimensiones previstas: 2');
  console.log('Indicadores previstos: 4');
}

main()
  .catch(error => {
    console.error('Error al cargar los datos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
