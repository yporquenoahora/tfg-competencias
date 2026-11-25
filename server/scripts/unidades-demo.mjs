import { readFile } from 'node:fs/promises';

const unidades = JSON.parse(await readFile(new URL('../demo/unidades-lm.json', import.meta.url), 'utf8'));
const dias = ['09-14','10-05','10-26','11-16','12-14','01-18','02-08','02-22','03-15','04-19','05-17','06-21'];
const motivoPorUnidad = [
  'estructura','estructura','validacion','documentacion','depuracion','estructura',
  'validacion','depuracion','validacion','estructura','depuracion','documentacion',
];

export function prepararUnidades(grupos, curso) {
  const [inicio, fin] = curso.split('/');
  return grupos.filter((grupo) => grupo.modulo === '0373').map((grupo, g) => ({
    ...grupo,
    indicador: 'Revisa el resultado y documenta las comprobaciones del ejercicio',
    ejercicios: unidades.map(({ numero, titulo }, i) => ({
      titulo: `UT${numero} · ${titulo}`, unidad: numero,
      fecha: `${i < 5 ? inicio : fin}-${dias[i]}T10:00:00Z`,
    })),
    alumnos: grupo.alumnos.map((alumno, a) => ({
      ...alumno,
      codigo: `UT-${alumno.codigo}`,
      valoraciones: unidades.flatMap(({ numero }, i) => {
        if ((a + i + g * 3) % 17 === 0) return [];
        const motivo = motivoPorUnidad[i];
        const afecta = motivo === 'validacion' ? a < 9 + g : motivo === 'depuracion'
          ? a >= 6 && a < 14 + g : motivo === 'estructura' ? a % 5 < 2 : a >= 13;
        const nivel = afecta ? 1 + (a + i) % 2 : 3 + (a + i) % 2;
        return [{ ejercicio: numero - 1, nivel, motivo: afecta ? motivo : null,
          observacion: afecta ? 'La entrega necesita una revisión guiada de este aspecto.' :
            'La entrega incluye comprobaciones reproducibles.' }];
      }),
    })),
  }));
}
