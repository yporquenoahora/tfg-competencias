import 'dotenv/config';
import { prisma } from '../src/db.js';

// Catálogo propuesto para el prototipo del TFE.
// No constituye un marco oficial ni un instrumento validado.

const catalogo = [
  {
    nombre: 'Organización del trabajo (DEMO)',
    descripcion: 'Capacidad para planificar, organizar y supervisar las tareas.',
    dimensiones: [
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
    ]
  },
  {
    nombre: 'Autonomía en el aprendizaje',
    descripcion: 'Capacidad para tomar decisiones y gestionar el propio aprendizaje.',
    dimensiones: [
      {
        nombre: 'Iniciativa',
        indicadores: [
          'Comienza las tareas sin necesitar instrucciones adicionales constantes.',
          'Identifica qué conocimientos necesita para completar una actividad.'
        ]
      },
      {
        nombre: 'Búsqueda de recursos',
        indicadores: [
          'Consulta documentación y recursos adecuados antes de solicitar ayuda.',
          'Aplica los recursos consultados para avanzar en su trabajo.'
        ]
      }
    ]
  },
  {
    nombre: 'Resolución de problemas',
    descripcion: 'Capacidad para analizar problemas y desarrollar soluciones.',
    dimensiones: [
      {
        nombre: 'Análisis del problema',
        indicadores: [
          'Identifica los elementos relevantes de un problema antes de intervenir.',
          'Diferencia los síntomas de las posibles causas de un error.'
        ]
      },
      {
        nombre: 'Aplicación de soluciones',
        indicadores: [
          'Propone una solución coherente con el problema identificado.',
          'Comprueba los resultados y modifica su estrategia cuando es necesario.'
        ]
      }
    ]
  },
  {
    nombre: 'Comunicación',
    descripcion: 'Capacidad para transmitir y comprender información en contextos de aprendizaje y trabajo.',
    dimensiones: [
      {
        nombre: 'Expresión',
        indicadores: [
          'Explica de forma comprensible los procedimientos que ha seguido.',
          'Adapta sus explicaciones al contexto y a las personas destinatarias.'
        ]
      },
      {
        nombre: 'Comprensión',
        indicadores: [
          'Identifica la información relevante de las instrucciones recibidas.',
          'Formula preguntas pertinentes cuando necesita aclaraciones.'
        ]
      }
    ]
  },
  {
    nombre: 'Trabajo en equipo',
    descripcion: 'Capacidad para colaborar y asumir responsabilidades compartidas.',
    dimensiones: [
      {
        nombre: 'Colaboración',
        indicadores: [
          'Comparte información útil con los integrantes del equipo.',
          'Escucha y considera las aportaciones de otras personas.'
        ]
      },
      {
        nombre: 'Responsabilidad compartida',
        indicadores: [
          'Cumple los compromisos adquiridos dentro del equipo.',
          'Participa en la resolución de dificultades colectivas.'
        ]
      }
    ]
  },
  {
    nombre: 'Pensamiento crítico',
    descripcion: 'Capacidad para analizar información y justificar decisiones.',
    dimensiones: [
      {
        nombre: 'Análisis de información',
        indicadores: [
          'Contrasta la información antes de utilizarla en una actividad.',
          'Identifica inconsistencias o limitaciones en la información disponible.'
        ]
      },
      {
        nombre: 'Argumentación',
        indicadores: [
          'Justifica sus decisiones utilizando razones o evidencias.',
          'Reconsidera sus conclusiones cuando aparecen nuevos datos.'
        ]
      }
    ]
  },
  {
    nombre: 'Competencia digital',
    descripcion: 'Capacidad para utilizar herramientas y recursos digitales de forma eficaz y responsable.',
    dimensiones: [
      {
        nombre: 'Uso de herramientas',
        indicadores: [
          'Selecciona herramientas digitales adecuadas para la tarea.',
          'Utiliza las funcionalidades necesarias de las herramientas seleccionadas.'
        ]
      },
      {
        nombre: 'Gestión de información',
        indicadores: [
          'Organiza archivos y recursos digitales de forma que puedan recuperarse.',
          'Aplica medidas básicas de protección de datos e información.'
        ]
      }
    ]
  },
  {
    nombre: 'Autorregulación y perseverancia',
    descripcion: 'Capacidad para gestionar dificultades y mejorar el propio desempeño.',
    dimensiones: [
      {
        nombre: 'Gestión de dificultades',
        indicadores: [
          'Mantiene la implicación en la tarea cuando aparecen dificultades.',
          'Solicita apoyo específico después de identificar qué le impide avanzar.'
        ]
      },
      {
        nombre: 'Mejora continua',
        indicadores: [
          'Utiliza la retroalimentación recibida para revisar su trabajo.',
          'Identifica aspectos concretos que puede mejorar en próximas actividades.'
        ]
      }
    ]
  }
];

async function ejecutar() {
  const resultado = await prisma.$transaction(
    async (tx) => {
      const resumen = {
        competenciasCreadas: 0,
        dimensionesCreadas: 0,
        indicadoresCreados: 0,
        indicadoresExistentes: 0
      };

      // Identificar la procedencia de este catálogo.
      // No atribuir estos indicadores a un marco oficial.
      let fuente = await tx.fuenteCompetencial.findFirst({
        where: {
          nombre: 'Catálogo transversal propuesto para el TFE'
        }
      });

      if (!fuente) {
        fuente = await tx.fuenteCompetencial.create({
          data: {
            nombre: 'Catálogo transversal propuesto para el TFE',
            organismo: 'Elaboración propia',
            descripcion:
              'Propuesta inicial de indicadores observables para el prototipo. Pendiente de fundamentación bibliográfica y evaluación docente.'
          }
        });
      }

      for (const item of catalogo) {
        let competencia = await tx.competencia.findFirst({
          where: { nombre: item.nombre },
          orderBy: { id: 'asc' }
        });

        if (!competencia) {
          competencia = await tx.competencia.create({
            data: {
              nombre: item.nombre,
              descripcion: item.descripcion,
              fuenteId: fuente.id
            }
          });

          resumen.competenciasCreadas++;
        }

        // Conservar la fuente y descripción de las
        // competencias que ya existían.

        for (let indice = 0; indice < item.dimensiones.length; indice++) {
          const datoDimension = item.dimensiones[indice];

          const dimension = await tx.dimension.upsert({
            where: {
              competenciaId_nombre: {
                competenciaId: competencia.id,
                nombre: datoDimension.nombre
              }
            },
            update: {},
            create: {
              nombre: datoDimension.nombre,
              orden: indice + 1,
              competenciaId: competencia.id
            }
          });

          // Contar solo las dimensiones creadas.
          // La comprobación es previa al upsert en
          // la siguiente ejecución; los recuentos
          // definitivos se consultarán en SQL.

          for (const descripcion of datoDimension.indicadores) {
            const existente = await tx.indicador.findFirst({
              where: {
                competenciaId: competencia.id,
                descripcion
              }
            });

            if (existente) {
              resumen.indicadoresExistentes++;

              // No modificar asociaciones históricas.
              // Si carece de dimensión, completar la relación.
              if (existente.dimensionId === null) {
                await tx.indicador.update({
                  where: { id: existente.id },
                  data: { dimensionId: dimension.id }
                });
              }

              continue;
            }

            await tx.indicador.create({
              data: {
                descripcion,
                competenciaId: competencia.id,
                dimensionId: dimension.id
              }
            });

            resumen.indicadoresCreados++;
          }
        }
      }

      return resumen;
    },
    {
      maxWait: 10000,
      timeout: 60000
    }
  );

  console.log('Carga del catálogo completada.');
  console.table(resultado);
}

ejecutar()
  .catch((error) => {
    console.error('Error al cargar el catálogo:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
