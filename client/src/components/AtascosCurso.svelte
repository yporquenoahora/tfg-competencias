<script>
  import { api } from '../lib/api.js';
  import { analizarAtascos } from '../lib/atascos.js';
  export let curso = '';
  let datos = null;
  let motivo = '';
  let grupo = '';
  let cargando = true;
  let error = '';
  let cluster = null;
  let solicitud = 0;
  const colores = ['#237d71','#b34b2d','#6554a0'];
  $: void cargar(curso);
  $: grupos = [...new Map((datos?.filas ?? []).map((v) => [v.imparticion.grupo.id, v.imparticion.grupo.nombre]))];
  $: resultado = analizarAtascos((datos?.filas ?? []).filter((v) =>
    !grupo || String(v.imparticion.grupo.id) === grupo), datos?.motivos ?? [], motivo);
  $: gruposCluster = [...new Set(resultado.puntos.map((p) => p.cluster))].sort();
  $: maxCobertura = Math.max(12, ...resultado.puntos.map((p) => p.cobertura));

  async function cargar(valor) {
    const actual = ++solicitud;
    datos = null;
    error = '';
    if (!valor) return;
    cargando = true;
    try {
      const respuesta = await api(`/curso/atascos?curso=${encodeURIComponent(valor)}`);
      if (actual === solicitud) {
        datos = respuesta;
        grupo = '';
        cluster = null;
      }
    } catch (fallo) {
      if (actual === solicitud) error = fallo.message;
    } finally {
      if (actual === solicitud) cargando = false;
    }
  }

  function perfil(indice, puntos, motivos) {
    const miembros = puntos.filter((p) => p.cluster === indice);
    return motivos.map(([, nombre], i) => ({
      nombre, media: miembros.reduce((suma, p) => suma + p.vector[i], 0) / miembros.length,
    })).filter((m) => m.media > 0).sort((a,b) => b.media - a.media)[0]?.nombre ?? 'Sin motivo registrado';
  }
</script>

<section class="panel">
  <h2>Dificultades comunes</h2>
  {#if cargando}
    <p role="status">Cargando entregas…</p>
  {:else if error}
    <p class="error" role="alert">{error}</p>
    <button type="button" class="secundario" onclick={() => cargar(curso)}>Reintentar</button>
  {:else if datos?.filas.length}
    <div class="revision-periodo">
      <label>Motivo
        <select value={motivo} onchange={(e) => (motivo = e.currentTarget.value)}>
          <option value="">Todas las dificultades</option>
          {#each datos.motivos as [clave, etiqueta] (clave)}<option value={clave}>{etiqueta}</option>{/each}
        </select>
      </label>
      <label>Grupo
        <select value={grupo} onchange={(e) => { grupo = e.currentTarget.value; cluster = null; }}>
          <option value="">Todos los grupos</option>
          {#each grupos as [id, nombre] (id)}<option value={String(id)}>{nombre}</option>{/each}
        </select>
      </label>
    </div>

    <dl class="cifras" aria-label="Resumen de dificultades">
      <div><dt>Alumnos afectados</dt><dd>{resultado.afectados}</dd></div>
      <div><dt>Entregas afectadas / observadas</dt><dd>{resultado.entregasAfectadas}/{resultado.entregas}</dd></div>
      <div><dt>Grupos afectados</dt><dd>{resultado.grupos}</dd></div>
      <div><dt>Unidades afectadas por impartición</dt><dd>{resultado.unidades}</dd></div>
    </dl>

    <h3>Módulos y unidades afectados</h3>
    {#if resultado.contextos.length}
      <div class="tabla-scroll impacto">
        <table>
          <thead><tr><th scope="col">Grupo · Módulo</th><th scope="col">Unidad</th>
            <th scope="col">Alumnos afectados / observados</th><th scope="col">Entregas afectadas</th></tr></thead>
          <tbody>{#each resultado.contextos as ut (`${ut.imparticion.id}/${ut.unidad}`)}
            <tr><td>{ut.imparticion.grupo.nombre}<br />{ut.imparticion.nombreModulo}</td>
              <td>{ut.titulo.startsWith(`UT${ut.unidad} ·`) ? ut.titulo : `UT${ut.unidad} · ${ut.titulo}`}</td>
              <td>{ut.afectados.size}/{ut.observados.size}</td><td>{ut.entregas.size}</td></tr>
          {/each}</tbody>
        </table>
      </div>
    {:else}<p>Este filtro no tiene dificultades registradas.</p>{/if}

    <h3>Perfiles de dificultad · K-means</h3>
    <p>El motivo filtra la tabla. Los clústeres comparan todos los motivos del grupo seleccionado y requieren entregas en al menos tres unidades.</p>
    {#if resultado.puntos.length}
      <div class="tabla-scroll">
        <svg viewBox="0 0 560 232" role="img" aria-label="Clústeres por unidades observadas y proporción de entregas en dificultad">
          {#each [0, .5, 1] as marca (marca)}
            {@const y = 186 - marca * 166}
            <line x1="54" x2="520" y1={y} y2={y} stroke="#d7c9bd" />
            <text x="46" y={y + 4} text-anchor="end">{marca * 100}%</text>
          {/each}
          {#each resultado.puntos as p (p.id)}
            <circle cx={54 + p.cobertura / maxCobertura * 466} cy={186 - p.proporcion * 166} r="5"
              fill={colores[p.cluster]} opacity={cluster == null || p.cluster === cluster ? .8 : .12}>
              <title>{p.grupo} · {p.cobertura} unidades · {Math.round(p.proporcion * 100)} % de entregas en dificultad</title>
            </circle>
          {/each}
          {#each [0, Math.floor(maxCobertura / 2), maxCobertura] as marca (marca)}
            <text x={54 + marca / maxCobertura * 466} y="203" text-anchor="middle">{marca}</text>
          {/each}
          <text x="287" y="223" text-anchor="middle">Unidades con entregas observadas</text>
        </svg>
      </div>
      <div class="acciones">
        {#each gruposCluster as indice (indice)}
          <button type="button" class="secundario" aria-pressed={cluster === indice}
            onclick={() => (cluster = cluster === indice ? null : indice)}>
            <span class="marca" style:background={colores[indice]}></span>
            {perfil(indice, resultado.puntos, datos.motivos)} · {resultado.puntos.filter((p) => p.cluster === indice).length} perfiles
          </button>
        {/each}
      </div>
      <p class="nota">Cada punto representa a un alumno en una impartición. Pueden superponerse. {resultado.sinCobertura} perfiles con cobertura insuficiente.</p>
    {:else}<p>Faltan entregas en tres o más unidades por alumno para estimar los clústeres.</p>{/if}
  {:else}
    <p>Vincula valoraciones con evidencias de ejercicios que tengan una unidad de trabajo.</p>
  {/if}
</section>

<style>
  .cifras { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:16px 0; border-top:2px solid #3c3027; padding-top:12px; }
  .cifras div { padding:8px 10px; border-left:3px solid #c35424; }
  dt { font-size:.85rem; }
  dd { margin:4px 0 0; font-size:1.5rem; font-weight:700; }
  .impacto { max-height:380px; }
  svg { display:block; width:min(100%, 710px); min-width:320px; }
  svg text { font:11px system-ui; fill:#4b3a30; }
  .marca { display:inline-block; width:.75em; height:.75em; border-radius:100%; }
  button[aria-pressed=true] { outline:2px solid #a84b25; }
  @media(max-width:1100px), (pointer:coarse) and (max-width:1400px) {
    .cifras { grid-template-columns:1fr; }
  }
</style>
