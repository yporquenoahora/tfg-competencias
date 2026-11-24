<script>
  import { api } from '../lib/api.js';

  export let perfiles = [];
  export let estudiantes = [];
  export let imparticionId;
  export let indicadores = [];
  export let actualizado;

  const colores = ['#96602d', '#89529b', '#287580', '#b23f42', '#5962aa', '#827020'];
  const nombrePerfil = (perfil) => perfil.clave === 'sin-evidencia' ? 'Evidencia insuficiente'
    : perfil.clave === 'sin-dificultad' ? 'Sin dificultad observada' : perfil.indicadores.join(' · ');
  const colorPerfil = (perfil) => perfil.clave === 'sin-evidencia' ? '#746f68'
    : perfil.clave === 'sin-dificultad' ? '#24745b' : colores[
      perfil.clave.split(',').reduce((acumulado, id) => acumulado * 31 + Number(id), 0) % colores.length
    ];

  let seleccion = [];
  let perfilActivo = '';
  let indicadorId = '';
  let nivel = '';
  let observacion = '';
  let confirmar = false;
  let guardando = false;
  let mensaje = '';
  let error = '';
  $: elegidos = estudiantes.filter((alumno) => seleccion.includes(alumno.id));
  $: indicador = indicadores.find((item) => String(item.id) === indicadorId);
  $: perfil = perfiles.find((item) => item.clave === perfilActivo);

  function seleccionarPerfil(item) {
    perfilActivo = item.clave;
    seleccion = item.alumnos.map((alumno) => alumno.id);
    confirmar = false;
    mensaje = '';
  }

  async function guardar() {
    if (guardando || !elegidos.length || !indicador || !nivel) return;
    guardando = true;
    error = '';
    try {
      const resultado = await api('/valoraciones/bloque', {
        method: 'POST',
        body: JSON.stringify({
          imparticionId: Number(imparticionId), estudianteIds: elegidos.map(({ id }) => id),
          indicadorId: Number(indicadorId), nivel: Number(nivel), observacion,
        }),
      });
      confirmar = false;
      seleccion = [];
      perfilActivo = '';
      mensaje = `Se guardaron ${resultado.total} valoraciones individuales.`;
      await actualizado();
    } catch (fallo) {
      error = fallo.message;
    } finally {
      guardando = false;
    }
  }
</script>

<section class="panel">
  <h2>Perfiles de dificultad y valoración en bloque</h2>
  {#if perfiles.length}
    <p>Cada punto es un alumno. Selecciona un perfil para usar sus alumnos como punto de partida.</p>
    <div class="perfiles" aria-label="Gráfica de perfiles de dificultad">
      {#each perfiles as item (item.clave)}
        <button class="perfil secundario" type="button" aria-pressed={perfilActivo === item.clave}
          disabled={guardando} onclick={() => seleccionarPerfil(item)}>
          <strong>{nombrePerfil(item)}</strong>
          <span>{item.alumnos.length} {item.alumnos.length === 1 ? 'alumno' : 'alumnos'}</span>
          <span class="puntos" aria-hidden="true" style:--color-perfil={colorPerfil(item)}>
            {#each item.alumnos as alumno (alumno.id)}<i></i>{/each}
          </span>
        </button>
      {/each}
    </div>
    <p class="nota">Los perfiles reúnen a quienes comparten la misma combinación de indicadores con nivel 1 o 2 en su última observación del periodo. «Evidencia insuficiente» agrupa a quienes no tienen observaciones en ese intervalo.</p>
    {#if perfil}
      <details>
        <summary>Alumnado y cobertura del perfil seleccionado</summary>
        <ul>{#each perfil.alumnos as alumno (alumno.id)}
          <li>{alumno.nombre} · {alumno.observados} indicadores observados</li>
        {/each}</ul>
      </details>
    {/if}
  {/if}

  {#if estudiantes.length && indicadores.length}
    <form class="formulario" onsubmit={(evento) => { evento.preventDefault(); confirmar = true; mensaje = ''; error = ''; }}>
      <fieldset disabled={confirmar || guardando}>
        <legend>Alumnado seleccionado ({elegidos.length})</legend>
        <button type="button" class="secundario" onclick={() => { seleccion = []; perfilActivo = ''; }}>Limpiar selección</button>
        <div class="lista-alumnos">
          {#each estudiantes as alumno (alumno.id)}
            <label><input type="checkbox" value={alumno.id} bind:group={seleccion} /> {alumno.nombre}</label>
          {/each}
        </div>
        <label for="bloque-indicador">Indicador</label>
        <select id="bloque-indicador" value={indicadorId} onchange={(e) => (indicadorId = e.currentTarget.value)} required>
          <option value="">Selecciona un indicador</option>
          {#each indicadores as item (item.id)}<option value={String(item.id)}>{item.descripcion}</option>{/each}
        </select>
        <label for="bloque-nivel">Nivel observado</label>
        <select id="bloque-nivel" value={nivel} onchange={(e) => (nivel = e.currentTarget.value)} required>
          <option value="">Selecciona un nivel</option>
          {#each [1, 2, 3, 4] as valor (valor)}<option value={String(valor)}>{valor}</option>{/each}
        </select>
        <label for="bloque-observacion">Observación común (opcional)</label>
        <textarea id="bloque-observacion" bind:value={observacion} rows="2"></textarea>
      </fieldset>
      {#if confirmar}
        <section class="registro" aria-label="Confirmar valoración">
          <h3>Confirmar {elegidos.length} valoraciones</h3>
          <p>{indicador?.descripcion} · Nivel {nivel}/4</p>
          {#if observacion.trim()}<p>{observacion}</p>{/if}
          <p>Se guardarán con la fecha de hoy para {elegidos.map(({ nombre }) => nombre).join(', ')}.</p>
          <button type="button" onclick={guardar} disabled={guardando}>Guardar valoraciones</button>
          <button type="button" class="secundario" disabled={guardando} onclick={() => (confirmar = false)}>Editar selección</button>
        </section>
      {:else}
        <button disabled={!elegidos.length || !indicador || !nivel}>Revisar valoración en bloque</button>
      {/if}
    </form>
  {:else if estudiantes.length}
    <p>Guarda una configuración de indicadores para este módulo antes de registrar valoraciones en bloque.</p>
  {/if}
  {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  .perfiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; }
  .perfil { text-align: left; display: grid; gap: 7px; align-content: start; }
  .perfil[aria-pressed="true"] { outline: 2px solid #bb602a; }
  .puntos { display: flex; flex-wrap: wrap; gap: 4px; }
  .puntos i { width: 10px; height: 10px; border-radius: 50%; background: var(--color-perfil); }
  fieldset { border: 1px solid #d9bda8; border-radius: 7px; display: grid; gap: 8px; }
  .lista-alumnos { display: grid; gap: 5px; max-height: 145px; overflow: auto; }
  .lista-alumnos input { width: auto; }
</style>
