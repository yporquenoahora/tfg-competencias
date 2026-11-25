import { readFile } from 'node:fs/promises';
import { prepararUnidades } from './unidades-demo.mjs';
import { extenderCurso } from './curso-completo-demo.mjs';
import { prisma } from '../src/db.js';
import { catalogoCurricular } from '../src/catalogoCurricular.js';

const { curso, grupos } = JSON.parse(await readFile(
  new URL('../demo/recorridos-demo.json', import.meta.url), 'utf8',
));

const cursoCompleto = process.argv.includes('--curso-completo');
const demoUnidades = process.argv.includes('--unidades-lm');
const sufijoGrupo = demoUnidades ? ' · UT LM · Demo' : cursoCompleto ? ' · Curso completo · Demo' : process.argv.includes('--recorridos') ? ' · Recorridos · Demo' : ' · Demo';

async function preparar() {
  for (const { clave, grupo, ciclo, modulo: codigo, indicador: descriptor, alumnos, ejercicios } of (demoUnidades ? prepararUnidades(grupos, curso) : cursoCompleto ? extenderCurso(grupos, curso) : grupos)) {
    const ficha = [...catalogoCurricular.values()].find(
      (m) => m.codigo === codigo && m.ofertas.some((o) => o.ciclo === ciclo),
    );
    const creado = await prisma.$transaction(async (tx) => {
      const nombre = grupo + sufijoGrupo;
      await tx.$queryRaw`SELECT 1 AS bloqueo FROM pg_advisory_xact_lock(4373, hashtext(${nombre}))`;
      const existe = await tx.grupo.findFirst({ where: { nombre, curso, ciclo } });
      if (existe) return false;

      const curricular = await tx.moduloProfesional.upsert({
        where: { codigo: `oficial:${ficha.id}` },
        update: {},
        create: {
          codigo: `oficial:${ficha.id}`, nombre: ficha.nombre, descripcion: ficha.fuente,
          resultados: { create: ficha.resultados.map(({ codigo, texto, criterios }) => ({
            codigo, texto, criterios: { create: criterios },
          })) },
        },
        include: { resultados: { include: { criterios: true }, orderBy: { codigo: 'asc' } } },
      });
      const nuevoGrupo = await tx.grupo.create({ data: { nombre, curso, ciclo } });
      const imparticion = await tx.imparticionModulo.create({
        data: { grupoId: nuevoGrupo.id, moduloId: curricular.id, curso, nombreModulo: ficha.nombre },
      });
      const competencia = await tx.competencia.create({
        data: { nombre: `Verificación del trabajo · Demo ${clave}` },
      });
      const dimension = await tx.dimension.create({
        data: { nombre: 'Comprobación del resultado', competenciaId: competencia.id },
      });
      const indicador = await tx.indicador.create({
        data: { descripcion: descriptor, dimensionId: dimension.id, competenciaId: competencia.id },
      });
      await tx.configuracionSeguimiento.create({
        data: {
          nombre: 'Seguimiento de demostración', imparticionId: imparticion.id,
          indicadores: { create: { indicadorId: indicador.id } },
        },
      });
      const resultado = curricular.resultados.find((r) =>
        codigo === '0373' ? /validaci|esquem/i.test(r.texto) : r.codigo === 'RA1',
      ) ?? curricular.resultados[0];
      const criterio = resultado?.criterios.find((c) =>
        codigo === '0373' ? /valid|esquem/i.test(c.texto) : /comprob|verific|prob/i.test(c.texto),
      );
      if (criterio) {
        await tx.indicadorCriterio.create({ data: { indicadorId: indicador.id, criterioId: criterio.id } });
      }
      const practicas = await Promise.all(ejercicios.map(({ titulo, fecha, unidad }) => tx.actividad.create({
        data: { imparticionId: imparticion.id, titulo, unidad, fechaPropuesta: new Date(fecha) },
      })));
      for (const { codigo, nombre, valoraciones, refuerzo } of alumnos) {
        const estudiante = await tx.estudiante.upsert({
          where: { codigo }, update: {}, create: { codigo, nombre },
        });
        await tx.matricula.create({ data: { grupoId: nuevoGrupo.id, estudianteId: estudiante.id } });
        const base = { estudianteId: estudiante.id, imparticionId: imparticion.id, indicadorId: indicador.id };
        for (const { ejercicio, nivel, observacion, motivo } of valoraciones) {
          const fecha = new Date(ejercicios[ejercicio].fecha);
          const evidencia = await tx.evidencia.create({
            data: { actividadId: practicas[ejercicio].id, estudianteId: estudiante.id,
              descripcion: observacion, fechaRegistro: fecha },
          });
          await tx.valoracion.create({ data: { ...base, evidenciaId: evidencia.id, nivel, fecha, observacion, motivo } });
        }
        if (refuerzo) {
          await tx.planRefuerzo.create({
            data: { ...base, objetivo: descriptor, descripcion: 'Repetir la práctica con una lista de comprobación y revisar la nueva entrega.',
              fechaInicio: new Date('2026-09-15T10:00:00Z'), fechaRevision: new Date('2026-09-28T10:00:00Z') },
          });
        }
      }
      return true;
    }, { timeout: cursoCompleto ? 90000 : 30000 });
    console.log(`${grupo} · ${creado ? 'datos sintéticos preparados' : 'ya preparado'}`);
  }
}

try {
  await preparar();
} finally {
  await prisma.$disconnect();
}
