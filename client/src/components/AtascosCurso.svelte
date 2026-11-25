<script>
  import FuerzaDificultades from './FuerzaDificultades.svelte';
  import { api } from '../lib/api.js';
  import { analizarAtascos } from '../lib/atascos.js';
  export let curso = '';
  let datos = null;
  let motivo = '';
  let grupo = '';
  let cargando = true;
  let error = '';
  let solicitud = 0;
  $: void cargar(curso);
  $: grupos = [...new Map((datos?.filas ?? []).map((v) => [v.imparticion.grupo.id, v.imparticion.grupo.nombre]))];
  $: resultado = analizarAtascos((datos?.filas ?? []).filter((v) =>
    !grupo || String(v.imparticion.grupo.id) === grupo), datos?.motivos ?? [], motivo);


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
      }
    } catch (fallo) {
      if (actual === solicitud) error = fallo.message;
    } finally {
      if (actual === solicitud) cargando = false;
    }
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
        <select value={grupo} onchange={(e) => { grupo = e.currentTarget.value; }}>
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
      <FuerzaDificultades puntos={resultado.puntos} motivos={datos.motivos} {motivo} />
      <p class="nota">{resultado.sinCobertura} perfiles con cobertura insuficiente para agrupar.</p>
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
  @media(max-width:1100px), (pointer:coarse) and (max-width:1400px) {
    .cifras { grid-template-columns:1fr; }
  }
</style>
