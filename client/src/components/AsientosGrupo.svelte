<script>
  import { leerCsvEstudiantes } from '../lib/csvEstudiantes.js';
  import { api } from '../lib/api.js';
  export let grupo;
  export let estudiantes = [];
  export let grupos = [];
  export let ultimoLote = [];
  export let abrir;
  export let actualizar;

  let filtro = '';
  let seleccion = [];
  let destino = '';
  let enfocado = null;
  let confirmar = false;
  let guardando = false;
  let error = '';
  let mensaje = '';

  $: visibles = estudiantes.filter((alumno) =>
    `${alumno.nombre} ${alumno.codigo}`.toLocaleLowerCase('es').includes(filtro.trim().toLocaleLowerCase('es')));
  $: elegidos = estudiantes.filter((alumno) => seleccion.includes(alumno.id));
  $: destinos = grupos.filter((item) => item.id !== grupo.id && item.curso === grupo.curso);
  $: grupoDestino = destinos.find((item) => String(item.id) === destino);
  $: alumnoActivo = estudiantes.find((alumno) => alumno.id === enfocado);

  async function seleccionarCsv(evento) {
    const campo = evento.currentTarget;
    const archivo = campo.files?.[0];
    if (!archivo) return;
    error = '';
    mensaje = '';
    try {
      const codigos = new Set(leerCsvEstudiantes(await archivo.text()).map(({ codigo }) => codigo));
      if (confirmar || guardando) return;
      seleccion = estudiantes.filter((alumno) => codigos.has(alumno.codigo)).map(({ id }) => id);
      mensaje = `${seleccion.length} de ${codigos.size} códigos del CSV coinciden con el grupo.`;
    } catch (fallo) {
      error = fallo.message;
    } finally {
      campo.value = '';
    }
  }

  async function trasladar() {
    if (guardando || !elegidos.length || !grupoDestino) return;
    guardando = true;
    error = '';
    mensaje = '';
    try {
      const resultado = await api(`/grupos/${grupo.id}/estudiantes/trasladar`, {
        method: 'POST',
        body: JSON.stringify({ destino: grupoDestino.id, estudianteIds: elegidos.map(({ id }) => id) }),
      });
      confirmar = false;
      seleccion = [];
      mensaje = `${resultado.total} matrículas corregidas. ${resultado.nuevasEnDestino} añadidas al destino y ${resultado.yaEnDestino} ya existentes allí.`;
      await actualizar();
    } catch (fallo) {
      error = fallo.message;
    } finally {
      guardando = false;
    }
  }
</script>

<section class="panel">
  <h2>Mapa del aula</h2>
  {#if estudiantes.length}
    <div class="revision-periodo">
      <label>Buscar por nombre o código <input type="search" bind:value={filtro} /></label>
      <button type="button" class="secundario" disabled={confirmar || guardando || !visibles.length}
        onclick={() => (seleccion = [...new Set([...seleccion, ...visibles.map(({ id }) => id)])])}>Seleccionar visibles</button>
      {#if estudiantes.some((alumno) => ultimoLote.includes(alumno.id))}
        <button type="button" class="secundario" disabled={confirmar || guardando}
          onclick={() => (seleccion = [...ultimoLote])}>Seleccionar última importación</button>
      {/if}
      <button type="button" class="secundario" disabled={confirmar || guardando || !elegidos.length}
        onclick={() => (seleccion = [])}>Limpiar selección</button>
    </div>

    <label class="seleccion-csv">Seleccionar desde un CSV ya importado
      <input type="file" accept=".csv,text/csv" disabled={confirmar || guardando} onchange={seleccionarCsv} />
    </label>

    <div class="asientos" aria-label="Asientos del grupo">
      {#each visibles as alumno (alumno.id)}
        <div class="asiento" class:seleccionado={seleccion.includes(alumno.id)}>
          <label title={`${alumno.nombre} · ${alumno.codigo}`}>
            <input type="checkbox" value={alumno.id} bind:group={seleccion} disabled={confirmar || guardando} />
            <strong>{alumno.nombre}</strong>
            <small>{alumno.codigo}</small>
          </label>
          <button type="button" class="secundario ficha" aria-label={`Ver ficha de ${alumno.nombre} (${alumno.codigo})`}
            onclick={() => (enfocado = alumno.id)}>Ficha</button>
        </div>
      {:else}<p>No hay coincidencias.</p>{/each}
    </div>

    {#if alumnoActivo}
      <div class="registro">
        <strong>{alumnoActivo.nombre}</strong> · {alumnoActivo.codigo}
        <button type="button" class="secundario" onclick={() => abrir(alumnoActivo.id)}>Abrir seguimiento individual</button>
      </div>
    {/if}

    <form class="revision-periodo traslado" onsubmit={(e) => { e.preventDefault(); confirmar = true; error = ''; mensaje = ''; }}>
      <strong>{elegidos.length} seleccionados</strong>
      <label>Trasladar al grupo
        <select value={destino} onchange={(e) => (destino = e.currentTarget.value)} disabled={confirmar || guardando} required>
          <option value="">Selecciona un destino</option>
          {#each destinos as item (item.id)}<option value={String(item.id)}>{item.nombre}</option>{/each}
        </select>
      </label>
      <button disabled={!grupoDestino || !elegidos.length || confirmar || guardando}>Revisar traslado</button>
    </form>
    {#if confirmar}
      <div class="registro">
        <h3>Trasladar de {grupo.nombre} a {grupoDestino?.nombre}</h3>
        <ul>{#each elegidos as alumno (alumno.id)}<li>{alumno.nombre} · {alumno.codigo}</li>{/each}</ul>
        <button type="button" disabled={guardando} onclick={trasladar}>Confirmar traslado</button>
        <button type="button" class="secundario" disabled={guardando} onclick={() => (confirmar = false)}>Volver a la selección</button>
      </div>
    {/if}
  {:else}
    <p>Importa un CSV para ver el alumnado de este grupo.</p>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}
</section>

<style>
  .asientos { display:grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 145px), 1fr)); gap:8px; margin-block:16px; max-height:360px; overflow:auto; padding:3px; }
  .asiento { padding:8px; border:1px solid #e6dbd2; border-radius:8px; min-width:0; }
  .asiento:hover, .asiento:focus-within, .asiento.seleccionado { border-color:#a85026; background:#fff3e8; }
  .asiento label { display:grid; grid-template-columns:auto minmax(0, 1fr); gap:5px; align-items:start; cursor:pointer; }
  .asiento small { grid-column:2; overflow-wrap:anywhere; }
  .asiento strong { overflow-wrap:anywhere; font-size:.9rem; }
  .ficha { margin-top:6px; padding:3px 8px; }
  .seleccion-csv { display: grid; gap: 5px; margin-top: 10px; }
  .traslado { margin-top:16px; }
</style>
