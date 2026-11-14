
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
  
const nombreGrupo = '1º DAW A';
const cursoAcademico = '2026/2027';

// Crear o recuperar el grupo de demostración.
let grupo = await prisma.grupo.findFirst({
  where: {
    nombre: nombreGrupo,
    curso: cursoAcademico
  }
});

if (!grupo) {
  grupo = await prisma.grupo.create({
    data: {
      nombre: nombreGrupo,
      curso: cursoAcademico,
      descripcion: 'Grupo sintético para pruebas del TFE'
    }
  });
}

// Crear la impartición del módulo si todavía no existe.
const imparticionExistente = await prisma.imparticionModulo.findFirst({
  where: {
    grupoId: grupo.id,
    nombreModulo: 'Lenguajes de Marcas',
    curso: cursoAcademico
  }
});

if (!imparticionExistente) {
  await prisma.imparticionModulo.create({
    data: {
      nombreModulo: 'Lenguajes de Marcas',
      curso: cursoAcademico,
      grupoId: grupo.id
    }
  });
}

// Crear 20 estudiantes ficticios y matricularlos.
for (let numero = 1; numero <= 20; numero++) {
  const codigo = `DEMO-${String(numero).padStart(3, '0')}`;

  const estudiante = await prisma.estudiante.upsert({
    where: { codigo },
    update: {},
    create: {
      codigo,
      nombre: `Estudiante ${String(numero).padStart(2, '0')}`
    }
  });

  await prisma.matricula.upsert({
    where: {
      estudianteId_grupoId: {
        estudianteId: estudiante.id,
        grupoId: grupo.id
      }
    },
    update: {},
    create: {
      estudianteId: estudiante.id,
      grupoId: grupo.id
    }
  });
}

console.log('Grupo de demostración y 20 estudiantes preparados');


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
