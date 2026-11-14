
<script>
  import { onMount } from 'svelte';

  const API_URL = 'http://localhost:3000/api/competencias';

  let competencias = [];
  let seleccionados = [];
  let expandidas = [];
  let cargando = true;
  let error = '';

  
const API_CONFIGURACIONES = 'http://localhost:3000/api/configuraciones';

let configuraciones = [];
let nombreConfiguracion = '';
let descripcionConfiguracion = '';
let configuracionElegida = '';
let guardandoConfiguracion = false;
let mensajeConfiguracion = '';
let errorConfiguracion = '';


  onMount(() => {
  cargarCompetencias();
  cargarConfiguraciones();
});

  
async function guardarConfiguracion() {
  errorConfiguracion = '';
  mensajeConfiguracion = '';

  if (!nombreConfiguracion.trim()) {
    errorConfiguracion = 'Introduce un nombre para la configuración';
    return;
  }

  if (seleccionados.length === 0) {
    errorConfiguracion = 'Selecciona al menos un indicador';
    return;
  }

  guardandoConfiguracion = true;

  try {
    const respuesta = await fetch(API_CONFIGURACIONES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: nombreConfiguracion.trim(),
        descripcion: descripcionConfiguracion.trim(),
        indicadorIds: seleccionados
      })
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      throw new Error(datos.error ?? 'No se pudo guardar');
    }

    const nuevaConfiguracion = await respuesta.json();

    await cargarConfiguraciones();

    configuracionElegida = String(nuevaConfiguracion.id);
    mensajeConfiguracion = 'Configuración guardada correctamente';
  } catch (err) {
    errorConfiguracion = err.message;
  } finally {
    guardandoConfiguracion = false;
  }
}

async function cargarConfiguraciones() {
  try {
    const respuesta = await fetch(API_CONFIGURACIONES);

    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar las configuraciones');
    }

    configuraciones = await respuesta.json();
  } catch (err) {
    errorConfiguracion = err.message;
  }
}

function recuperarConfiguracion() {
  const configuracion = configuraciones.find(
    item => item.id === Number(configuracionElegida)
  );

  if (!configuracion) return;

  seleccionados = configuracion.indicadores.map(
    item => item.indicadorId
  );

  nombreConfiguracion = configuracion.nombre;
  descripcionConfiguracion = configuracion.descripcion ?? '';

  // Desplegar las competencias que contienen indicadores seleccionados.
  expandidas = competencias
    .filter(competencia =>
      obtenerIndicadores(competencia).some(
        indicador => seleccionados.includes(indicador.id)
      )
    )
    .map(competencia => competencia.id);

  mensajeConfiguracion = 'Configuración recuperada correctamente';
  errorConfiguracion = '';
}


  async function cargarCompetencias() {
    cargando = true;
    error = '';

    try {
      const respuesta = await fetch(API_URL);

      if (!respuesta.ok) {
        throw new Error('No se pudieron cargar las competencias');
      }

      const datos = await respuesta.json();
      competencias = datos;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error desconocido';
    } finally {
      cargando = false;
    }
  }

  function obtenerIndicadores(competencia) {
    return (competencia.dimensiones ?? [])
      .flatMap(dimension => dimension.indicadores ?? []);
  }

  function estaSeleccionado(id) {
    return seleccionados.includes(id);
  }

  function cambiarIndicador(id) {
    seleccionados = estaSeleccionado(id)
      ? seleccionados.filter(item => item !== id)
      : [...seleccionados, id];
  }

  function cambiarCompetencia(competencia) {
    const ids = obtenerIndicadores(competencia).map(i => i.id);

    if (ids.length === 0) return;

    const todosSeleccionados = ids.every(id => estaSeleccionado(id));

    seleccionados = todosSeleccionados
      ? seleccionados.filter(id => !ids.includes(id))
      : [...new Set([...seleccionados, ...ids])];
  }

  function cambiarExpansion(id) {
    expandidas = expandidas.includes(id)
      ? expandidas.filter(item => item !== id)
      : [...expandidas, id];
  }

  function limpiarSeleccion() {
    seleccionados = [];
  }

$: competenciasActivas = competencias.filter(competencia =>
  obtenerIndicadores(competencia)
    .some(indicador => seleccionados.includes(indicador.id))
);

  $: totalIndicadores = competencias.reduce(
    (total, competencia) =>
      total + obtenerIndicadores(competencia).length,
    0
  );
</script>

<svelte:head>
  <title>Configuración docente | Competencias transversales</title>
  <meta
    name="description"
    content="Selección de competencias e indicadores para Formación Profesional"
  />
</svelte:head>

<main class="contenedor">
  <header>
    <span class="etiqueta">TFE · FORMACIÓN PROFESIONAL</span>
    <h1>Configuración del seguimiento</h1>
    <p>
      Selecciona las competencias transversales y los indicadores
      que deseas observar en tu módulo profesional.
    </p>
  </header>

  <div class="resumen">
    <div>
      <span>Competencias seleccionadas</span>
      <strong>{competenciasActivas.length}</strong>
    </div>
    <div>
      <span>Indicadores seleccionados</span>
      <strong>{seleccionados.length}</strong>
    </div>
    <div>
      <span>Indicadores disponibles</span>
      <strong>{totalIndicadores}</strong>
    </div>
  </div>

  <section class="panel">
    <div class="cabecera-panel">
      <div>
        <h2>Catálogo de competencias</h2>
        <p>Selecciona una competencia completa o sus indicadores.</p>
      </div>

      <button
        class="secundario"
        onclick={limpiarSeleccion}
        disabled={seleccionados.length === 0}
      >
        Limpiar selección
      </button>
    </div>

    {#if cargando}
      <p>Cargando catálogo...</p>
    {:else if error}
      <p class="error" role="alert">{error}</p>
      <button onclick={cargarCompetencias}>Reintentar</button>
    {:else if competencias.length === 0}
      <p>No hay competencias registradas.</p>
    {:else}
      <div class="lista">
        {#each competencias as competencia (competencia.id)}
          {@const indicadores = obtenerIndicadores(competencia)}
          {@const seleccionadosCompetencia = indicadores.filter(
            i => estaSeleccionado(i.id)
          ).length}

          <article class="competencia">
            <div class="cabecera-competencia">
              <div>
                <h3>{competencia.nombre}</h3>

                {#if competencia.descripcion}
                  <p>{competencia.descripcion}</p>
                {/if}

                <small>
                  Fuente:
                  {competencia.fuente?.nombre ?? 'Sin especificar'}
                </small>
              </div>

              <span class="contador">
                {seleccionadosCompetencia}/{indicadores.length}
              </span>
            </div>

            <div class="acciones">
              <button
                class="secundario"
                onclick={() => cambiarExpansion(competencia.id)}
                aria-expanded={expandidas.includes(competencia.id)}
              >
                {expandidas.includes(competencia.id)
                  ? 'Ocultar indicadores'
                  : 'Ver dimensiones e indicadores'}
              </button>

              <button
                onclick={() => cambiarCompetencia(competencia)}
                disabled={indicadores.length === 0}
              >
                {indicadores.length > 0 &&
                 seleccionadosCompetencia === indicadores.length
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>

            {#if expandidas.includes(competencia.id)}
              <div class="dimensiones">
                {#each competencia.dimensiones ?? [] as dimension (dimension.id)}
                  <div class="dimension">
                    <h4>{dimension.nombre}</h4>

                    {#if dimension.descripcion}
                      <p>{dimension.descripcion}</p>
                    {/if}

                    {#each dimension.indicadores ?? [] as indicador (indicador.id)}
                      <label class="indicador">
                        <input
                          type="checkbox"
                          checked={estaSeleccionado(indicador.id)}
                          onchange={() => cambiarIndicador(indicador.id)}
                        />
                        <span>{indicador.descripcion}</span>
                      </label>
                    {/each}
                  </div>
                {/each}

                {#if competencia.dimensiones?.length === 0}
                  <p>Esta competencia todavía no tiene dimensiones.</p>
                {/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <h2>Resumen de configuración</h2>

    {#if seleccionados.length === 0}
      <p>No has seleccionado ningún indicador.</p>
    {:else}
      {#each competenciasActivas as competencia (competencia.id)}
        <div class="resumen-competencia">
          <h3>{competencia.nombre}</h3>

          {#each competencia.dimensiones ?? [] as dimension (dimension.id)}
            {@const activos = (dimension.indicadores ?? [])
              .filter(indicador => estaSeleccionado(indicador.id))}

            {#if activos.length > 0}
              <h4>{dimension.nombre}</h4>
              <ul>
                {#each activos as indicador (indicador.id)}
                  <li>{indicador.descripcion}</li>
                {/each}
              </ul>
            {/if}
          {/each}
        </div>
      {/each}
    {/if}

    <p class="aviso">
      Configuración provisional: la selección todavía no se
      almacena en la base de datos.
    </p>
  </section>
  
<section class="panel">
  <h2>Guardar y recuperar configuraciones</h2>

  <p>
    Guarda los indicadores seleccionados para utilizarlos
    posteriormente en el seguimiento del alumnado.
  </p>

  <div class="formulario-configuracion">
    <label for="nombre-configuracion">
      Nombre de la configuración
    </label>

    <input
      id="nombre-configuracion"
      type="text"
      bind:value={nombreConfiguracion}
      placeholder="Ejemplo: Lenguajes de Marcas - Grupo A"
    />

    <label for="descripcion-configuracion">
      Descripción
    </label>

    <textarea
      id="descripcion-configuracion"
      bind:value={descripcionConfiguracion}
      rows="3"
      placeholder="Objetivos del seguimiento"
    ></textarea>

    <button
      onclick={guardarConfiguracion}
      disabled={guardandoConfiguracion}
    >
      {guardandoConfiguracion
        ? 'Guardando...'
        : 'Guardar nueva configuración'}
    </button>
  </div>

  <div class="recuperar-configuracion">
    <h3>Configuraciones guardadas</h3>

    <label for="configuracion-guardada">
      Seleccionar configuración
    </label>

    <select
      id="configuracion-guardada"
      bind:value={configuracionElegida}
    >
      <option value="">Selecciona una configuración</option>

      {#each configuraciones as configuracion (configuracion.id)}
        <option value={String(configuracion.id)}>
          {configuracion.nombre}
          ({configuracion.indicadores.length} indicadores)
        </option>
      {/each}
    </select>

    <button
      class="secundario"
      onclick={recuperarConfiguracion}
      disabled={!configuracionElegida}
    >
      Cargar configuración
    </button>
  </div>

  {#if mensajeConfiguracion}
    <p class="mensaje-exito" role="status">
      {mensajeConfiguracion}
    </p>
  {/if}

  {#if errorConfiguracion}
    <p class="error" role="alert">
      {errorConfiguracion}
    </p>
  {/if}
</section>

</main>

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: #f3f5f9;
    color: #243247;
  }

  .contenedor {
    max-width: 1050px;
    margin: auto;
    padding: 32px 20px 70px;
  }

  header { margin-bottom: 28px; }

  .etiqueta {
    color: #205493;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  h1 { font-size: 32px; margin: 10px 0; color: #17365d; }
  h2 { margin: 0 0 8px; color: #17365d; }
  h3 { margin: 0 0 8px; color: #205493; }
  h4 { margin: 12px 0; }

  p { line-height: 1.5; color: #526174; }

  .resumen {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 24px;
  }

  .resumen > div {
    background: white;
    border: 1px solid #dfe5ed;
    border-radius: 12px;
    padding: 18px;
  }

  .resumen span {
    display: block;
    font-size: 13px;
    color: #526174;
  }

  .resumen strong {
    display: block;
    font-size: 30px;
    color: #17365d;
    margin-top: 8px;
  }

  .panel {
    background: white;
    border: 1px solid #dfe5ed;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .cabecera-panel,
  .cabecera-competencia,
  .acciones {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }

  .lista { display: grid; gap: 16px; margin-top: 24px; }

  .competencia {
    padding: 20px;
    border: 1px solid #dfe5ed;
    border-radius: 10px;
    background: #fafbfd;
  }

  .competencia p { margin: 5px 0 10px; }
  small { color: #65758a; }

  .contador {
    background: #e5eef8;
    color: #205493;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 700;
  }

  .acciones { justify-content: flex-start; margin-top: 18px; }

  button {
    border: 0;
    border-radius: 7px;
    background: #205493;
    color: white;
    padding: 10px 15px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  button.secundario {
    background: white;
    border: 1px solid #b9c9da;
    color: #205493;
  }

  button:disabled { opacity: .5; cursor: not-allowed; }

  .dimensiones {
    border-top: 1px solid #dfe5ed;
    margin-top: 20px;
    padding-top: 8px;
  }

  .dimension {
    margin-top: 15px;
    padding: 12px 16px;
    background: white;
    border-radius: 8px;
  }

  .indicador {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    cursor: pointer;
    font-size: 14px;
  }

  .indicador input { margin-top: 3px; accent-color: #205493; }

  .resumen-competencia {
    border-bottom: 1px solid #dfe5ed;
    padding: 14px 0;
  }

  .resumen-competencia li { margin: 7px 0; }

  .aviso {
    font-size: 13px;
    margin-top: 20px;
    padding: 12px;
    background: #fff7e8;
    border-radius: 6px;
  }

  .error { color: #b42318; }

  @media (max-width: 650px) {
    .resumen { grid-template-columns: 1fr; }
    .contenedor { padding: 20px 12px; }
    .panel { padding: 16px; }
  }
  
.formulario-configuracion,
.recuperar-configuracion {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 20px;
}

.formulario-configuracion input,
.formulario-configuracion textarea,
.recuperar-configuracion select {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #b9c9da;
  border-radius: 7px;
  font: inherit;
  background: white;
  color: #243247;
}

.formulario-configuracion label,
.recuperar-configuracion label {
  font-weight: 600;
}

.recuperar-configuracion {
  border-top: 1px solid #dfe5ed;
  padding-top: 20px;
  margin-top: 28px;
}

.mensaje-exito {
  color: #17653b;
  font-weight: 600;
}

</style>
