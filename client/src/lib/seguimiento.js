
import { api } from './api.js';

/**
 * Obtiene los estudiantes y las imparticiones de un grupo.
 */
export function obtenerGrupo(grupoId = 1) {
  return api(`/grupos/${grupoId}/estudiantes`);
}

/**
 * Consulta el historial de valoraciones de un estudiante.
 */
export async function obtenerHistorial(estudianteId) {
  const datos = await api(
    `/estudiantes/${estudianteId}/valoraciones`
  );

  return datos.valoraciones ?? [];
}

/**
 * Obtiene el seguimiento grupal de una impartición.
 */
export function obtenerSeguimientoGrupal(imparticionId, { desde, hasta } = {}) {
  const filtros = new URLSearchParams();
  if (desde) filtros.set('desde', desde);
  if (hasta) filtros.set('hasta', hasta);
  return api(`/imparticiones/${imparticionId}/seguimiento?${filtros}`);
}

/**
 * Registra una valoración de un indicador.
 */
export function registrarValoracion({
  estudianteId,
  imparticionId,
  indicadorId,
  nivel,
  observacion,
  evidenciaId,
  ejercicio
}) {
  return api('/valoraciones', {
    method: 'POST',
    body: JSON.stringify({
      estudianteId,
      imparticionId,
      indicadorId,
      nivel,
      observacion,
      evidenciaId,
      ejercicio
    })
  });
}
