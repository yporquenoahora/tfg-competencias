export function construirSeries(filas, modo) {
  const series = new Map();

  function incorporar(id, nombre, fila, puntos, estudianteId = null) {
    if (!series.has(id)) series.set(id, { id, nombre, puntos: new Map(), contextos: new Map() });
    const serie = series.get(id);
    serie.contextos.set(fila.id, { fila, estudianteId });
    for (const punto of puntos) {
      const total = serie.puntos.get(punto.indice) ?? { dificultad: 0, observados: 0, registros: [] };
      total.dificultad += punto.dificultad;
      total.observados += punto.observados;
      total.registros.push({ fila, estudianteId, ...punto });
      serie.puntos.set(punto.indice, total);
    }
  }

  for (const fila of filas) {
    if (modo === 'alumno') {
      const porAlumno = new Map();
      for (const { indice, alumnos } of fila.ventanas) {
        for (const alumno of alumnos ?? []) {
          if (!porAlumno.has(alumno.id)) porAlumno.set(alumno.id, []);
          porAlumno.get(alumno.id).push({ indice, dificultad: alumno.dificultad, observados: alumno.observados });
        }
      }
      for (const alumno of fila.alumnado ?? []) {
        incorporar(alumno.id, `${alumno.nombre} · ${alumno.codigo}`, fila, porAlumno.get(alumno.id) ?? [], alumno.id);
      }
    } else if (modo === 'modulo') {
      incorporar(fila.moduloId ?? `imparticion-${fila.id}`, fila.moduloNombre || fila.modulo, fila, fila.ventanas);
    } else {
      incorporar(fila.grupoId, fila.grupo, fila, fila.ventanas);
    }
  }
  return [...series.values()];
}
