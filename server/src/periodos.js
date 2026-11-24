export function intervalo(desde, hasta) {
  function fecha(valor) {
    if (!valor) return null;
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new RangeError('Usa fechas con formato AAAA-MM-DD');
    }
    const dia = new Date(valor + 'T00:00:00Z');
    if (!Number.isFinite(+dia) || dia.toISOString().slice(0, 10) !== valor) {
      throw new RangeError('Fecha no válida');
    }
    return dia;
  }

  const inicio = fecha(desde);
  const fin = fecha(hasta);
  if (inicio && fin && inicio > fin) throw new RangeError('El inicio debe preceder al fin');
  if (fin) fin.setUTCDate(fin.getUTCDate() + 1);
  return { inicio, fin };
}

export function resumirIndicadores(valoraciones) {
  const indicadores = new Map();
  const pares = new Set();
  for (const valoracion of valoraciones) {
    const clave = `${valoracion.indicadorId}/${valoracion.estudianteId}`;
    if (pares.has(clave)) continue;
    pares.add(clave);
    const fila = indicadores.get(valoracion.indicadorId) ?? {
      id: valoracion.indicadorId, nombre: valoracion.indicador.descripcion,
      observados: 0, dificultad: [],
    };
    indicadores.set(fila.id, fila);
    fila.observados++;
    if (valoracion.nivel <= 2) {
      fila.dificultad.push({ id: valoracion.estudianteId, nombre: valoracion.estudiante.nombre });
    }
  }
  return [...indicadores.values()].sort((a, b) => b.dificultad.length - a.dificultad.length || a.id - b.id);
}
