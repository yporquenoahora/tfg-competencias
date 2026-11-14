<script>
  export let historial = [];
  export let imparticionId = '';
  let indicadorElegido = '';
  const W = 680, H = 260, m = { l: 48, r: 24, t: 20, b: 45 };
  const y = nivel => m.t + (4 - nivel) * (H - m.t - m.b) / 3;
  const x = (i, n) => n <= 1 ? (W + m.l - m.r) / 2 : m.l + i * (W - m.l - m.r) / (n - 1);
  $: indicadores = [...new Map(historial.filter(v => v.imparticionId === Number(imparticionId)).map(v => [v.indicadorId, { id: v.indicadorId, nombre: v.indicador.descripcion }])).values()];
  $: if (indicadorElegido && !indicadores.some(i => String(i.id) === indicadorElegido)) indicadorElegido = '';
  $: valoraciones = historial.filter(v => v.imparticionId === Number(imparticionId) && v.indicadorId === Number(indicadorElegido)).sort((a,b) => new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
  $: puntos = valoraciones.map((v,i) => ({...v, x:x(i,valoraciones.length), y:y(v.nivel)}));
  $: trazado = puntos.map((p,i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
</script>
<div class="subpanel">
  <h3>Evolución individual por indicador</h3>
  <label for="indicador-grafico">Indicador que deseas analizar</label>
  <select id="indicador-grafico" bind:value={indicadorElegido}>
    <option value="">Selecciona un indicador</option>
    {#each indicadores as indicador (indicador.id)}<option value={String(indicador.id)}>{indicador.nombre}</option>{/each}
  </select>
  {#if !indicadorElegido}<p>Selecciona un indicador con valoraciones registradas.</p>
  {:else if !puntos.length}<p>No hay observaciones para este indicador.</p>
  {:else}
    <div class="grafico-contenedor">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución cronológica de niveles del indicador seleccionado">
        {#each [1,2,3,4] as nivel}
          <line x1={m.l} x2={W-m.r} y1={y(nivel)} y2={y(nivel)} stroke="#dbe3ed" stroke-dasharray="4 4" />
          <text x={m.l-15} y={y(nivel)+5} text-anchor="end" font-size="14" fill="#526174">{nivel}</text>
        {/each}
        {#if puntos.length > 1}<path d={trazado} fill="none" stroke="#205493" stroke-width="3" />{/if}
        {#each puntos as p,i (p.id)}
          <circle cx={p.x} cy={p.y} r="7" fill={p.nivel<=2?'#c47722':'#205493'} stroke="white" stroke-width="2"><title>{new Date(p.fecha).toLocaleString('es-ES')} — Nivel {p.nivel}/4</title></circle>
          <text x={p.x} y={H-14} text-anchor="middle" font-size="12" fill="#526174">{i+1}</text>
        {/each}
      </svg>
    </div>
    <p class="nota">Eje horizontal: orden de observaciones (no intervalos temporales proporcionales). Eje vertical: nivel de 1 a 4.</p>
    <table><thead><tr><th>Observación</th><th>Fecha</th><th>Nivel</th></tr></thead><tbody>
      {#each valoraciones as v,i (v.id)}<tr><td>{i+1}</td><td>{new Date(v.fecha).toLocaleString('es-ES')}</td><td>{v.nivel}/4</td></tr>{/each}
    </tbody></table>
  {/if}
</div>
