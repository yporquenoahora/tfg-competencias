
import { api } from './api.js';

/**
 * Consulta los planes de refuerzo de un estudiante.
 * Devuelve directamente el array de planes.
 */
export async function obtenerPlanesRefuerzo(estudianteId) {
  const datos = await api(
    `/estudiantes/${estudianteId}/planes-refuerzo`
  );

  return datos.planes ?? [];
}

/**
 * Crea un plan de refuerzo.
 * Endpoint POST ya implementado en el backend.
 */
export function crearPlanRefuerzo({
  estudianteId,
  indicadorId,
  imparticionId,
  objetivo,
  descripcion,
  fechaRevision
}) {
  return api('/planes-refuerzo', {
    method: 'POST',
    body: JSON.stringify({
      estudianteId,
      indicadorId,
      imparticionId,
      objetivo,
      descripcion,
      fechaRevision: fechaRevision || null
    })
  });
}

/**
 * Actualiza un plan.
 */
export function actualizarPlanRefuerzo(planId, cambios) {
  return api(`/planes-refuerzo/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios)
  });
}
