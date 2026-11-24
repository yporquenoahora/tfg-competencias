<script>
  export let filas = [];
  export let periodos = [];
  export let quincena = '';
  export let seleccionar;
  export let abrir;

  const colores = ['#266696', '#9c3a60', '#087565', '#905318', '#6650a2', '#54671d'];
  const x = (i, total) => 52 + i * 696 / Math.max(1, total - 1);
  const y = (dato) => 146 - 110 * dato.dificultad / dato.observados;
  $: activos = periodos.filter((p) => filas.some((f) =>
    f.ventanas.some((v) => v.indice === p.indice) || f.hitos?.some((h) => h.quincena === p.indice)));
  $: periodo = periodos.find((p) => String(p.indice) === quincena) ?? activos.at(-1) ?? periodos[0];
  $: series = filas.map((fila, i) => ({
    fila, color: colores[i % colores.length],
    puntos: new Map(fila.ventanas.filter((v) => v.observados).map((v) => [v.indice, v])),
  }));
</script>

{#if periodo}
  <section class="comparativa" aria-label="Comparativa de los grupos">
    <div class="cabecera">
      <h3>Comparativa del curso</h3>
      <button class="secundario" type="button" onclick={() => seleccionar('')}>Ver curso completo</button>
    </div>
    <label for="regla-quincena">Explorar quincenas <strong>{periodo.etiqueta}</strong></label>
    <input id="regla-quincena" type="range" min="0" max={periodos.length - 1}
      value={periodo.indice} aria-valuetext={periodo.etiqueta}
      oninput={(e) => seleccionar(e.currentTarget.value)} />
    <div class="extremos"><span>{periodos[0].etiqueta}</span><span>{periodos.at(-1).etiqueta}</span></div>

    <p>Porcentaje de alumnado observado con alguna dificultad</p>
    <div class="tabla-scroll">
      <svg viewBox="0 0 780 175" width="780" height="175" role="img" aria-label="Evolución de dificultades por grupo y módulo">
        {#each [0, 50, 100] as porcentaje (porcentaje)}
          {@const altura = 146 - porcentaje * 1.1}
          <line x1="52" x2="748" y1={altura} y2={altura} stroke="#ded4cb" />
          <text x="43" y={altura + 4} text-anchor="end">{porcentaje}%</text>
        {/each}
        {#each periodos as p (p.indice)}
          {@const posicion = x(p.indice, periodos.length)}
          <line x1={posicion} x2={posicion} y1="28" y2="146"
            stroke={p.indice === periodo.indice ? '#5d4035' : '#e9e2dc'} />
          {#if p.indice % 2 === 0}
            <text x={posicion} y="166" text-anchor="middle">{p.desde.slice(8)}/{p.desde.slice(5, 7)}</text>
          {/if}
          {#if filas.some((f) => f.hitos?.some((h) => h.quincena === p.indice))}
            <circle cx={posicion} cy="20" r="4" fill="#b8491a"><title>Hitos · {p.etiqueta}</title></circle>
          {/if}
        {/each}
        {#each series as serie (serie.fila.id)}
          {#each periodos as p (p.indice)}
            {@const dato = serie.puntos.get(p.indice)}
            {@const previo = serie.puntos.get(p.indice - 1)}
            {#if dato}
              {#if previo}
                <line x1={x(p.indice - 1, periodos.length)} y1={y(previo)}
                  x2={x(p.indice, periodos.length)} y2={y(dato)} stroke={serie.color} stroke-width="2.5" />
              {/if}
              <circle cx={x(p.indice, periodos.length)} cy={y(dato)} r="4" fill={serie.color} stroke="white">
                <title>{serie.fila.grupo} · {serie.fila.modulo} · {p.etiqueta} · {dato.dificultad}/{dato.observados}</title>
              </circle>
            {/if}
          {/each}
        {/each}
      </svg>
    </div>

    <ul class="series">
      {#each series as serie (serie.fila.id)}
        {@const dato = serie.puntos.get(periodo.indice)}
        {@const hitos = serie.fila.hitos?.filter((h) => h.quincena === periodo.indice && !h.revisado).length ?? 0}
        <li>
          <button type="button" class="secundario" onclick={() => abrir(serie.fila, periodo.desde, periodo.hasta)}>
            <span class="marca" style:background={serie.color}></span>
            <span><strong>{serie.fila.grupo}</strong><small>{serie.fila.modulo}</small></span>
            <span>{dato ? `${dato.dificultad}/${dato.observados}` : 'Sin observaciones'}{hitos ? ` · ${hitos} pendientes` : ''}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .comparativa { margin-block: 20px; }
  h3 { margin: 0; }
  label { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-top: 16px; }
  input { width: 100%; accent-color: #a84b25; }
  .extremos { display: flex; justify-content: space-between; gap: 8px; font-size:.8rem; }
  svg { display:block; }
  svg text { font-size: 9px; fill: #514338; }
  .series { list-style:none; padding:0; display:grid; gap:6px; }
  .series button { display:grid; grid-template-columns: 12px minmax(0, 1fr) auto; align-items:center; gap:8px; width:100%; text-align:left; }
  .series small { display:block; }
  .marca { width:10px; height:10px; border-radius:50%; }
</style>
