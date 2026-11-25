<script>
  import { api } from '../lib/api.js';

  export let perfiles = [];
  export let estudiantes = [];
  export let imparticionId;
  export let indicadores = [];
  export let actualizado;

  const nombrePerfil = (perfil) => perfil.clave === 'sin-evidencia' ? 'Evidencia insuficiente'
    : perfil.clave === 'sin-dificultad' ? 'Sin dificultad observada' : perfil.indicadores.join(' · ');
  export let abrir = () => {};
  const tendencias = {
    mejora: ['Mejora', '#28755c'], estable: ['Sin cambio', '#456b98'],
    retroceso: ['Retroceso', '#b74041'], insuficiente: ['Sin comparación', '#746f68'],
  };
  const tendencia = (alumno) => tendencias[alumno.tendencia] ?? tendencias.insuficiente;

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
    <div class="leyenda">
      {#each Object.values(tendencias) as [etiqueta, color] (etiqueta)}
        <span><i style:background={color}></i>{etiqueta}</span>
      {/each}
    </div>
    <div class="perfiles" aria-label="Gráfica de perfiles de dificultad">
      {#each perfiles as item (item.clave)}
        <article class="perfil">
          <strong>{nombrePerfil(item)} · {item.alumnos.length}</strong>
          <div class="puntos">
            {#each item.alumnos as alumno (alumno.id)}
              {@const etiqueta = `${alumno.nombre} · ${tendencia(alumno)[0]} · ${alumno.observados} indicadores observados`}
              <button class="punto" type="button" style:--color-alumno={tendencia(alumno)[1]}
                aria-label={etiqueta} onclick={() => abrir(alumno.id)}>
                <span aria-hidden="true">{etiqueta}</span>
              </button>
            {/each}
          </div>
          <button class="secundario" type="button" aria-pressed={perfilActivo === item.clave}
            disabled={guardando || confirmar} onclick={() => seleccionarPerfil(item)}>Seleccionar perfil</button>
        </article>
      {/each}
    </div>
    <p class="nota">Los perfiles agrupan dificultades compartidas. El color compara las dos últimas valoraciones de los mismos indicadores y resume el cambio neto del alumno.</p>
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
  .perfil button[aria-pressed="true"] { outline: 2px solid #bb602a; }
  .puntos { display: flex; flex-wrap: wrap; gap: 4px; }
  .perfil { border: 1px solid #e5d8cb; padding: 8px; border-radius: 8px; }
  .leyenda, .leyenda span { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .leyenda { margin-bottom:10px; font-size:.85rem; }
  .leyenda i { width:10px; height:10px; border-radius:50%; }
  .punto { position:relative; width:24px; height:24px; padding:0; background:transparent; }
  .punto::before { content:''; display:block; margin:auto; width:13px; height:13px; border-radius:50%; background:var(--color-alumno); }
  .punto span { display:none; pointer-events:none; position:absolute; z-index:4; left:0; bottom:100%; width:max-content; max-width:210px; white-space:normal; background:#2b2421; color:white; border-radius:5px; padding:6px 8px; }
  .punto:hover span, .punto:focus-visible span { display:block; }
  fieldset { border: 1px solid #d9bda8; border-radius: 7px; display: grid; gap: 8px; }
  .lista-alumnos { display: grid; gap: 5px; max-height: 145px; overflow: auto; }
  .lista-alumnos input { width: auto; }
</style>
