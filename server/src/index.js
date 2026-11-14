
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

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`API disponible en http://localhost:${PORT}`);
});
