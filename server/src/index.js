
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { prisma } from './db.js';

const app = express();

const PORT = process.env.PORT || 3000;

// Permitir peticiones desde el frontend Svelte
app.use(cors({
  origin: 'http://localhost:5173'
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
          indicadores: true
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
  

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`API disponible en http://localhost:${PORT}`);
});
