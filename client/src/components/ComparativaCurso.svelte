<script>
  import { construirSeries } from '../lib/seriesCurso.js';
  export let cursos = [];
  export let curso = '';
  export let cambiarCurso = () => {};
  export let filas = [];
  export let periodos = [];
  export let quincena = '';
  export let seleccionar;
  export let abrir;

  const modos = [['grupo', 'Grupos'], ['modulo', 'Módulos'], ['alumno', 'Alumnos']];
  const colores = ['#57b5ed', '#f078aa', '#65d9af', '#f0ae6c', '#baadff', '#d9db78', '#68cece'];
  const x = (i, total) => 54 + i * 690 / Math.max(1, total - 1);
  const y = (dato) => 161 - 120 * dato.dificultad / dato.observados;
  let modo = 'grupo';
  let filtro = '';
  let idActivo = null;
  $: series = construirSeries(filas, modo).map((serie, i) => ({ ...serie, color: colores[i % colores.length] }));
  $: visibles = series.filter((serie) => serie.nombre.toLocaleLowerCase('es').includes(filtro.trim().toLocaleLowerCase('es')));
  $: activa = visibles.find((serie) => serie.id === idActivo);
  $: ultima = periodos.findLast((p) => filas.some((f) =>
    f.ventanas.some((v) => v.indice === p.indice) || f.hitos?.some((h) => h.quincena === p.indice)));
  $: periodo = periodos.find((p) => String(p.indice) === quincena) ?? ultima ?? periodos[0];
  $: puntoActivo = activa && periodo ? activa.puntos.get(periodo.indice) : null;
  $: destinos = puntoActivo?.registros ?? [...(activa?.contextos.values() ?? [])];

  function enfocar(serie, indice) {
    idActivo = serie.id;
    seleccionar(String(indice));
  }
</script>

{#if periodo}
  <section class="comparativa" aria-label="Evolución por grupos, módulos y alumnos">
    <div class="cabecera">
      <h1>Evolución del curso</h1>
      <label>Curso académico
        <select value={curso} onchange={(e) => cambiarCurso(e.currentTarget.value)}>
          {#each cursos as item (item)}<option value={item}>{item}</option>{/each}
        </select>
      </label>
      <div class="modos" aria-label="Comparar por">
        {#each modos as [clave, etiqueta] (clave)}
          <button type="button" aria-pressed={modo === clave}
            onclick={() => { modo = clave; idActivo = null; filtro = ''; }}>{etiqueta}</button>
        {/each}
      </div>
    </div>
    <div class="filtros">
      <label>Buscar {modo === 'alumno' ? 'alumno' : modo === 'modulo' ? 'módulo' : 'grupo'}
        <input type="search" bind:value={filtro} />
      </label>
      <label for="regla-quincena">Quincena · {periodo.etiqueta}
        <input id="regla-quincena" type="range" min="0" max={periodos.length - 1}
          value={periodo.indice} aria-valuetext={periodo.etiqueta}
          oninput={(e) => seleccionar(e.currentTarget.value)} />
      </label>
      <button type="button" onclick={() => { idActivo = null; seleccionar(''); }}>Ver curso completo</button>
    </div>
    <p class="unidad">{modo === 'alumno' ? '% de indicadores observados en dificultad' : '% de alumnado observado en dificultad · recuento por impartición'}</p>
    <div class="tabla-scroll">
      <svg viewBox="0 0 780 190" width="780" height="190" aria-label="Gráfico de evolución">
        {#each [0, 50, 100] as porcentaje (porcentaje)}
          {@const altura = 161 - porcentaje * 1.2}
          <line x1="54" x2="744" y1={altura} y2={altura} stroke="#514c50" />
          <text x="45" y={altura + 4} text-anchor="end">{porcentaje}%</text>
        {/each}
        {#each periodos as p (p.indice)}
          {@const posicion = x(p.indice, periodos.length)}
          <line x1={posicion} x2={posicion} y1="30" y2="161" stroke={p.indice === periodo.indice ? '#e6b495' : '#373438'} />
          {#if p.indice % 2 === 0}<text x={posicion} y="181" text-anchor="middle">{p.desde.slice(8)}/{p.desde.slice(5, 7)}</text>{/if}
          {#if filas.some((f) => f.hitos?.some((h) => h.quincena === p.indice))}
            <circle cx={posicion} cy="22" r="4" fill="#ffad69"><title>Hitos · {p.etiqueta}</title></circle>
          {/if}
        {/each}
        {#each visibles as serie (serie.id)}
          {#each periodos as p (p.indice)}
            {@const dato = serie.puntos.get(p.indice)}
            {@const previo = serie.puntos.get(p.indice - 1)}
            {#if dato?.observados}
              {#if previo?.observados}
                <line x1={x(p.indice - 1, periodos.length)} y1={y(previo)} x2={x(p.indice, periodos.length)} y2={y(dato)}
                  stroke={serie.color} stroke-width={activa === serie ? 4 : 2.5} opacity={activa && activa !== serie ? .22 : 1} />
              {/if}
              <circle cx={x(p.indice, periodos.length)} cy={y(dato)} r={activa === serie ? 6 : 4}
                fill={serie.color} opacity={activa && activa !== serie ? .3 : 1}
                role="button" tabindex={activa && activa !== serie ? -1 : 0}
                aria-label={`${serie.nombre} · ${p.etiqueta} · ${dato.dificultad}/${dato.observados}`}
                onclick={() => enfocar(serie, p.indice)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enfocar(serie, p.indice); }
                }}>
                <title>{serie.nombre} · {p.etiqueta} · {dato.dificultad}/{dato.observados}</title>
              </circle>
            {/if}
          {/each}
        {/each}
      </svg>
    </div>
    <div class="lectura">
      <div class="series" aria-label="Series disponibles">
        {#each visibles as serie (serie.id)}
          {@const dato = serie.puntos.get(periodo.indice)}
          <button type="button" aria-pressed={activa === serie} onclick={() => (idActivo = serie.id)}>
            <i style:background={serie.color}></i><span>{serie.nombre}</span>
            <small>{dato ? `${dato.dificultad}/${dato.observados}` : 'Sin observaciones'}</small>
          </button>
        {:else}<p>Sin coincidencias.</p>{/each}
      </div>
      <div class="detalle" aria-live="polite">
        {#if activa}
          <strong>{activa.nombre} · {periodo.etiqueta}</strong>
          <p>{puntoActivo ? `${puntoActivo.dificultad} de ${puntoActivo.observados} en dificultad` : 'Sin observaciones en esta quincena'}</p>
          {#each destinos as destino (destino.fila.id)}
            <button type="button" onclick={() => abrir(destino.fila, periodo.desde, periodo.hasta, destino.estudianteId)}>
              {destino.estudianteId ? 'Abrir alumno' : 'Abrir seguimiento'} · {destino.fila.grupo} · {destino.fila.modulo}
            </button>
          {/each}
        {:else}<p>Selecciona un punto o una serie para abrir su seguimiento.</p>{/if}
      </div>
    </div>
  </section>
{/if}

<style>
  .comparativa { background: #262328; color: #f8f4ed; border-radius: 12px; padding: 16px; margin-block: 16px; }
  h1, p, small { color: inherit; margin-block: 0; }
  .modos, .filtros { display:flex; gap:6px; flex-wrap:wrap; }
  .filtros { align-items:end; margin-block: 12px; }
  label { display:grid; gap:4px; font-size:.85rem; }
  select, input[type="search"] { color:#251c18; background:#fffaf5; border:1px solid #a69892; border-radius:5px; padding:5px; }
  input { accent-color:#ffad69; min-width:0; }
  .unidad { font-size:.85rem; }
  svg { display:block; width:100%; min-width:600px; height:auto; max-height:240px; }
  svg text { font-size:10px; fill:#eae3dd; }
  svg circle[role="button"] { cursor:pointer; }
  svg circle:focus { stroke:white; stroke-width:2; outline:none; }
  button { background:#3c363b; border:1px solid #6f6065; color:#fff; text-align:left; padding:6px 9px; }
  button[aria-pressed="true"] { background:#553b31; border-color:#ffad69; }
  .lectura { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px; }
  .series, .detalle { max-height:175px; overflow:auto; display:grid; gap:5px; align-content:start; }
  .series button { display:grid; grid-template-columns:10px 1fr auto; gap:6px; align-items:center; }
  .series i { width:9px; height:9px; border-radius:50%; }
  @media (max-width:690px) { .lectura { grid-template-columns:1fr; } }
</style>
