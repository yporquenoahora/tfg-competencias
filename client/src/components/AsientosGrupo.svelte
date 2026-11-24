<script>
  import { leerCsvEstudiantes } from '../lib/csvEstudiantes.js';
  import { api } from '../lib/api.js';
  export let grupo;
  export let estudiantes = [];
  export let grupos = [];
  export let ultimoLote = [];
  export let abrir;
  export let actualizar;

  const acciones = {
    trasladar: 'Trasladar a otro grupo', baja: 'Dar de baja',
    retirar: 'Retirar matrícula creada por error', reactivar: 'Reactivar matrícula',
  };
  let accion = 'trasladar';
  let verBajas = false;
  let nombre = '';
  let filtro = '';

  let seleccion = [];
  let destino = '';
  let enfocado = null;
  let confirmar = false;
  let guardando = false;
  let error = '';
  let mensaje = '';

  $: alumnado = verBajas ? (grupo.bajas ?? []) : estudiantes;
  $: visibles = alumnado.filter((alumno) =>
    `${alumno.nombre} ${alumno.codigo}`.toLocaleLowerCase('es').includes(filtro.trim().toLocaleLowerCase('es')));
  $: elegidos = alumnado.filter((alumno) => seleccion.includes(alumno.id));
  $: destinos = grupos.filter((item) => item.id !== grupo.id && item.curso === grupo.curso);
  $: grupoDestino = destinos.find((item) => String(item.id) === destino);
  $: alumnoActivo = alumnado.find((alumno) => alumno.id === enfocado);

  async function seleccionarCsv(evento) {
    const campo = evento.currentTarget;
    const archivo = campo.files?.[0];
    if (!archivo) return;
    error = '';
    mensaje = '';
    try {
      const codigos = new Set(leerCsvEstudiantes(await archivo.text()).map(({ codigo }) => codigo));
      if (confirmar || guardando) return;
      seleccion = alumnado.filter((alumno) => codigos.has(alumno.codigo)).map(({ id }) => id);
      mensaje = `${seleccion.length} de ${codigos.size} códigos del CSV coinciden con el grupo.`;
    } catch (fallo) {
      error = fallo.message;
    } finally {
      campo.value = '';
    }
  }

  function cambiarLista() {
    verBajas = !verBajas;
    seleccion = [];
    enfocado = null;
    accion = verBajas ? 'reactivar' : 'trasladar';
    mensaje = '';
    error = '';
  }

  async function guardarNombre(evento) {
    evento.preventDefault();
    if (!alumnoActivo || !nombre.trim() || guardando) return;
    guardando = true;
    error = '';
    mensaje = '';
    try {
      await api(`/grupos/${grupo.id}/estudiantes/${alumnoActivo.id}/nombre`, {
        method: 'PATCH', body: JSON.stringify({ nombre }),
      });
      mensaje = 'Nombre visible actualizado.';
      await actualizar();
    } catch (fallo) {
      error = fallo.message;
    } finally {
      guardando = false;
    }
  }

  async function aplicarAccion() {
    if (guardando || !elegidos.length || (accion === 'trasladar' && !grupoDestino)) return;
    guardando = true;
    error = '';
    mensaje = '';
    try {
      const estudianteIds = elegidos.map(({ id }) => id);
      const traslado = accion === 'trasladar';
      const resultado = await api(`/grupos/${grupo.id}/estudiantes/${traslado ? 'trasladar' : 'matriculas'}`, {
        method: 'POST',
        body: JSON.stringify(traslado ? { destino: grupoDestino.id, estudianteIds } : { accion, estudianteIds }),
      });
      confirmar = false;
      seleccion = [];
      mensaje = traslado ? `${resultado.total} matrículas corregidas. ${resultado.nuevasEnDestino} añadidas al destino y ${resultado.yaEnDestino} ya existentes allí.` : `Matrículas actualizadas: ${resultado.total}.`;
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
  <button type="button" class="secundario" disabled={guardando || confirmar}
    onclick={cambiarLista}>{verBajas ? 'Ver matrículas activas' : `Ver bajas (${grupo.bajas?.length ?? 0})`}</button>
  {#if alumnado.length}
    <div class="revision-periodo">
      <label>Buscar por nombre o código <input type="search" bind:value={filtro} /></label>
      <button type="button" class="secundario" disabled={confirmar || guardando || !visibles.length}
        onclick={() => (seleccion = [...new Set([...seleccion, ...visibles.map(({ id }) => id)])])}>Seleccionar visibles</button>
      {#if !verBajas && estudiantes.some((alumno) => ultimoLote.includes(alumno.id))}
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
            onclick={() => { enfocado = alumno.id; nombre = alumno.nombre; }}>Ficha</button>
        </div>
      {:else}<p>No hay coincidencias.</p>{/each}
    </div>

    {#if alumnoActivo}
      <div class="registro">
        <strong>{alumnoActivo.nombre}</strong> · {alumnoActivo.codigo}
        {#if !verBajas}
          <button type="button" class="secundario" onclick={() => abrir(alumnoActivo.id)}>Abrir seguimiento individual</button>
        {:else}
          <p>Baja: {new Date(alumnoActivo.fechaBaja).toLocaleDateString('es-ES')}</p>
        {/if}
        <form class="formulario" onsubmit={guardarNombre}>
          <label for="nombre-visible-alumno">Nombre visible en todos sus grupos</label>
          <input id="nombre-visible-alumno" bind:value={nombre} required maxlength="150" disabled={confirmar || guardando} />
          <button disabled={confirmar || guardando || !nombre.trim() || nombre.trim() === alumnoActivo.nombre}>Guardar nombre</button>
        </form>
      </div>
    {/if}

    <form class="revision-periodo traslado" onsubmit={(e) => { e.preventDefault(); confirmar = true; error = ''; mensaje = ''; }}>
      <strong>{elegidos.length} seleccionados</strong>
      <label>Acción
        <select value={accion} onchange={(e) => (accion = e.currentTarget.value)} disabled={confirmar || guardando}>
          {#each (verBajas ? ['reactivar', 'retirar'] : ['trasladar', 'baja', 'retirar']) as clave (clave)}
            <option value={clave}>{acciones[clave]}</option>
          {/each}
        </select>
      </label>
      {#if accion === 'trasladar'}
      <label>Trasladar al grupo
        <select value={destino} onchange={(e) => (destino = e.currentTarget.value)} disabled={confirmar || guardando} required>
          <option value="">Selecciona un destino</option>
          {#each destinos as item (item.id)}<option value={String(item.id)}>{item.nombre}</option>{/each}
        </select>
      </label>
      {/if}
      <button disabled={(accion === 'trasladar' && !grupoDestino) || !elegidos.length || confirmar || guardando}>Revisar acción</button>
    </form>
    {#if confirmar}
      <div class="registro">
        <h3>{acciones[accion]} · {grupo.nombre}</h3>
        {#if accion === 'trasladar'}<p>Destino: {grupoDestino?.nombre}</p>{/if}
        {#if accion === 'baja'}<p>La matrícula dejará de estar activa. El historial se conserva.</p>{/if}
        {#if accion === 'retirar'}<p>Se retirará la matrícula de este grupo si no tiene ningún registro de seguimiento asociado.</p>{/if}
        <ul>{#each elegidos as alumno (alumno.id)}<li>{alumno.nombre} · {alumno.codigo}</li>{/each}</ul>
        <button type="button" disabled={guardando} onclick={aplicarAccion}>Confirmar acción</button>
        <button type="button" class="secundario" disabled={guardando} onclick={() => (confirmar = false)}>Volver a la selección</button>
      </div>
    {/if}
  {:else}
    <p>{verBajas ? 'Este grupo no tiene matrículas de baja.' : 'Importa un CSV para ver el alumnado de este grupo.'}</p>
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
