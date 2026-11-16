<script>
  export let historial = [];
  export let imparticionId = '';
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
</script>

<div class="evolucion-individual">
  <label for="indicador-grafico">Indicador que deseas analizar</label>
  <select id="indicador-grafico" value={indicadorActivo} onchange={event => indicadorElegido = event.currentTarget.value}>
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
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Evolución por orden de observación del indicador seleccionado, con niveles de uno a cuatro">
        {#each [1, 2, 3, 4] as nivel}
          <line x1={m.l} x2={W - m.r} y1={y(nivel)} y2={y(nivel)} stroke="#dbe3ed" stroke-dasharray="4 4" />
          <text x={m.l - 10} y={y(nivel) + 4} text-anchor="end" font-size="12" fill="#526174">{nivel}</text>
        {/each}
        {#if puntos.length > 1}<path d={trazado} fill="none" stroke="#205493" stroke-width="2.5" />{/if}
        {#each puntos as p, i (p.id)}
          <circle cx={p.x} cy={p.y} r="5" fill={p.nivel <= 2 ? '#c47722' : '#205493'} stroke="white" stroke-width="1.5">
            <title>{new Date(p.fecha).toLocaleString('es-ES')} — Nivel {p.nivel}/4</title>
          </circle>
          {#if puntos.length <= 8 || i === 0 || i === puntos.length - 1}
            <text x={p.x} y={H - 8} text-anchor="middle" font-size="11" fill="#526174">{i + 1}</text>
          {/if}
        {/each}
      </svg>
    </div>
    <p class="nota">Orden de observación · Nivel de 1 a 4. Consulta fechas y observaciones en «Ver todo».</p>
  {/if}
</div>

<style>
  .evolucion-individual { min-width: 0; width: 100%; }
  label { display: block; font-size: .88rem; font-weight: 600; margin-bottom: 5px; }
  select { display: block; width: 100%; min-width: 0; box-sizing: border-box; padding: 9px 11px; border: 1px solid #b9cbe0; border-radius: 8px; background: #fff; color: #172b49; font: inherit; }
  .grafico-contenedor { margin-top: 12px; width: 100%; min-width: 0; overflow: visible; padding: 6px; box-sizing: border-box; border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fafd; }
  .grafico-contenedor svg { display: block; width: 100%; height: auto; max-height: 190px; overflow: visible; }
  .nota { margin: 8px 0 0; font-size: .76rem; line-height: 1.4; color: #52647d; }
</style>
