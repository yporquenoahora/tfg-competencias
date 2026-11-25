import { agruparPerfiles, compararQuincenas, intervalo, resumirIndicadores } from './periodos.js';

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { prisma } from './db.js';
import { catalogoCurricular } from './catalogoCurricular.js';

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
    const imparticionId =
      req.query.imparticionId !== undefined
        ? Number(req.query.imparticionId)
        : null;

    if (
      imparticionId !== null &&
      (!Number.isInteger(imparticionId) || imparticionId <= 0)
    ) {
      return res.status(400).json({
        error: 'Identificador de impartición no válido'
      });
    }

    const configuraciones =
      await prisma.configuracionSeguimiento.findMany({
        where: imparticionId !== null
          ? { imparticionId }
          : {},
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
    const { nombre, descripcion, indicadorIds, imparticionId } = req.body ?? {};

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

    if (
      imparticionId !== undefined &&
      imparticionId !== null &&
      (!Number.isInteger(imparticionId) || imparticionId <= 0)
    ) {
      return res.status(400).json({
        error: 'Identificador de impartición no válido'
      });
    }

    if (imparticionId != null) {
      const imparticion = await prisma.imparticionModulo.findUnique({
        where: { id: imparticionId }
      });

      if (!imparticion) {
        return res.status(404).json({
          error: 'La impartición seleccionada no existe'
        });
      }
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
        },
        ...(imparticionId != null ? { imparticionId } : {}),
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


const seleccionarGrupo = { id: true, nombre: true, curso: true, ciclo: true };
const ciclosCatalogo = new Set([...catalogoCurricular.values()]
  .flatMap((modulo) => modulo.ofertas.map((oferta) => oferta.ciclo))
  .filter((ciclo) => !ciclo.startsWith('Optativas de Madrid')));

function moduloCompatible(modulo, ciclo) {
  return modulo.ofertas.some((oferta) =>
    oferta.ciclo === ciclo ||
    (oferta.ciclo === 'Optativas de Madrid · Informática y Comunicaciones' &&
      ['Desarrollo de Aplicaciones Web', 'Desarrollo de Aplicaciones Multiplataforma',
        'Administración de Sistemas Informáticos en Red', 'Sistemas Microinformáticos y Redes'].includes(ciclo)),
  );
}

app.get('/api/grupos', async (req, res) => {
  try {
    res.json(await prisma.grupo.findMany({ select: seleccionarGrupo, orderBy: { id: 'asc' } }));
  } catch (error) {
    console.error('Error al consultar grupos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los grupos' });
  }
});

app.post('/api/grupos', async (req, res) => {
  const { nombre, curso, ciclo } = req.body ?? {};
  if (typeof nombre !== 'string' || !nombre.trim() ||
      typeof curso !== 'string' || !/^\d{4}\/\d{4}$/.test(curso) ||
      !ciclosCatalogo.has(ciclo)) {
    return res.status(400).json({ error: 'Indica el nombre, el ciclo y el curso académico (AAAA/AAAA)' });
  }
  try {
    const datos = { nombre: nombre.trim(), curso, ciclo };
    const grupo = await prisma.$transaction(async (tx) => {
      const clave = JSON.stringify(datos);
      await tx.$queryRaw`SELECT 1 AS bloqueo FROM pg_advisory_xact_lock(4372, hashtext(${clave}))`;
      const existente = await tx.grupo.findFirst({ where: datos, select: seleccionarGrupo });
      return existente ?? tx.grupo.create({ data: datos, select: seleccionarGrupo });
    });
    res.json(grupo);
  } catch (error) {
    console.error('Error al crear grupo:', error);
    res.status(500).json({ error: 'No se pudo crear el grupo' });
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
        imparticiones: {
          include: {
            modulo: true
          }
        }
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
      ciclo: grupo.ciclo,
      imparticiones: grupo.imparticiones.filter((imparticion) => {
        const codigo = imparticion.modulo?.codigo;
        const ficha = codigo?.startsWith('oficial:') && catalogoCurricular.get(codigo.slice(8));
        return !ficha || !grupo.ciclo || moduloCompatible(ficha, grupo.ciclo);
      }),
      bajas: grupo.matriculas.filter((m) => m.fechaBaja)
        .map((m) => ({ ...m.estudiante, fechaBaja: m.fechaBaja })),
      estudiantes: grupo.matriculas.filter((m) => !m.fechaBaja)
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

async function descriptorValoracion(db, indicadorId, nivel) {
  const asociacion = await db.rubricaIndicador.findFirst({
    where: { indicadorId },
    include: { rubrica: { include: { niveles: true } } },
    orderBy: { id: 'asc' },
  });
  const rubrica = asociacion?.rubrica;
  return {
    rubricaId: rubrica?.id ?? null,
    descriptorAplicado: rubrica?.niveles.find((item) => item.valor === nivel)?.descripcion ?? null,
  };
}

app.post('/api/valoraciones/bloque', async (req, res) => {
  const { estudianteIds, imparticionId, indicadorId, nivel, observacion = '' } = req.body ?? {};
  if (!Array.isArray(estudianteIds) || !estudianteIds.length || estudianteIds.length > 500 ||
      ![...estudianteIds, imparticionId, indicadorId].every((id) => Number.isSafeInteger(id) && id > 0) ||
      !Number.isInteger(nivel) || nivel < 1 || nivel > 4 || typeof observacion !== 'string') {
    return res.status(400).json({ error: 'Selecciona alumnos, indicador y un nivel entre 1 y 4' });
  }

  const ids = [...new Set(estudianteIds)];
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const imparticion = await tx.imparticionModulo.findUnique({ where: { id: imparticionId } });
      if (!imparticion) return null;
      const seleccion = await tx.indicadorSeleccionado.findFirst({
        where: { indicadorId, configuracion: { imparticionId } },
      });
      if (!seleccion) return null;
      const matriculas = await tx.matricula.count({
        where: { grupoId: imparticion.grupoId, estudianteId: { in: ids }, fechaBaja: null },
      });
      if (matriculas !== ids.length) return null;
      const descriptor = await descriptorValoracion(tx, indicadorId, nivel);
      const fecha = new Date();
      return tx.valoracion.createMany({ data: ids.map((estudianteId) => ({
        estudianteId, imparticionId, indicadorId, nivel, fecha,
        observacion: observacion.trim() || null, ...descriptor,
      })) });
    });
    if (!resultado) {
      return res.status(400).json({ error: 'Comprueba que todos los alumnos y el indicador pertenecen a la impartición' });
    }
    return res.status(201).json({ total: resultado.count });
  } catch (error) {
    console.error('Error al registrar valoraciones en bloque:', error);
    return res.status(500).json({ error: 'No se pudo guardar el bloque de valoraciones' });
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
      evidenciaId, ejercicio
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
        fechaBaja: null,
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

    let nuevaEvidencia = null;
    if (ejercicio != null) {
      const { actividadId, titulo, descripcion, referencia } = ejercicio;
      const tituloValido = typeof titulo === 'string' && titulo.trim().length > 0 && titulo.trim().length <= 150;
      if (evidenciaId != null || (actividadId == null ? !tituloValido : !Number.isSafeInteger(actividadId) || actividadId <= 0) ||
          typeof descripcion !== 'string' || !descripcion.trim() || descripcion.length > 2000 ||
          (referencia != null && (typeof referencia !== 'string' || referencia.length > 2000 ||
            (referencia.trim() && !/^https?:$/i.test(URL.parse(referencia.trim())?.protocol ?? ''))))) {
        return res.status(400).json({ error: 'Indica un ejercicio, una descripción y, si lo necesitas, un enlace HTTP o HTTPS válido' });
      }
      if (actividadId != null && !await prisma.actividad.findFirst({ where: { id: actividadId, imparticionId } })) {
        return res.status(400).json({ error: 'El ejercicio no pertenece a esta impartición' });
      }
      nuevaEvidencia = {
        estudiante: { connect: { id: estudianteId } },
        descripcion: descripcion.trim(),
        referencia: referencia?.trim() || null,
        actividad: actividadId != null ? { connect: { id: actividadId } } :
          { create: { titulo: titulo.trim(), imparticion: { connect: { id: imparticionId } } } },
      };
    }

    const { rubricaId, descriptorAplicado } = await descriptorValoracion(prisma, indicadorId, nivel);
    const valoracion = await prisma.valoracion.create({
      data: {
        estudiante: { connect: { id: estudianteId } },
        indicador: { connect: { id: indicadorId } },
        imparticion: { connect: { id: imparticionId } },
        nivel,
        ...(rubricaId != null && { rubrica: { connect: { id: rubricaId } } }),
        descriptorAplicado,
        observacion: observacion?.trim() || null,
        ...(nuevaEvidencia ? { evidencia: { create: nuevaEvidencia } }
          : evidenciaId != null ? { evidencia: { connect: { id: evidenciaId } } } : {}),
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
        imparticion: true,
        evidencia: { include: { actividad: true } }
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

function datosHito(body) {
  const { fecha, titulo, nota = '' } = body ?? {};
  const { inicio } = intervalo(fecha);
  if (!inicio || typeof titulo !== 'string' || !titulo.trim() ||
      titulo.trim().length > 120 || typeof nota !== 'string' || nota.trim().length > 500) {
    throw new RangeError('Indica una fecha y un título de hasta 120 caracteres. La nota admite 500.');
  }
  return { fecha: inicio, titulo: titulo.trim(), nota: nota.trim() };
}

app.post('/api/imparticiones/:id/hitos', async (req, res) => {
  const imparticionId = Number(req.params.id);
  if (!Number.isSafeInteger(imparticionId) || imparticionId < 1) {
    return res.status(400).json({ error: 'Impartición no válida' });
  }
  try {
    const datos = datosHito(req.body);
    const imparticion = await prisma.imparticionModulo.findUnique({
      where: { id: imparticionId }, select: { curso: true },
    });
    if (!imparticion) return res.status(404).json({ error: 'Impartición no encontrada' });
    const [primero, segundo] = imparticion.curso.split('/');
    const dia = datos.fecha.toISOString().slice(0, 10);
    if (dia < `${primero}-09-01` || dia >= `${segundo}-07-01`) {
      return res.status(400).json({ error: 'Elige una fecha de septiembre a junio del curso seleccionado' });
    }
    const hito = await prisma.hitoRevision.create({ data: { ...datos, imparticionId } });
    res.status(201).json(hito);
  } catch (error) {
    if (error instanceof RangeError) return res.status(400).json({ error: error.message });
    console.error('Error al guardar hito:', error);
    res.status(500).json({ error: 'No se pudo guardar el hito' });
  }
});

app.patch('/api/imparticiones/:id/hitos/:hitoId', async (req, res) => {
  const imparticionId = Number(req.params.id);
  const id = Number(req.params.hitoId);
  const { revisado } = req.body ?? {};
  if (![id, imparticionId].every((n) => Number.isSafeInteger(n) && n > 0) || typeof revisado !== 'boolean') {
    return res.status(400).json({ error: 'Hito o estado no válido' });
  }
  try {
    const hito = await prisma.hitoRevision.updateMany({
      where: { id, imparticionId }, data: { revisado },
    });
    if (!hito.count) return res.status(404).json({ error: 'Hito no encontrado' });
    res.json({ id, revisado });
  } catch (error) {
    console.error('Error al actualizar hito:', error);
    res.status(500).json({ error: 'No se pudo actualizar el hito' });
  }
});

app.get('/api/curso/seguimiento', async (req, res) => {
  const { curso } = req.query;
  if (typeof curso !== 'string' || !/^\d{4}\/\d{4}$/.test(curso)) {
    return res.status(400).json({ error: 'Selecciona un curso académico' });
  }
  const [primero, segundo] = curso.split('/');
  const inicio = new Date(`${primero}-09-01T00:00:00Z`);
  const fin = new Date(`${segundo}-07-01T00:00:00Z`);
  if (Number(segundo) !== Number(primero) + 1) {
    return res.status(400).json({ error: 'El curso académico debe abarcar dos años consecutivos' });
  }
  try {
    const imparticiones = await prisma.imparticionModulo.findMany({
      where: { curso },
      include: {
        modulo: { select: { codigo: true } },
        grupo: { include: { matriculas: { where: { fechaBaja: null }, select: { estudianteId: true } } } },
        hitosRevision: {
          where: { fecha: { gte: inicio, lt: fin } },
          orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        },
        valoraciones: {
          where: { fecha: { gte: inicio, lt: fin } },
          select: { estudianteId: true, indicadorId: true, fecha: true, nivel: true, evidencia: { select: { actividad: { select: { titulo: true } } } } },
          orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ grupoId: 'asc' }, { id: 'asc' }],
    });
    const filas = imparticiones.filter((i) => {
      const codigo = i.modulo?.codigo;
      const ficha = codigo?.startsWith('oficial:') && catalogoCurricular.get(codigo.slice(8));
      return !ficha || !i.grupo.ciclo || moduloCompatible(ficha, i.grupo.ciclo);
    }).map((i) => {
      const matriculados = new Set(i.grupo.matriculas.map((m) => m.estudianteId));
      const ventanas = new Map();
      for (const v of i.valoraciones) {
        if (!matriculados.has(v.estudianteId)) continue;
        const indice = Math.floor((v.fecha - inicio) / (14 * 86400000));
        const ventana = ventanas.get(indice) ?? { pares: new Map(), observados: new Set(), dificultad: new Set(), actividades: new Set() };
        ventanas.set(indice, ventana);
        if (v.evidencia?.actividad.titulo) ventana.actividades.add(v.evidencia.actividad.titulo);
        const clave = `${v.estudianteId}/${v.indicadorId}`;
        if (ventana.pares.has(clave)) continue;
        ventana.pares.set(clave, v.nivel);
        ventana.observados.add(v.estudianteId);
        if (v.nivel <= 2) ventana.dificultad.add(v.estudianteId);
      }
      return {
        id: i.id, grupoId: i.grupoId, grupo: i.grupo.nombre, modulo: i.nombreModulo,
        total: matriculados.size,
        hitos: i.hitosRevision.map((hito) => ({
          ...hito, fecha: hito.fecha.toISOString().slice(0, 10),
          quincena: Math.floor((hito.fecha - inicio) / (14 * 86400000)),
        })),
        ventanas: [...ventanas].map(([indice, v]) => ({
          indice, observados: v.observados.size, dificultad: v.dificultad.size,
          actividades: [...v.actividades],
          evolucion: compararQuincenas(v.pares, ventanas.get(indice - 1)?.pares),
        })),
      };
    });
    const gruposDelCurso = await prisma.grupo.findMany({
      where: { curso }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' },
    });
    const gruposConModulo = new Set(filas.map((fila) => fila.grupoId));
    res.json({ inicio, fin, filas,
      gruposSinModulo: gruposDelCurso.filter(({ id }) => !gruposConModulo.has(id)),
    });
  } catch (error) {
    console.error('Error al consultar la evolución del curso:', error);
    res.status(500).json({ error: 'No se pudo cargar la evolución del curso' });
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

    let periodo;
    try {
      periodo = intervalo(req.query.desde, req.query.hasta);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const { inicio, fin } = periodo;

    const imparticion = await prisma.imparticionModulo.findUnique({
      where: { id: imparticionId },
      include: {
        grupo: {
          include: {
            matriculas: {
              where: { fechaBaja: null },
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

    const matriculados = imparticion.grupo.matriculas.map(({ estudianteId }) => estudianteId);
    const historial = await prisma.valoracion.findMany({
      where: { imparticionId, estudianteId: { in: matriculados }, ...(fin && { fecha: { lt: fin } }) },
      include: {
        estudiante: true,
        indicador: true
      },
      orderBy: [
        { fecha: 'desc' },
        { id: 'desc' }
      ]
    });

    const valoraciones = historial.filter((v) => !inicio || v.fecha >= inicio);

    const estudiantes = imparticion.grupo.matriculas.map(
      matricula => matricula.estudiante
    );

    // Agrupar observaciones por estudiante e indicador.
    const grupos = new Map();

    for (const valoracion of historial) {
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

      if ((inicio && ultima.fecha < inicio) || ultima.nivel > 2) continue;

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



    const refuerzos = await prisma.planRefuerzo.findMany({
      where: {
        imparticionId,
        estudianteId: { in: matriculados },
        estado: { in: ['pendiente', 'en_progreso'] },
        ...(fin && { fechaInicio: { lt: fin } }),
      },
      include: { estudiante: true },
      orderBy: [{ fechaRevision: 'asc' }, { id: 'asc' }],
    });

    const porIndicador = resumirIndicadores(valoraciones);
    if (imparticion.moduloId && porIndicador.length) {
      const vinculos = await prisma.indicadorCriterio.findMany({
        where: {
          indicadorId: { in: porIndicador.map((fila) => fila.id) },
          criterio: { resultado: { moduloId: imparticion.moduloId } },
        },
        include: { criterio: { include: { resultado: true } } },
      });
      for (const fila of porIndicador) {
        fila.criterios = vinculos.filter((v) => v.indicadorId === fila.id)
          .map(({ criterio }) => ({ ra: criterio.resultado.codigo, ce: criterio.codigo, texto: criterio.texto }));
      }
    }

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

      perfiles: agruparPerfiles(estudiantes, porIndicador),
      porIndicador: porIndicador.map(({ alumnosObservados, ...fila }) => fila),
      sinObservaciones: estudiantes.filter((item) => !estudiantesObservados.has(item.id))
        .map(({ id, nombre }) => ({ id, nombre })),
      refuerzos: refuerzos.map((p) => ({
        id: p.id, estudianteId: p.estudianteId, nombre: p.estudiante.nombre,
        indicadorId: p.indicadorId, objetivo: p.objetivo, fechaRevision: p.fechaRevision,
      })),
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
        fechaBaja: null,
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



app.patch('/api/planes-refuerzo/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { estado, estudianteId, imparticionId } = req.body ?? {};
  if (![id, estudianteId, imparticionId].every((n) => Number.isSafeInteger(n) && n > 0) ||
      !['pendiente', 'en_progreso', 'revisado'].includes(estado)) {
    return res.status(400).json({ error: 'Plan o estado no válido' });
  }
  try {
    const actualizado = await prisma.planRefuerzo.updateMany({
      where: { id, estudianteId, imparticionId }, data: { estado },
    });
    if (!actualizado.count) return res.status(404).json({ error: 'Plan no encontrado' });
    res.json({ id, estado });
  } catch (error) {
    console.error('Error al revisar plan de refuerzo:', error);
    res.status(500).json({ error: 'No se pudo actualizar el plan' });
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
        fechaBaja: null,
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
        fechaBaja: null,
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


app.get('/api/catalogo-curricular', (req, res) => {
  const { ciclo } = req.query;
  const modulos = [...catalogoCurricular.values()];
  res.json(ciclo ? modulos.filter((modulo) => moduloCompatible(modulo, ciclo)) : modulos);
});

app.post('/api/grupos/:grupoId/modulos/catalogo', async (req, res) => {
  const grupoId = Number(req.params.grupoId);
  const modulo = catalogoCurricular.get(req.body?.catalogoId);
  if (!Number.isSafeInteger(grupoId) || grupoId <= 0) {
    return res.status(400).json({ error: 'Grupo no válido' });
  }
  if (!modulo) {
    return res.status(404).json({ error: 'Módulo no encontrado en el catálogo' });
  }

  try {
    const imparticion = await prisma.$transaction(async (tx) => {
      // Serializa el alta de esta ficha, incluso si se añade desde grupos distintos.
      const codigo = `oficial:${modulo.id}`;
      await tx.$queryRaw`SELECT 1 AS bloqueo FROM pg_advisory_xact_lock(4371, hashtext(${codigo}))`;
      const grupo = await tx.grupo.findUnique({ where: { id: grupoId } });
      if (!grupo) return null;
      if (!grupo.ciclo || !moduloCompatible(modulo, grupo.ciclo)) return false;

      const curricular = await tx.moduloProfesional.upsert({
        where: { codigo },
        update: {},
        create: {
          codigo,
          nombre: modulo.nombre,
          descripcion: modulo.fuente,
          resultados: {
            create: modulo.resultados.map(({ codigo, texto, criterios }) => ({
              codigo, texto, criterios: { create: criterios },
            })),
          },
        },
      });
      const seleccion = { grupoId, moduloId: curricular.id, curso: grupo.curso };
      const existente = await tx.imparticionModulo.findFirst({ where: seleccion });
      if (existente) return { ...existente, modulo: curricular };

      const nombreModulo = modulo.id === modulo.codigo
        ? curricular.nombre
        : `${curricular.nombre} · ${modulo.ofertas.map(({ ciclo }) => ciclo).join(' / ')}`;

      return tx.imparticionModulo.create({
        data: { ...seleccion, nombreModulo },
        include: { modulo: true },
      });
    });

    if (imparticion === false) {
      return res.status(409).json({ error: 'El módulo no corresponde al ciclo del grupo seleccionado' });
    }
    if (!imparticion) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json(imparticion);
  } catch (error) {
    console.error('Error al añadir módulo del catálogo:', error);
    res.status(500).json({ error: 'No se pudo añadir el módulo al grupo' });
  }
});

app.post(['/api/modulos/importar', '/api/grupos/:grupoId/modulos'], async (req, res) => {
  try {
    const { codigo, nombre, descripcion, resultados } = req.body ?? {};
    const grupoId = req.params.grupoId === undefined ? undefined : Number(req.params.grupoId);

    if (
      typeof codigo !== 'string' || !codigo.trim() ||
      typeof nombre !== 'string' || !nombre.trim() ||
      !Array.isArray(resultados) || resultados.length === 0
    ) {
      return res.status(400).json({
        error: 'Se requiere código, nombre y al menos un RA'
      });
    }

    if (
      resultados.some(ra =>
        !ra || typeof ra.codigo !== 'string' || !ra.codigo.trim() ||
        typeof ra.texto !== 'string' || !ra.texto.trim() ||
        !Array.isArray(ra.criterios) ||
        ra.criterios.some(ce =>
          !ce || typeof ce.codigo !== 'string' || !ce.codigo.trim() ||
          typeof ce.texto !== 'string' || !ce.texto.trim()
        ) ||
        new Set(ra.criterios.map(ce => ce.codigo.trim())).size !== ra.criterios.length
      ) ||
      new Set(resultados.map(ra => ra.codigo.trim())).size !== resultados.length
    ) {
      return res.status(400).json({
        error: 'Estructura curricular inválida o códigos duplicados'
      });
    }

    let grupo = null;
    if (grupoId !== undefined) {
      if (!Number.isSafeInteger(grupoId) || grupoId <= 0) {
        return res.status(400).json({ error: 'Grupo no válido' });
      }

      grupo = await prisma.grupo.findUnique({ where: { id: grupoId } });
      if (!grupo) {
        return res.status(404).json({ error: 'Grupo no encontrado' });
      }
    }

    const existe = await prisma.moduloProfesional.findUnique({
      where: { codigo: codigo.trim() }
    });

    if (existe) {
      return res.status(409).json({
        error: 'Ya existe un módulo con ese código'
      });
    }

    const modulo = await prisma.moduloProfesional.create({
      data: {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        descripcion: typeof descripcion === 'string'
          ? descripcion.trim() || null
          : null,
        ...(grupo && {
          imparticiones: {
            create: {
              nombreModulo: nombre.trim(),
              curso: grupo.curso,
              grupo: { connect: { id: grupo.id } }
            }
          }
        }),
        resultados: {
          create: resultados.map(ra => ({
            codigo: ra.codigo.trim(),
            texto: ra.texto.trim(),
            criterios: {
              create: ra.criterios.map(ce => ({
                codigo: ce.codigo.trim(),
                texto: ce.texto.trim()
              }))
            }
          }))
        }
      },
      include: {
        ...(grupo && { imparticiones: true }),
        resultados: {
          include: { criterios: true }
        }
      }
    });

    return res.status(201).json(modulo);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un módulo con ese código' });
    }
    console.error('Error al importar módulo:', error);
    return res.status(500).json({
      error: 'No se pudo importar el módulo'
    });
  }
});

app.get('/api/modulos', async (req, res) => {
  try {
    const modulos = await prisma.moduloProfesional.findMany({
      include: {
        resultados: {
          orderBy: { codigo: 'asc' },
          include: {
            criterios: { orderBy: { codigo: 'asc' } }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return res.json(modulos);
  } catch (error) {
    console.error('Error al consultar módulos:', error);
    return res.status(500).json({
      error: 'No se pudieron consultar los módulos'
    });
  }
});


app.post('/api/indicadores/:id/criterios', async (req, res) => {
  try {
    const indicadorId = Number(req.params.id);
    const { criterioId } = req.body ?? {};

    if (
      !Number.isSafeInteger(indicadorId) || indicadorId <= 0 ||
      !Number.isSafeInteger(criterioId) || criterioId <= 0
    ) {
      return res.status(400).json({
        error: 'Identificadores inválidos'
      });
    }

    const [indicador, criterio] = await Promise.all([
      prisma.indicador.findUnique({ where: { id: indicadorId } }),
      prisma.criterioEvaluacion.findUnique({ where: { id: criterioId } })
    ]);

    if (!indicador || !criterio) {
      return res.status(404).json({
        error: 'Indicador o criterio inexistente'
      });
    }

    const asociacion = await prisma.indicadorCriterio.upsert({
      where: {
        indicadorId_criterioId: { indicadorId, criterioId }
      },
      update: {},
      create: { indicadorId, criterioId }
    });

    return res.json(asociacion);
  } catch (error) {
    console.error('Error al asociar criterio:', error);
    return res.status(500).json({
      error: 'No se pudo asociar el criterio'
    });
  }
});

app.get('/api/indicadores/:id/criterios', async (req, res) => {
  try {
    const indicadorId = Number(req.params.id);

    if (!Number.isSafeInteger(indicadorId) || indicadorId <= 0) {
      return res.status(400).json({
        error: 'Identificador inválido'
      });
    }

    const indicador = await prisma.indicador.findUnique({
      where: { id: indicadorId },
      include: {
        criteriosCurriculares: {
          include: {
            criterio: {
              include: {
                resultado: {
                  include: { modulo: true }
                }
              }
            }
          }
        }
      }
    });

    if (!indicador) {
      return res.status(404).json({
        error: 'Indicador inexistente'
      });
    }

    return res.json(indicador);
  } catch (error) {
    console.error('Error al consultar asociaciones:', error);
    return res.status(500).json({
      error: 'No se pudieron consultar las asociaciones'
    });
  }
});


async function alumnadoConHistorial(tx, origen, ids) {
  const filtro = { estudianteId: { in: ids }, imparticion: { grupoId: origen } };
  const [valoraciones, planes, evidencias] = await Promise.all([
    tx.valoracion.findMany({ where: filtro, distinct: ['estudianteId'], select: { estudianteId: true } }),
    tx.planRefuerzo.findMany({ where: filtro, distinct: ['estudianteId'], select: { estudianteId: true } }),
    tx.evidencia.findMany({
      where: { estudianteId: filtro.estudianteId, actividad: { imparticion: { grupoId: origen } } },
      distinct: ['estudianteId'], select: { estudianteId: true },
    }),
  ]);
  return new Set([...valoraciones, ...planes, ...evidencias].map((fila) => fila.estudianteId));
}

app.patch('/api/grupos/:grupoId/estudiantes/:estudianteId/nombre', async (req, res) => {
  const grupoId = Number(req.params.grupoId);
  const estudianteId = Number(req.params.estudianteId);
  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  if (![grupoId, estudianteId].every((id) => Number.isSafeInteger(id) && id > 0) ||
      !nombre || nombre.length > 150) {
    return res.status(400).json({ error: 'Escribe un nombre de hasta 150 caracteres' });
  }
  try {
    const matricula = { grupoId, estudianteId };
    const resultado = await prisma.estudiante.updateMany({
      where: { id: estudianteId, matriculas: { some: matricula } }, data: { nombre },
    });
    if (!resultado.count) return res.status(404).json({ error: 'Alumno no encontrado en ese grupo' });
    res.json({ estudianteId, nombre });
  } catch (error) {
    console.error('Error al actualizar nombre:', error);
    res.status(500).json({ error: 'No se pudo guardar el nombre' });
  }
});

app.post('/api/grupos/:grupoId/estudiantes/matriculas', async (req, res) => {
  const grupoId = Number(req.params.grupoId);
  const { accion, estudianteIds } = req.body ?? {};
  const idValido = (id) => Number.isSafeInteger(id) && id > 0;
  if (!idValido(grupoId) || !['baja', 'reactivar', 'retirar'].includes(accion) ||
      !Array.isArray(estudianteIds) || !estudianteIds.length || estudianteIds.length > 500 ||
      !estudianteIds.every(idValido)) {
    return res.status(400).json({ error: 'Selecciona una acción y al menos un alumno' });
  }
  const ids = [...new Set(estudianteIds)];
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const where = { grupoId, estudianteId: { in: ids },
        ...(accion === 'baja' ? { fechaBaja: null } : accion === 'reactivar' ? { fechaBaja: { not: null } } : {}) };
      if (await tx.matricula.count({ where }) !== ids.length) {
        return { error: 'La matrícula ha cambiado. Actualiza el grupo y vuelve a seleccionar.' };
      }
      if (accion === 'retirar') {
        const conHistorial = await alumnadoConHistorial(tx, grupoId, ids);
        if (conHistorial.size) {
          const alumnos = await tx.estudiante.findMany({ where: { id: { in: [...conHistorial] } } });
          return { error: `Tienen seguimiento en este grupo: ${alumnos.map((a) => a.codigo).join(', ')}. Usa la baja para conservar su matrícula e historial.` };
        }
        return tx.matricula.deleteMany({ where });
      }
      return tx.matricula.updateMany({ where, data: { fechaBaja: accion === 'baja' ? new Date() : null } });
    }, { isolationLevel: 'Serializable' });
    if (resultado.error) return res.status(409).json(resultado);
    res.json({ total: resultado.count });
  } catch (error) {
    if (error.code === 'P2034') return res.status(409).json({ error: 'Actualiza el grupo y vuelve a intentarlo' });
    console.error('Error al actualizar matrículas:', error);
    res.status(500).json({ error: 'No se pudieron actualizar las matrículas' });
  }
});

app.post('/api/grupos/:grupoId/estudiantes/trasladar', async (req, res) => {
  const origen = Number(req.params.grupoId);
  const { destino, estudianteIds } = req.body ?? {};
  const idValido = (id) => Number.isSafeInteger(id) && id > 0;
  if (!idValido(origen) || !idValido(destino) || origen === destino ||
      !Array.isArray(estudianteIds) || !estudianteIds.length ||
      estudianteIds.length > 500 || !estudianteIds.every(idValido)) {
    return res.status(400).json({ error: 'Selecciona alumnado y un grupo de destino distinto' });
  }
  const ids = [...new Set(estudianteIds)];
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const grupos = await tx.grupo.findMany({ where: { id: { in: [origen, destino] } } });
      if (grupos.length !== 2 || grupos[0].curso !== grupos[1].curso) {
        return { error: 'Los grupos deben existir y pertenecer al mismo curso académico' };
      }
      const matriculas = await tx.matricula.findMany({
        where: { grupoId: { in: [origen, destino] }, estudianteId: { in: ids } },
        include: { estudiante: { select: { nombre: true, codigo: true } } },
      });
      const actuales = matriculas.filter((m) => m.grupoId === origen && !m.fechaBaja);
      if (actuales.length !== ids.length) return { error: 'La matrícula ha cambiado. Actualiza el grupo y vuelve a seleccionar.' };
      const historial = await alumnadoConHistorial(tx, origen, ids);
      if (historial.size) {
        const nombres = actuales.filter((m) => historial.has(m.estudianteId))
          .map((m) => `${m.estudiante.nombre} (${m.estudiante.codigo})`);
        return { error: `Estos alumnos tienen seguimiento en el origen: ${nombres.join(', ')}. Retíralos de la selección para mover el resto.` };
      }
      if (matriculas.some((m) => m.grupoId === destino && m.fechaBaja)) {
        return { error: 'Hay alumnado de baja en el destino. Reactiva allí su matrícula antes de trasladarlo.' };
      }
      const yaEnDestino = new Set(matriculas.filter((m) => m.grupoId === destino).map((m) => m.estudianteId));
      const duplicadas = actuales.filter((m) => yaEnDestino.has(m.estudianteId)).map((m) => m.id);
      const paraMover = actuales.filter((m) => !yaEnDestino.has(m.estudianteId)).map((m) => m.id);
      if (paraMover.length) await tx.matricula.updateMany({ where: { id: { in: paraMover } }, data: { grupoId: destino } });
      if (duplicadas.length) await tx.matricula.deleteMany({ where: { id: { in: duplicadas } } });
      return { total: ids.length, nuevasEnDestino: paraMover.length, yaEnDestino: duplicadas.length };
    }, { isolationLevel: 'Serializable' });
    if (resultado.error) return res.status(409).json(resultado);
    res.json(resultado);
  } catch (error) {
    if (['P2002', 'P2034'].includes(error.code)) {
      return res.status(409).json({ error: 'Las matrículas cambiaron durante el traslado. Actualiza y vuelve a intentarlo.' });
    }
    console.error('Error al trasladar matrículas:', error);
    res.status(500).json({ error: 'No se pudo trasladar la selección' });
  }
});

app.post('/api/grupos/:grupoId/estudiantes/importar', async (req, res) => {
  try {
    const grupoId = Number(req.params.grupoId);
    const { estudiantes } = req.body ?? {};

    if (!Number.isInteger(grupoId) || grupoId <= 0) {
      return res.status(400).json({ error: 'Grupo no válido' });
    }

    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      return res.status(400).json({
        error: 'Debes proporcionar una lista de estudiantes'
      });
    }

    if (estudiantes.length > 500) {
      return res.status(400).json({
        error: 'Máximo 500 estudiantes por importación'
      });
    }

    const codigos = new Set();
    const filas = [];

    for (const [indice, estudiante] of estudiantes.entries()) {
      const codigo = estudiante?.codigo?.trim();
      const nombre = estudiante?.nombre?.trim();

      if (
        typeof codigo !== 'string' ||
        typeof nombre !== 'string' ||
        !codigo ||
        !nombre
      ) {
        return res.status(400).json({
          error: `Fila ${indice + 1}: código o nombre no válido`
        });
      }

      if (codigos.has(codigo)) {
        return res.status(400).json({
          error: `Código duplicado en el archivo: ${codigo}`
        });
      }

      codigos.add(codigo);
      filas.push({ codigo, nombre });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const grupo = await tx.grupo.findUnique({
        where: { id: grupoId }
      });

      if (!grupo) {
        return null;
      }

      const nuevasMatriculas = [];
      let creados = 0;
      let existentes = 0;
      let matriculados = 0;
      let yaMatriculados = 0;

      for (const fila of filas) {
        let estudiante = await tx.estudiante.findUnique({
          where: { codigo: fila.codigo }
        });

        if (estudiante) {
          existentes++;
        } else {
          estudiante = await tx.estudiante.create({
            data: fila
          });
          creados++;
        }

        const matricula = await tx.matricula.findFirst({
          where: {
            estudianteId: estudiante.id,
            grupoId
          }
        });

        if (matricula) {
          yaMatriculados++;
        } else {
          await tx.matricula.create({
            data: {
              estudianteId: estudiante.id,
              grupoId
            }
          });
          nuevasMatriculas.push(estudiante.id);
          matriculados++;
        }
      }

      return {
        grupoId,
        total: filas.length,
        creados,
        existentes,
        matriculados,
        yaMatriculados,
        nuevasMatriculas
      };
    });

    if (!resultado) {
      return res.status(404).json({
        error: 'Grupo no encontrado'
      });
    }

    return res.status(201).json(resultado);

  } catch (error) {
    console.error('Error al importar estudiantes:', error);

    return res.status(500).json({
      error: 'No se pudieron importar los estudiantes'
    });
  }
});


// Iniciar servidor HTTP
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
