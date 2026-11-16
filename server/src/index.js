
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { prisma } from './db.js';

const app = express();

const PORT = process.env.PORT || 3000;

// Permitir peticiones desde el frontend Svelte
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://yporquenoahora.github.io'
  ]
}));

// Interpretar peticiones con contenido JSON
app.use(express.json());

// Endpoint de comprobación del servidor
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API del TFG funcionando'
  });
});



app.get('/api/competencias', async (req, res) => {
  try {
    const competencias = await prisma.competencia.findMany({
      include: {
        fuente: true,
        dimensiones: {
          orderBy: {
            orden: 'asc'
          },
          include: {
            indicadores: {
              orderBy: {
                id: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    res.json(competencias);
  } catch (error) {
    console.error('Error al consultar competencias:', error);

    res.status(500).json({
      error: 'No se pudieron consultar las competencias'
    });
  }
});


app.post('/api/competencias', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body ?? {};

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        error: 'El nombre de la competencia es obligatorio'
      });
    }

    const competencia = await prisma.competencia.create({
      data: {
        nombre: nombre.trim(),
        descripcion:
          typeof descripcion === 'string'
            ? descripcion.trim()
            : null
      }
    });

    res.status(201).json(competencia);
  } catch (error) {
    console.error('Error al crear competencia:', error);
    res.status(500).json({
      error: 'No se pudo crear la competencia'
    });
  }
});



app.get('/api/configuraciones', async (req, res) => {
  try {
    const configuraciones =
      await prisma.configuracionSeguimiento.findMany({
        include: {
          indicadores: {
            include: {
              indicador: true
            }
          }
        },
        orderBy: {
          creadaEn: 'desc'
        }
      });

    res.json(configuraciones);
  } catch (error) {
    console.error('Error al consultar configuraciones:', error);

    res.status(500).json({
      error: 'No se pudieron consultar las configuraciones'
    });
  }
});



app.post('/api/configuraciones', async (req, res) => {
  try {
    const { nombre, descripcion, indicadorIds } = req.body ?? {};

    if (typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        error: 'El nombre de la configuración es obligatorio'
      });
    }

    if (
      !Array.isArray(indicadorIds) ||
      indicadorIds.length === 0 ||
      !indicadorIds.every(id => Number.isInteger(id) && id > 0)
    ) {
      return res.status(400).json({
        error: 'Debes seleccionar al menos un indicador válido'
      });
    }

    const idsUnicos = [...new Set(indicadorIds)];

    const cantidad = await prisma.indicador.count({
      where: { id: { in: idsUnicos } }
    });

    if (cantidad !== idsUnicos.length) {
      return res.status(400).json({
        error: 'Uno o varios indicadores no existen'
      });
    }

    const configuracion = await prisma.configuracionSeguimiento.create({
      data: {
        nombre: nombre.trim(),
        descripcion:
          typeof descripcion === 'string'
            ? descripcion.trim()
            : null,
        indicadores: {
          create: idsUnicos.map(indicadorId => ({
            indicador: {
              connect: { id: indicadorId }
            }
          }))
        }
      },
      include: {
        indicadores: true
      }
    });

    res.status(201).json(configuracion);
  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({
      error: 'No se pudo guardar la configuración'
    });
  }
});


app.get('/api/grupos/:grupoId/estudiantes', async (req, res) => {
  try {
    const grupoId = Number(req.params.grupoId);

    if (!Number.isInteger(grupoId) || grupoId <= 0) {
      return res.status(400).json({
        error: 'Identificador de grupo no válido'
      });
    }

    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: {
        matriculas: {
          include: {
            estudiante: true
          }
        },
        imparticiones: true
      }
    });

    if (!grupo) {
      return res.status(404).json({
        error: 'Grupo no encontrado'
      });
    }

    res.json({
      id: grupo.id,
      nombre: grupo.nombre,
      curso: grupo.curso,
      imparticiones: grupo.imparticiones,
      estudiantes: grupo.matriculas
        .map(matricula => matricula.estudiante)
        .sort((a, b) => a.codigo.localeCompare(b.codigo))
    });
  } catch (error) {
    console.error('Error al consultar estudiantes:', error);
    res.status(500).json({
      error: 'No se pudieron consultar los estudiantes'
    });
  }
});

app.post('/api/valoraciones', async (req, res) => {
  try {
    const {
      estudianteId,
      indicadorId,
      imparticionId,
      nivel,
      observacion,
      evidenciaId
    } = req.body ?? {};

    const ids = [estudianteId, indicadorId, imparticionId];

    if (!ids.every(id => Number.isInteger(id) && id > 0)) {
      return res.status(400).json({
        error: 'Los identificadores deben ser enteros positivos'
      });
    }

    if (!Number.isInteger(nivel) || nivel < 1 || nivel > 4) {
      return res.status(400).json({
        error: 'El nivel debe estar entre 1 y 4'
      });
    }

    if (
      observacion != null &&
      typeof observacion !== 'string'
    ) {
      return res.status(400).json({
        error: 'La observación debe ser texto'
      });
    }

    const [estudiante, indicador, imparticion] = await Promise.all([
      prisma.estudiante.findUnique({
        where: { id: estudianteId }
      }),
      prisma.indicador.findUnique({
        where: { id: indicadorId }
      }),
      prisma.imparticionModulo.findUnique({
        where: { id: imparticionId }
      })
    ]);

    if (!estudiante || !indicador || !imparticion) {
      return res.status(404).json({
        error: 'Estudiante, indicador o impartición inexistente'
      });
    }

    const matricula = await prisma.matricula.findFirst({
      where: {
        estudianteId,
        grupoId: imparticion.grupoId
      }
    });

    if (!matricula) {
      return res.status(400).json({
        error: 'El estudiante no pertenece al grupo de la impartición'
      });
    }


    if (
      evidenciaId != null &&
      (!Number.isInteger(evidenciaId) || evidenciaId <= 0)
    ) {
      return res.status(400).json({
        error: 'El identificador de evidencia debe ser un entero positivo'
      });
    }

    if (evidenciaId != null) {
      const evidencia = await prisma.evidencia.findUnique({
        where: { id: evidenciaId },
        include: {
          actividad: true
        }
      });

      if (!evidencia) {
        return res.status(404).json({
          error: 'La evidencia no existe'
        });
      }

      if (
        evidencia.estudianteId !== estudianteId ||
        evidencia.actividad.imparticionId !== imparticionId
      ) {
        return res.status(400).json({
          error: 'La evidencia no corresponde al estudiante y módulo seleccionados'
        });
      }
    }

    // Buscar la rúbrica asociada al indicador
    const asociacionRubrica = await prisma.rubricaIndicador.findFirst({
      where: {
        indicadorId
      },
      include: {
        rubrica: {
          include: {
            niveles: true
          }
        }
      }
    });

    // Obtener la rúbrica aplicable
    const rubrica = asociacionRubrica?.rubrica ?? null;

    // Obtener el descriptor correspondiente al nivel observado
    const nivelRubrica = rubrica?.niveles.find(
      item => item.valor === nivel
    );

    // Guardar la referencia y el descriptor utilizados
    const rubricaId = rubrica?.id ?? null;
    const descriptorAplicado = nivelRubrica?.descripcion ?? null;
    const valoracion = await prisma.valoracion.create({
      data: {
        estudianteId,
        indicadorId,
        imparticionId,
        nivel,
        rubricaId,
        descriptorAplicado,
        observacion: observacion?.trim() || null,
        evidenciaId: evidenciaId ?? null
      }
    });

    res.status(201).json(valoracion);
  } catch (error) {
    console.error('Error al registrar valoración:', error);
    res.status(500).json({
      error: 'No se pudo registrar la valoración'
    });
  }
});

app.get('/api/estudiantes/:id/valoraciones', async (req, res) => {
  try {
    const estudianteId = Number(req.params.id);

    if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
      return res.status(400).json({
        error: 'Identificador de estudiante no válido'
      });
    }

    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudianteId }
    });

    if (!estudiante) {
      return res.status(404).json({
        error: 'Estudiante no encontrado'
      });
    }

    const valoraciones = await prisma.valoracion.findMany({
      where: { estudianteId },
      include: {
        indicador: true,
        imparticion: true
      },
      orderBy: [
        { fecha: 'desc' },
        { id: 'desc' }
      ]
    });

    res.json({
      estudiante,
      valoraciones
    });
  } catch (error) {
    console.error('Error al consultar valoraciones:', error);
    res.status(500).json({
      error: 'No se pudo consultar el historial'
    });
  }
});

app.get('/api/imparticiones/:id/seguimiento', async (req, res) => {
  try {
    const imparticionId = Number(req.params.id);

    if (!Number.isInteger(imparticionId) || imparticionId <= 0) {
      return res.status(400).json({
        error: 'Identificador de impartición no válido'
      });
    }

    const imparticion = await prisma.imparticionModulo.findUnique({
      where: { id: imparticionId },
      include: {
        grupo: {
          include: {
            matriculas: {
              include: { estudiante: true }
            }
          }
        }
      }
    });

    if (!imparticion) {
      return res.status(404).json({
        error: 'Impartición no encontrada'
      });
    }

    const valoraciones = await prisma.valoracion.findMany({
      where: { imparticionId },
      include: {
        estudiante: true,
        indicador: true
      },
      orderBy: [
        { fecha: 'desc' },
        { id: 'desc' }
      ]
    });

    const estudiantes = imparticion.grupo.matriculas.map(
      matricula => matricula.estudiante
    );

    // Agrupar observaciones por estudiante e indicador.
    const grupos = new Map();

    for (const valoracion of valoraciones) {
      const clave = `${valoracion.estudianteId}-${valoracion.indicadorId}`;

      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }

      grupos.get(clave).push(valoracion);
    }


    const dificultades = [];
    const atencionesIniciales = [];

    for (const registros of grupos.values()) {
      if (registros.length === 0) continue;

      // Ya están ordenados del más reciente al más antiguo.
      const [ultima, anterior] = registros;

      if (ultima.nivel > 2) continue;

      const aviso = {
        estudianteId: ultima.estudianteId,
        estudiante: ultima.estudiante.nombre,
        indicadorId: ultima.indicadorId,
        indicador: ultima.indicador.descripcion,
        nivelActual: ultima.nivel,
        nivelAnterior: anterior?.nivel ?? null,
        fechaUltimaValoracion: ultima.fecha,
        numeroValoraciones: registros.length
      };

      if (anterior && anterior.nivel <= 2) {
        dificultades.push({
          ...aviso,
          estado: 'revision_prioritaria'
        });
      } else {
        atencionesIniciales.push({
          ...aviso,
          estado: 'atencion_inicial'
        });
      }
    }

    const estudiantesPrioritarios = new Set(
      dificultades.map(item => item.estudianteId)
    );

    const estudiantesAtencion = new Set(
      atencionesIniciales.map(item => item.estudianteId)
    );

    const estudiantesObservados = new Set(
      valoraciones.map(item => item.estudianteId)
    );

    const indicadoresPrioritarios = new Set(
      dificultades.map(item => item.indicadorId)
    );



    res.json({
      imparticion: {
        id: imparticion.id,
        nombreModulo: imparticion.nombreModulo,
        curso: imparticion.curso,
        grupo: imparticion.grupo.nombre
      },

      resumen: {
        totalEstudiantes: estudiantes.length,
        totalValoraciones: valoraciones.length,

        estudiantesObservados: estudiantesObservados.size,
        estudiantesSinObservaciones:
          estudiantes.length - estudiantesObservados.size,

        estudiantesAtencionInicial: estudiantesAtencion.size,
        estudiantesRevisionPrioritaria: estudiantesPrioritarios.size,

        totalAtencionesIniciales: atencionesIniciales.length,
        totalAlertas: dificultades.length,

        // Compatibilidad con el dashboard anterior.
        estudiantesConDificultades: estudiantesPrioritarios.size,
        indicadoresConDificultades: indicadoresPrioritarios.size
      },

      atencionesIniciales,
      dificultades
    });

  } catch (error) {
    console.error('Error al consultar seguimiento:', error);

    res.status(500).json({
      error: 'No se pudo consultar el seguimiento'
    });
  }
});


app.post('/api/planes-refuerzo', async (req, res) => {
  try {
    const {
      estudianteId,
      indicadorId,
      imparticionId,
      objetivo,
      descripcion,
      fechaRevision
    } = req.body ?? {};

    // 1. Validar identificadores
    const ids = [estudianteId, indicadorId, imparticionId];

    if (!ids.every(id => Number.isInteger(id) && id > 0)) {
      return res.status(400).json({
        error: 'Los identificadores deben ser enteros positivos'
      });
    }

    // 2. Validar campos obligatorios
    if (
      typeof objetivo !== 'string' ||
      !objetivo.trim() ||
      typeof descripcion !== 'string' ||
      !descripcion.trim()
    ) {
      return res.status(400).json({
        error: 'El objetivo y la descripción son obligatorios'
      });
    }

    // 3. Validar fecha de revisión
    let fechaRevisionDate = null;

    if (fechaRevision != null && fechaRevision !== '') {
      if (
        typeof fechaRevision !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fechaRevision)
      ) {
        return res.status(400).json({
          error: 'La fecha debe tener formato AAAA-MM-DD'
        });
      }

      fechaRevisionDate = new Date(`${fechaRevision}T12:00:00.000Z`);

      if (
        Number.isNaN(fechaRevisionDate.getTime()) ||
        fechaRevisionDate.toISOString().slice(0, 10) !== fechaRevision
      ) {
        return res.status(400).json({
          error: 'Fecha de revisión no válida'
        });
      }
    }

    // 4. Comprobar registros relacionados
    const [estudiante, indicador, imparticion] = await Promise.all([
      prisma.estudiante.findUnique({
        where: { id: estudianteId }
      }),
      prisma.indicador.findUnique({
        where: { id: indicadorId }
      }),
      prisma.imparticionModulo.findUnique({
        where: { id: imparticionId }
      })
    ]);

    if (!estudiante || !indicador || !imparticion) {
      return res.status(404).json({
        error: 'Estudiante, indicador o impartición inexistente'
      });
    }

    // 5. Comprobar pertenencia al grupo
    const matricula = await prisma.matricula.findFirst({
      where: {
        estudianteId,
        grupoId: imparticion.grupoId
      }
    });

    if (!matricula) {
      return res.status(400).json({
        error: 'El estudiante no pertenece al grupo de la impartición'
      });
    }

    // 6. Crear plan
    const plan = await prisma.planRefuerzo.create({
      data: {
        estudianteId,
        indicadorId,
        imparticionId,
        objetivo: objetivo.trim(),
        descripcion: descripcion.trim(),
        fechaRevision: fechaRevisionDate,
        estado: 'pendiente'
      },
      include: {
        estudiante: true,
        indicador: true,
        imparticion: true
      }
    });

    res.status(201).json(plan);

  } catch (error) {
    console.error('Error al crear plan de refuerzo:', error);

    res.status(500).json({
      error: 'No se pudo crear el plan de refuerzo'
    });
  }
});



app.get('/api/estudiantes/:id/planes-refuerzo', async (req, res) => {
  try {
    const estudianteId = Number(req.params.id);

    if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
      return res.status(400).json({
        error: 'Identificador de estudiante no válido'
      });
    }

    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudianteId }
    });

    if (!estudiante) {
      return res.status(404).json({
        error: 'Estudiante no encontrado'
      });
    }

    const planes = await prisma.planRefuerzo.findMany({
      where: { estudianteId },
      include: {
        indicador: true,
        imparticion: true
      },
      orderBy: [
        { creadoEn: 'desc' },
        { id: 'desc' }
      ]
    });

    res.json({
      estudiante: {
        id: estudiante.id,
        codigo: estudiante.codigo,
        nombre: estudiante.nombre
      },
      planes
    });

  } catch (error) {
    console.error('Error al consultar planes de refuerzo:', error);

    res.status(500).json({
      error: 'No se pudieron consultar los planes de refuerzo'
    });
  }
});

app.get('/api/rubricas', async (req, res) => {
  try {
    const rubricas = await prisma.rubrica.findMany({
      include: {
        niveles: {
          orderBy: { valor: 'asc' }
        },
        indicadores: {
          include: {
            indicador: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    res.json(rubricas);
  } catch (error) {
    console.error('Error al consultar rúbricas:', error);
    res.status(500).json({
      error: 'No se pudieron consultar las rúbricas'
    });
  }
});


app.post('/api/rubricas', async (req, res) => {
  try {
    const { nombre, descripcion, niveles, indicadorIds = [] } = req.body;

    if (
      typeof nombre !== 'string' ||
      !nombre.trim() ||
      !Array.isArray(niveles) ||
      niveles.length === 0 ||
      !Array.isArray(indicadorIds)
    ) {
      return res.status(400).json({
        error: 'Nombre, niveles e indicadorIds deben tener un formato válido'
      });
    }

    if (
      niveles.some(n =>
        !Number.isInteger(n.valor) ||
        n.valor < 1 ||
        typeof n.descripcion !== 'string' ||
        !n.descripcion.trim()
      ) ||
      new Set(niveles.map(n => n.valor)).size !== niveles.length ||
      indicadorIds.some(id => !Number.isInteger(id) || id < 1) ||
      new Set(indicadorIds).size !== indicadorIds.length
    ) {
      return res.status(400).json({
        error: 'Niveles o identificadores duplicados o inválidos'
      });
    }

    const rubrica = await prisma.rubrica.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        niveles: {
          create: niveles.map(n => ({
            valor: n.valor,
            descripcion: n.descripcion.trim()
          }))
        },
        indicadores: {
          create: indicadorIds.map(indicadorId => ({
            indicador: {
              connect: { id: indicadorId }
            }
          }))
        }
      },
      include: {
        niveles: { orderBy: { valor: 'asc' } },
        indicadores: { include: { indicador: true } }
      }
    });

    res.status(201).json(rubrica);
  } catch (error) {
    console.error('Error al crear rúbrica:', error);

    res.status(500).json({
      error: 'No se pudo crear la rúbrica'
    });
  }
});

app.post('/api/rubricas/:id/indicadores', async (req, res) => {
  try {
    const rubricaId = Number(req.params.id);
    const { indicadorId } = req.body ?? {};

    if (
      !Number.isInteger(rubricaId) ||
      rubricaId < 1 ||
      !Number.isInteger(indicadorId) ||
      indicadorId < 1
    ) {
      return res.status(400).json({
        error: 'Identificadores inválidos'
      });
    }

    const [rubrica, indicador] = await Promise.all([
      prisma.rubrica.findUnique({ where: { id: rubricaId } }),
      prisma.indicador.findUnique({ where: { id: indicadorId } })
    ]);

    if (!rubrica || !indicador) {
      return res.status(404).json({
        error: 'Rúbrica o indicador inexistente'
      });
    }

    const asociacion = await prisma.rubricaIndicador.upsert({
      where: {
        rubricaId_indicadorId: { rubricaId, indicadorId }
      },
      update: {},
      create: { rubricaId, indicadorId }
    });

    res.status(200).json(asociacion);
  } catch (error) {
    console.error('Error al asociar indicador:', error);
    res.status(500).json({
      error: 'No se pudo asociar el indicador'
    });
  }
});


app.post('/api/actividades', async (req, res) => {
  try {
    const {
      imparticionId,
      titulo,
      descripcion,
      fechaEntrega
    } = req.body ?? {};

    if (!Number.isInteger(imparticionId) || imparticionId <= 0) {
      return res.status(400).json({
        error: 'La impartición debe ser un entero positivo'
      });
    }

    if (typeof titulo !== 'string' || !titulo.trim()) {
      return res.status(400).json({
        error: 'El título de la actividad es obligatorio'
      });
    }

    if (descripcion != null && typeof descripcion !== 'string') {
      return res.status(400).json({
        error: 'La descripción debe ser texto'
      });
    }

    let fechaEntregaValidada = null;

    if (fechaEntrega != null) {
      if (
        typeof fechaEntrega !== 'string' ||
        !fechaEntrega.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega)
      ) {
        return res.status(400).json({
          error: 'La fecha debe tener formato YYYY-MM-DD'
        });
      }

      fechaEntregaValidada = new Date(`${fechaEntrega}T00:00:00.000Z`);

      if (
        Number.isNaN(fechaEntregaValidada.getTime()) ||
        fechaEntregaValidada.toISOString().slice(0, 10) !== fechaEntrega
      ) {
        return res.status(400).json({
          error: 'La fecha de entrega no es válida'
        });
      }
    }

    const imparticion = await prisma.imparticionModulo.findUnique({
      where: { id: imparticionId }
    });

    if (!imparticion) {
      return res.status(404).json({
        error: 'La impartición no existe'
      });
    }

    const actividad = await prisma.actividad.create({
      data: {
        imparticionId,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        fechaEntrega: fechaEntregaValidada
      }
    });

    return res.status(201).json(actividad);

  } catch (error) {
    console.error('Error al crear actividad:', error);

    return res.status(500).json({
      error: 'No se pudo crear la actividad'
    });
  }
});


app.post('/api/evidencias', async (req, res) => {
  try {
    const {
      actividadId,
      estudianteId,
      descripcion,
      referencia
    } = req.body ?? {};

    if (
      !Number.isInteger(actividadId) || actividadId <= 0 ||
      !Number.isInteger(estudianteId) || estudianteId <= 0
    ) {
      return res.status(400).json({
        error: 'Los identificadores deben ser enteros positivos'
      });
    }

    if (typeof descripcion !== 'string' || !descripcion.trim()) {
      return res.status(400).json({
        error: 'La descripción de la evidencia es obligatoria'
      });
    }

    if (referencia != null && typeof referencia !== 'string') {
      return res.status(400).json({
        error: 'La referencia debe ser texto'
      });
    }

    const [actividad, estudiante] = await Promise.all([
      prisma.actividad.findUnique({
        where: { id: actividadId },
        include: { imparticion: true }
      }),
      prisma.estudiante.findUnique({
        where: { id: estudianteId }
      })
    ]);

    if (!actividad || !estudiante) {
      return res.status(404).json({
        error: 'La actividad o el estudiante no existe'
      });
    }

    const matricula = await prisma.matricula.findFirst({
      where: {
        estudianteId,
        grupoId: actividad.imparticion.grupoId
      }
    });

    if (!matricula) {
      return res.status(400).json({
        error: 'El estudiante no está matriculado en el grupo de la actividad'
      });
    }

    const evidencia = await prisma.evidencia.create({
      data: {
        actividadId,
        estudianteId,
        descripcion: descripcion.trim(),
        referencia: referencia?.trim() || null
      }
    });

    return res.status(201).json(evidencia);

  } catch (error) {
    console.error('Error al registrar evidencia:', error);

    return res.status(500).json({
      error: 'No se pudo registrar la evidencia'
    });
  }
});


app.get('/api/valoraciones/:id/trazabilidad', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'El identificador debe ser un entero positivo'
      });
    }

    const valoracion = await prisma.valoracion.findUnique({
      where: { id },
      include: {
        evidencia: {
          include: {
            actividad: true
          }
        }
      }
    });

    if (!valoracion) {
      return res.status(404).json({
        error: 'La valoración no existe'
      });
    }

    return res.json({
      id: valoracion.id,
      estudianteId: valoracion.estudianteId,
      indicadorId: valoracion.indicadorId,
      imparticionId: valoracion.imparticionId,
      nivel: valoracion.nivel,
      observacion: valoracion.observacion,
      rubricaId: valoracion.rubricaId,
      descriptorAplicado: valoracion.descriptorAplicado,
      evidencia: valoracion.evidencia
        ? {
            id: valoracion.evidencia.id,
            descripcion: valoracion.evidencia.descripcion,
            referencia: valoracion.evidencia.referencia,
            fechaRegistro: valoracion.evidencia.fechaRegistro,
            actividad: {
              id: valoracion.evidencia.actividad.id,
              titulo: valoracion.evidencia.actividad.titulo,
              descripcion: valoracion.evidencia.actividad.descripcion,
              fechaEntrega: valoracion.evidencia.actividad.fechaEntrega
            }
          }
        : null
    });

  } catch (error) {
    console.error('Error al consultar trazabilidad:', error);

    return res.status(500).json({
      error: 'No se pudo consultar la trazabilidad'
    });
  }
});


app.get('/api/actividades', async (req, res) => {
  try {
    const imparticionId = Number(req.query.imparticionId);

    if (!Number.isSafeInteger(imparticionId) || imparticionId <= 0) {
      return res.status(400).json({
        error: 'Se requiere un imparticionId válido'
      });
    }

    const actividades = await prisma.actividad.findMany({
      where: { imparticionId },
      orderBy: { fechaPropuesta: 'desc' }
    });

    return res.json(actividades);
  } catch (error) {
    console.error('Error al consultar actividades:', error);
    return res.status(500).json({
      error: 'No se pudieron consultar las actividades'
    });
  }
});

app.get('/api/evidencias', async (req, res) => {
  try {
    const actividadId = Number(req.query.actividadId);
    const estudianteId = Number(req.query.estudianteId);

    if (
      !Number.isSafeInteger(actividadId) || actividadId <= 0 ||
      !Number.isSafeInteger(estudianteId) || estudianteId <= 0
    ) {
      return res.status(400).json({
        error: 'Se requieren actividadId y estudianteId válidos'
      });
    }

    const actividad = await prisma.actividad.findUnique({
      where: { id: actividadId },
      include: { imparticion: true }
    });

    if (!actividad) {
      return res.status(404).json({
        error: 'La actividad no existe'
      });
    }

    const matricula = await prisma.matricula.findFirst({
      where: {
        estudianteId,
        grupoId: actividad.imparticion.grupoId
      }
    });

    if (!matricula) {
      return res.status(400).json({
        error: 'El estudiante no pertenece al grupo de la actividad'
      });
    }

    const evidencias = await prisma.evidencia.findMany({
      where: { actividadId, estudianteId },
      orderBy: { fechaRegistro: 'desc' }
    });

    return res.json(evidencias);
  } catch (error) {
    console.error('Error al consultar evidencias:', error);
    return res.status(500).json({
      error: 'No se pudieron consultar las evidencias'
    });
  }
});


// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`API disponible en http://localhost:${PORT}`);
});
