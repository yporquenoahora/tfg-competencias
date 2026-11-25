const distancia = (a, b) => a.reduce((suma, valor, i) => suma + (valor - b[i]) ** 2, 0);

export function agruparKMeans(puntos, k = 3) {
  if (!puntos.length) return [];
  const centros = [puntos[0].vector];
  while (centros.length < k) {
    let lejano = null;
    let maximo = 0;
    for (const punto of puntos) {
      const minima = Math.min(...centros.map((centro) => distancia(punto.vector, centro)));
      if (minima > maximo) {
        maximo = minima;
        lejano = punto.vector;
      }
    }
    if (!lejano) break;
    centros.push(lejano);
  }

  let asignaciones = [];
  for (let iteracion = 0; iteracion < 30; iteracion++) {
    const siguiente = puntos.map(({ vector }) => centros.reduce((mejor, centro, i) =>
      distancia(vector, centro) < distancia(vector, centros[mejor]) ? i : mejor, 0));
    if (siguiente.every((grupo, i) => grupo === asignaciones[i])) break;
    asignaciones = siguiente;
    for (const [i, centro] of centros.entries()) {
      const miembros = puntos.filter((_, j) => asignaciones[j] === i);
      if (miembros.length) {
        centros[i] = centro.map((_, eje) => miembros.reduce((total, p) => total + p.vector[eje], 0) / miembros.length);
      }
    }
  }
  return puntos.map((punto, i) => ({ ...punto, cluster: asignaciones[i] }));
}

export function analizarAtascos(filas, motivos, motivo) {
  const unidades = new Map();
  const alumnado = new Map();
  const afectados = new Set();
  const entregas = new Set();
  const entregasAfectadas = new Set();
  for (const fila of filas) {
    const { estudianteId, imparticion, evidencia, nivel } = fila;
    const { unidad, titulo } = evidencia.actividad;
    const clave = `${imparticion.id}/${unidad}`;
    if (!unidades.has(clave)) unidades.set(clave, { imparticion, unidad, titulo, observados: new Set(), afectados: new Set(), entregas: new Set() });
    const ut = unidades.get(clave);
    ut.observados.add(estudianteId);
    entregas.add(evidencia.id);

    const id = `${estudianteId}/${imparticion.id}`;
    if (!alumnado.has(id)) alumnado.set(id, { id, grupo: imparticion.grupo.nombre, unidades: new Set(), entregas: new Set(), motivos: new Map(), bajas: new Set() });
    const alumno = alumnado.get(id);
    alumno.unidades.add(unidad);
    alumno.entregas.add(evidencia.id);
    if (nivel > 2) continue;

    alumno.bajas.add(evidencia.id);
    if (fila.motivo) {
      if (!alumno.motivos.has(fila.motivo)) alumno.motivos.set(fila.motivo, new Set());
      alumno.motivos.get(fila.motivo).add(evidencia.id);
    }
    if (motivo && fila.motivo !== motivo) continue;
    afectados.add(estudianteId);
    ut.afectados.add(estudianteId);
    ut.entregas.add(evidencia.id);
    entregasAfectadas.add(evidencia.id);
  }
  const contextos = [...unidades.values()].filter((u) => u.afectados.size)
    .sort((a,b) => b.afectados.size - a.afectados.size || a.unidad - b.unidad);
  const puntos = [...alumnado.values()].filter((a) => a.unidades.size >= 3).map((a) => ({
    id: a.id, grupo: a.grupo, cobertura: a.unidades.size, proporcion: a.bajas.size / a.entregas.size,
    vector: motivos.map(([clave]) => (a.motivos.get(clave)?.size ?? 0) / a.entregas.size),
  }));
  return {
    afectados: afectados.size, entregas: entregas.size, entregasAfectadas: entregasAfectadas.size,
    grupos: new Set(contextos.map((u) => u.imparticion.grupo.id)).size,
    unidades: contextos.length, contextos, puntos: agruparKMeans(puntos),
    sinCobertura: alumnado.size - puntos.length,
  };
}
