<script>
  import { api } from '../lib/api.js';
  export let grupo;
  export let imparticion;
  export let actualizar;
  let nombreGrupo = '';
  let nombreImparticion = '';
  let ocupado = false;
  let mensaje = '';
  let error = '';
  $: nombreGrupo = grupo.nombre;
  $: nombreImparticion = imparticion?.nombreModulo ?? '';

  async function guardar(ruta, id, nombre) {
    if (ocupado) return;
    ocupado = true;
    mensaje = '';
    error = '';
    try {
      await api(`/${ruta}/${id}/nombre`, {
        method: 'PATCH', body: JSON.stringify({ nombre }),
      });
      await actualizar();
      mensaje = 'Nombre actualizado.';
    } catch (fallo) {
      error = fallo.message;
    } finally {
      ocupado = false;
    }
  }
</script>

<section class="panel">
  <h2>Datos de grupo y módulo</h2>
  <p>{grupo.ciclo} · {grupo.curso}</p>
  <form class="revision-periodo" onsubmit={(e) => { e.preventDefault(); guardar('grupos', grupo.id, nombreGrupo); }}>
    <label>Nombre visible del grupo <input bind:value={nombreGrupo} required maxlength="150" /></label>
    <button disabled={ocupado || !nombreGrupo.trim() || nombreGrupo.trim() === grupo.nombre}>Guardar grupo</button>
  </form>
  {#if imparticion}
    <form class="revision-periodo" onsubmit={(e) => { e.preventDefault(); guardar('imparticiones', imparticion.id, nombreImparticion); }}>
      <label>Nombre visible del módulo en este grupo <input bind:value={nombreImparticion} required maxlength="150" /></label>
      <button disabled={ocupado || !nombreImparticion.trim() || nombreImparticion.trim() === imparticion.nombreModulo}>Guardar módulo</button>
    </form>
  {/if}
  {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  form + form { margin-top: 14px; }
</style>
