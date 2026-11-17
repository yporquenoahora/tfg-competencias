<script>

import { api } from '../lib/api.js'; 

  export let historial = [];
  export let imparticionId = '';
  export let nombreModulo = '';
  let asociaciones = [];
  let cargandoCurriculo = false;
  let errorCurriculo = '';
  let solicitudCurriculo = 0;

  $: void cargarCurriculo(indicadorActivo);

  async function cargarCurriculo(indicadorId) {
  const solicitud = ++solicitudCurriculo;
  asociaciones = [];
  errorCurriculo = '';
  cargandoCurriculo = Boolean(indicadorId);

  if (!indicadorId) return;

  try {
    const indicador = await api(
      `/indicadores/${encodeURIComponent(indicadorId)}/criterios`
    );

    if (solicitud !== solicitudCurriculo) return;

    asociaciones = indicador.criteriosCurriculares ?? [];
  } catch (error) {
    if (solicitud !== solicitudCurriculo) return;
    errorCurriculo = error.message || 'Error de consulta curricular';
  } finally {
    if (solicitud === solicitudCurriculo) {
      cargandoCurriculo = false;
    }
  }
}


  $: asociacionesModulo = asociaciones.filter(a => !nombreModulo || a.criterio?.resultado?.modulo?.nombre?.trim().toLocaleLowerCase('es') === nombreModulo.trim().toLocaleLowerCase('es'));

  let indicadorElegido = '';
  const W = 600, H = 190, m = { l: 32, r: 15, t: 14, b: 27 };
  const y = nivel => m.t + (4 - nivel) * (H - m.t - m.b) / 3;
  const x = (i, n) => n <= 1 ? (m.l + W - m.r) / 2 : m.l + i * (W - m.l - m.r) / (n - 1);
  $: historialModulo = historial.filter(v => Number(v.imparticionId) === Number(imparticionId));
  $: indicadores = [...new Map(historialModulo.filter(v => v.indicador).map(v => [v.indicadorId, { id: v.indicadorId, nombre: v.indicador.descripcion }])).values()];
  $: if (indicadorElegido && !indicadores.some(i => String(i.id) === indicadorElegido)) indicadorElegido = '';
  $: indicadorActivo = indicadorElegido || (indicadores[0] ? String(indicadores[0].id) : '');
  $: valoraciones = historialModulo.filter(v => Number(v.indicadorId) === Number(indicadorActivo)).sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
  $: puntos = valoraciones.map((v, i) => ({ ...v, x: x(i, valoraciones.length), y: y(v.nivel) }));
  $: trazado = puntos.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  $: primera = valoraciones[0] ?? null;
  $: ultima = valoraciones[valoraciones.length - 1] ?? null;
  $: penultima = valoraciones.length >= 2 ? valoraciones[valoraciones.length - 2] : null;
  $: variacion = primera && ultima && valoraciones.length >= 2 ? ultima.nivel - primera.nivel : null;
  $: tendencia = variacion === null ? 'Evidencia insuficiente' : variacion > 0 ? 'Mejora observada' : variacion < 0 ? 'Retroceso observado' : 'Sin cambio entre inicio y fin';
  $: estadoAtencion = !ultima ? 'Sin observaciones' : ultima.nivel > 2 ? 'Sin alerta actual' : penultima && penultima.nivel <= 2 ? 'Revisión prioritaria' : 'Atención inicial';
  $: explicacionAtencion = !ultima ? 'No hay datos suficientes para valorar este indicador.' : ultima.nivel > 2 ? 'La última observación supera el umbral de atención (nivel 2).' : penultima && penultima.nivel <= 2 ? 'Las dos últimas observaciones registran niveles 1 o 2.' : 'La última observación registra un nivel 1 o 2, sin dos niveles bajos consecutivos.';

</script>

<div class="evolucion-individual">
  <label for="indicador-grafico">Indicador que deseas analizar</label>
  <select
    id="indicador-grafico"
    value={indicadorActivo}
    onchange={(event) => (indicadorElegido = event.currentTarget.value)}
  >
    {#each indicadores as indicador (indicador.id)}
      <option value={String(indicador.id)}>{indicador.nombre}</option>
    {/each}
  </select>
  {#if !indicadores.length}
    <p class="nota">Todavía no hay valoraciones para este módulo.</p>
  {:else if !puntos.length}
    <p class="nota">No hay observaciones para este indicador.</p>
  {:else}
    <div class="grafico-contenedor">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Evolución por orden de observación del indicador seleccionado, con niveles de uno a cuatro"
      >
        {#each [1, 2, 3, 4] as nivel}
          <line
            x1={m.l}
            x2={W - m.r}
            y1={y(nivel)}
            y2={y(nivel)}
            stroke="#EAD8CB"
            stroke-dasharray="4 4"
          />
          <text
            x={m.l - 10}
            y={y(nivel) + 4}
            text-anchor="end"
            font-size="12"
            fill="#795F50">{nivel}</text
          >
        {/each}
        {#if puntos.length > 1}<path
            d={trazado}
            fill="none"
            stroke="#C95622"
            stroke-width="2.5"
          />{/if}
        {#each puntos as p, i (p.id)}
          <circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill={p.nivel <= 2 ? '#B45309' : '#C95622'}
            stroke="white"
            stroke-width="1.5"
          >
            <title
              >{new Date(p.fecha).toLocaleString('es-ES')} — Nivel {p.nivel}/4</title
            >
          </circle>
          {#if puntos.length <= 8 || i === 0 || i === puntos.length - 1}
            <text
              x={p.x}
              y={H - 8}
              text-anchor="middle"
              font-size="11"
              fill="#795F50">{i + 1}</text
            >
          {/if}
        {/each}
      </svg>
    </div>
    <div
      class="interpretacion"
      aria-label="Resumen interpretativo del indicador"
    >
      <div class="metricas-evolucion">
        <div><span>Inicial</span><strong>{primera.nivel}/4</strong></div>
        <div><span>Actual</span><strong>{ultima.nivel}/4</strong></div>
        <div>
          <span>Variación</span><strong
            >{variacion === null
              ? '—'
              : `${variacion > 0 ? '+' : ''}${variacion}`}</strong
          >
        </div>
      </div>
      <p class="lectura"><strong>Tendencia:</strong> {tendencia}.</p>
      <p class="lectura">
        <strong>Seguimiento:</strong>
        {estadoAtencion}. {explicacionAtencion}
      </p>
      <p class="nota">
        Interpretación orientativa basada en {valoraciones.length}
        {valoraciones.length === 1 ? 'observación' : 'observaciones'} del mismo indicador
        y módulo. No equivale a una calificación ni a un diagnóstico.
      </p>
    </div>
    <section
      class="vinculacion"
      aria-label="Vinculación curricular del indicador"
    >
      <h4>Vinculación curricular · RA y CE</h4>
      {#if cargandoCurriculo}
        <p class="nota">Consultando asociaciones curriculares…</p>
      {:else if errorCurriculo}
        <p class="nota" role="alert">{errorCurriculo}</p>
      {:else if !asociacionesModulo.length}
        <p class="nota">
          No hay criterios de evaluación vinculados a este indicador{nombreModulo
            ? ' en el módulo seleccionado'
            : ''}.
        </p>
      {:else}
        {#each asociacionesModulo as asociacion (asociacion.criterioId)}
          <div class="criterio">
            <p>
              <strong>RA {asociacion.criterio.resultado.codigo}</strong> · {asociacion
                .criterio.resultado.texto}
            </p>
            <p>
              <strong>CE {asociacion.criterio.codigo}</strong> · {asociacion
                .criterio.texto}
            </p>
          </div>
        {/each}
      {/if}
      <p class="nota">
        La vinculación es orientativa: una valoración transversal no determina
        la superación del RA ni del CE.
      </p>
    </section>
    <p class="nota">
      Orden de observación · Nivel de 1 a 4. Consulta fechas y observaciones en
      «Ver todo».
    </p>
  {/if}
</div>

<style>
  .evolucion-individual {
    min-width: 0;
    width: 100%;
  }
  label {
    display: block;
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: 5px;
  }
  select {
    display: block;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 9px 11px;
    border: 1px solid #d9bda8;
    border-radius: 8px;
    background: #fff;
    color: #302720;
    font: inherit;
  }
  .grafico-contenedor {
    margin-top: 12px;
    width: 100%;
    min-width: 0;
    overflow: visible;
    padding: 6px;
    box-sizing: border-box;
    border: 1px solid #f2d7c4;
    border-radius: 9px;
    background: #fffaf6;
  }
  .grafico-contenedor svg {
    display: block;
    width: 100%;
    height: auto;
    max-height: 190px;
    overflow: visible;
  }
  .interpretacion {
    margin-top: 10px;
    padding: 10px;
    border: 1px solid #f2d7c4;
    border-radius: 9px;
    background: #fff7f0;
  }
  .metricas-evolucion {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .metricas-evolucion div {
    display: grid;
    gap: 2px;
  }
  .metricas-evolucion span {
    font-size: 0.73rem;
    color: #795f50;
  }
  .metricas-evolucion strong {
    font-size: 1.05rem;
    color: #302720;
  }
  .lectura {
    margin: 8px 0 0;
    font-size: 0.81rem;
    line-height: 1.45;
    color: #302720;
  }
  .vinculacion {
    margin-top: 10px;
    padding: 10px;
    border: 1px solid #f2d7c4;
    border-radius: 9px;
    background: #fff;
  }
  .vinculacion h4 {
    margin: 0 0 8px;
    font-size: 0.88rem;
    color: #302720;
  }
  .criterio {
    padding: 8px 0;
    border-top: 1px solid #f2d7c4;
  }
  .criterio p {
    margin: 4px 0;
    font-size: 0.8rem;
    line-height: 1.45;
  }
  .nota {
    margin: 8px 0 0;
    font-size: 0.76rem;
    line-height: 1.4;
    color: #795f50;
  }
</style>
