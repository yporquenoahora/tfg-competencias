export function extenderCurso(grupos, curso) {
  const [primero, segundo] = curso.split('/').map(Number);
  const inicio = Date.UTC(primero, 8, 10, 10);
  const fin = Date.UTC(segundo, 6, 1);
  const dia = 86400000;

  return grupos.map((grupo, g) => {
    const ejercicios = [...grupo.ejercicios];
    for (let fecha = inicio + 28 * dia; fecha < fin; fecha += 14 * dia) {
      const numero = ejercicios.length + 1;
      ejercicios.push({
        titulo: `Práctica ${numero} · ${grupo.ejercicios[numero % 2].titulo}`,
        fecha: new Date(fecha).toISOString(),
      });
    }
    const ultimaQuincena = Math.floor((fin - dia - Date.UTC(primero, 8, 1)) / (14 * dia));
    const quincenaFinal = Math.floor((Date.parse(ejercicios.at(-1).fecha) - Date.UTC(primero, 8, 1)) / (14 * dia));
    if (quincenaFinal < ultimaQuincena) {
      ejercicios.push({ titulo: 'Revisión final del curso', fecha: new Date(fin - dia + 10 * 3600000).toISOString() });
    }
    const alumnos = grupo.alumnos.map((alumno, a) => {
      if (!alumno.valoraciones.length) return alumno;
      const valoraciones = [...alumno.valoraciones];
      for (let ejercicio = 2; ejercicio < ejercicios.length; ejercicio++) {
        if ((ejercicio + a + g * 2) % 11 === 0) continue;
        const fase = Math.floor(ejercicio / 5);
        const base = a < 2 ? 2 : a < 7 ? 2 + Math.min(fase, 2) : a < 10 ? 4 - Math.min(fase, 2) : 3;
        const nivel = Math.max(1, Math.min(4, base + ((a + ejercicio + g) % 7 === 0 ? -1 : 0)));
        valoraciones.push({ ejercicio, nivel, observacion: nivel <= 2
          ? 'Requiere apoyo en la comprobación del ejercicio.'
          : 'Completa y explica la comprobación del ejercicio.' });
      }
      return { ...alumno, valoraciones };
    });
    return { ...grupo, ejercicios, alumnos };
  });
}
