import { readFile } from 'node:fs/promises';
import { prisma } from '../src/db.js';
import { catalogoCurricular } from '../src/catalogoCurricular.js';

const curso = '2026/2027';
const ofertas = [
  ['ASIR1', '1.º ASIR A', 'Administración de Sistemas Informáticos en Red', '0373', 'Validación de un documento XML', 'Validar la estructura del XML antes de entregar'],
  ['DAM1', '1.º DAM A', 'Desarrollo de Aplicaciones Multiplataforma', '0373', 'Validación de un documento XML', 'Validar la estructura del XML antes de entregar'],
  ['DAW1', '1.º DAW A', 'Desarrollo de Aplicaciones Web', '0373', 'Validación de un documento XML', 'Validar la estructura del XML antes de entregar'],
  ['DAMA2', '2.º DAM A', 'Desarrollo de Aplicaciones Multiplataforma', '0488', 'Formulario de alta', 'Comprobar el funcionamiento del formulario con entradas de prueba'],
  ['DAMB2', '2.º DAM B', 'Desarrollo de Aplicaciones Multiplataforma', '0486', 'Persistencia de pedidos', 'Verificar las operaciones de lectura y escritura'],
];

async function preparar() {
  for (const [clave, grupo, ciclo, codigo, actividad, descriptor] of ofertas) {
    const ficha = [...catalogoCurricular.values()].find(
      (m) => m.codigo === codigo && m.ofertas.some((o) => o.ciclo === ciclo),
    );
    const texto = await readFile(new URL(`../demo/${clave}.csv`, import.meta.url), 'utf8');
    const alumnos = texto.trim().split(/\r?\n/).slice(1).map((fila) => {
      const [codigo, nombre] = fila.split(',');
      return { codigo, nombre };
    });
    const creado = await prisma.$transaction(async (tx) => {
      const nombre = `${grupo} · Demo`;
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
      const practica = await tx.actividad.create({
        data: {
          imparticionId: imparticion.id, titulo: actividad,
          descripcion: 'Actividad sintética. La unidad didáctica se documenta en la programación de la impartición.',
          fechaPropuesta: new Date('2026-09-03T10:00:00Z'),
        },
      });
      for (const [indice, alumno] of alumnos.entries()) {
        const estudiante = await tx.estudiante.upsert({
          where: { codigo: alumno.codigo }, update: {}, create: alumno,
        });
        await tx.matricula.create({ data: { grupoId: nuevoGrupo.id, estudianteId: estudiante.id } });
        if (indice === alumnos.length - 1) continue;
        const base = { estudianteId: estudiante.id, imparticionId: imparticion.id, indicadorId: indicador.id };
        const evidencia = await tx.evidencia.create({
          data: { actividadId: practica.id, estudianteId: estudiante.id, descripcion: 'Entrega de práctica simulada' },
        });
        const dificultad = codigo === '0373' ? indice < 8 : indice < 4;
        const primera = dificultad ? 2 : 3;
        const segunda = indice < 2 ? 2 : indice < 3 ? 1 : 4;
        await tx.valoracion.createMany({ data: [
          { ...base, evidenciaId: evidencia.id, nivel: primera, fecha: new Date('2026-09-10T10:00:00Z'),
            observacion: dificultad ? 'Necesita repetir la comprobación guiada.' : 'Comprueba el resultado con autonomía.' },
          { ...base, nivel: segunda, fecha: new Date('2026-09-24T10:00:00Z'),
            observacion: segunda <= 2 ? 'Conviene revisar el procedimiento de comprobación.' : 'Aplica la comprobación en la nueva práctica.' },
        ] });
        if (indice < 2) {
          await tx.planRefuerzo.create({
            data: { ...base, objetivo: descriptor, descripcion: 'Repetir la práctica con una lista de comprobación y revisar la nueva entrega.',
              fechaInicio: new Date('2026-09-15T10:00:00Z'), fechaRevision: new Date('2026-09-28T10:00:00Z') },
          });
        }
      }
      return true;
    }, { timeout: 30000 });
    console.log(`${grupo} · ${creado ? 'datos sintéticos preparados' : 'ya preparado'}`);
  }
}

try {
  await preparar();
} finally {
  await prisma.$disconnect();
}
