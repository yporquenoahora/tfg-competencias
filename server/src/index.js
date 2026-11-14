
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
      observacion
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

    const valoracion = await prisma.valoracion.create({
      data: {
        estudianteId,
        indicadorId,
        imparticionId,
        nivel,
        observacion: observacion?.trim() || null
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


// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`API disponible en http://localhost:${PORT}`);
});
