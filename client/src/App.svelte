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

  const API_GRUPOS = 'http://localhost:3000/api/grupos';

  let grupoSeguimiento = null;
  let estudiantes = [];
  let imparticiones = [];
  let estudianteElegido = '';
  let imparticionElegida = '';
  let cargandoGrupo = false;
  let errorGrupo = '';

  
let seguimientoGrupal = null;
let cargandoSeguimiento = false;
let errorSeguimiento = '';


let indicadorGrafico = '';

$: indicadoresHistorial = [...new Map(
  historial
    .filter(v => v.imparticionId === Number(imparticionElegida))
    .map(v => [v.indicadorId, {
      id: v.indicadorId,
      descripcion: v.indicador.descripcion
    }])
).values()];

$: valoracionesGrafico = historial
  .filter(v =>
    v.imparticionId === Number(imparticionElegida) &&
    v.indicadorId === Number(indicadorGrafico)
  )
  .sort((a, b) =>
    new Date(a.fecha) - new Date(b.fecha) || a.id - b.id
  );

const ANCHO = 680;
const ALTO = 260;
const MARGEN = { izquierda: 48, derecha: 24, arriba: 20, abajo: 45 };

function puntoX(indice, total) {
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;

  return total <= 1
    ? MARGEN.izquierda + anchoUtil / 2
    : MARGEN.izquierda + indice * anchoUtil / (total - 1);
}

function puntoY(nivel) {
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;

  return MARGEN.arriba + (4 - nivel) * altoUtil / 3;
}

$: puntosGrafico = valoracionesGrafico.map((v, indice) => ({
  ...v,
  x: puntoX(indice, valoracionesGrafico.length),
  y: puntoY(v.nivel)
}));

$: trazadoGrafico = puntosGrafico
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
  .join(' ');


async function cargarSeguimientoGrupal(imparticionId) {
  seguimientoGrupal = null;
  errorSeguimiento = '';

  if (!imparticionId) return;

  cargandoSeguimiento = true;

  try {
    const respuesta = await fetch(
      `http://localhost:3000/api/imparticiones/${imparticionId}/seguimiento`
    );

    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el seguimiento grupal');
    }

    const datos = await respuesta.json();

    if (String(imparticionElegida) === String(imparticionId)) {
      seguimientoGrupal = datos;
    }
  } catch (err) {
    if (String(imparticionElegida) === String(imparticionId)) {
      errorSeguimiento = err.message;
    }
  } finally {
    cargandoSeguimiento = false;
  }
}


  async function cargarGrupoSeguimiento(grupoId = 1) {
    cargandoGrupo = true;
    errorGrupo = '';

    try {
      const respuesta = await fetch(`${API_GRUPOS}/${grupoId}/estudiantes`);

      if (!respuesta.ok) {
        throw new Error('No se pudo cargar el grupo');
      }

      const datos = await respuesta.json();

      grupoSeguimiento = datos;
      estudiantes = datos.estudiantes ?? [];
      imparticiones = datos.imparticiones ?? [];

      estudianteElegido = estudiantes.length ? String(estudiantes[0].id) : '';

      imparticionElegida = imparticiones.length
        ? String(imparticiones[0].id)
        : '';
      await cargarHistorial(estudianteElegido);
      await cargarSeguimientoGrupal(imparticionElegida);
    } catch (err) {
      errorGrupo = err.message;
    } finally {
      cargandoGrupo = false;
    }
  }

  onMount(() => {
    cargarCompetencias();
    cargarConfiguraciones();
    cargarGrupoSeguimiento();
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreConfiguracion.trim(),
          descripcion: descripcionConfiguracion.trim(),
          indicadorIds: seleccionados,
        }),
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
      (item) => item.id === Number(configuracionElegida),
    );

    if (!configuracion) return;

    seleccionados = configuracion.indicadores.map((item) => item.indicadorId);

    nombreConfiguracion = configuracion.nombre;
    descripcionConfiguracion = configuracion.descripcion ?? '';

    // Desplegar las competencias que contienen indicadores seleccionados.
    expandidas = competencias
      .filter((competencia) =>
        obtenerIndicadores(competencia).some((indicador) =>
          seleccionados.includes(indicador.id),
        ),
      )
      .map((competencia) => competencia.id);

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
    return (competencia.dimensiones ?? []).flatMap(
      (dimension) => dimension.indicadores ?? [],
    );
  }

  function estaSeleccionado(id) {
    return seleccionados.includes(id);
  }

  function cambiarIndicador(id) {
    seleccionados = estaSeleccionado(id)
      ? seleccionados.filter((item) => item !== id)
      : [...seleccionados, id];
  }

  function cambiarCompetencia(competencia) {
    const ids = obtenerIndicadores(competencia).map((i) => i.id);

    if (ids.length === 0) return;

    const todosSeleccionados = ids.every((id) => estaSeleccionado(id));

    seleccionados = todosSeleccionados
      ? seleccionados.filter((id) => !ids.includes(id))
      : [...new Set([...seleccionados, ...ids])];
  }

  function cambiarExpansion(id) {
    expandidas = expandidas.includes(id)
      ? expandidas.filter((item) => item !== id)
      : [...expandidas, id];
  }

  function limpiarSeleccion() {
    seleccionados = [];
  }

  $: competenciasActivas = competencias.filter((competencia) =>
    obtenerIndicadores(competencia).some((indicador) =>
      seleccionados.includes(indicador.id),
    ),
  );

  $: totalIndicadores = competencias.reduce(
    (total, competencia) => total + obtenerIndicadores(competencia).length,
    0,
  );

  const API_BASE = 'http://localhost:3000/api';

  let indicadorValoracion = '';
  let nivelValoracion = '';
  let observacionValoracion = '';
  let historial = [];
  let guardandoValoracion = false;
  let cargandoHistorial = false;
  let mensajeValoracion = '';
  let errorValoracion = '';

  $: indicadoresEvaluables = competencias
    .flatMap((competencia) => obtenerIndicadores(competencia))
    .filter((indicador) => seleccionados.includes(indicador.id));

  $: if (
    indicadorValoracion &&
    !indicadoresEvaluables.some(
      (indicador) => indicador.id === Number(indicadorValoracion),
    )
  ) {
    indicadorValoracion = '';
  }

  async function cargarHistorial(estudianteId) {
    historial = [];
    errorValoracion = '';

    if (!estudianteId) return;

    cargandoHistorial = true;

    try {
      const respuesta = await fetch(
        `${API_BASE}/estudiantes/${estudianteId}/valoraciones`,
      );

      if (!respuesta.ok) {
        throw new Error('No se pudo consultar el historial');
      }

      const datos = await respuesta.json();

      // Evita mostrar datos de otro estudiante si se cambia
      // la selección mientras la petición está en curso.
      if (String(estudianteElegido) === String(estudianteId)) {
        historial = datos.valoraciones ?? [];
      }
    } catch (err) {
      if (String(estudianteElegido) === String(estudianteId)) {
        errorValoracion = err.message;
      }
    } finally {
      cargandoHistorial = false;
    }
  }

  async function guardarValoracion() {
    mensajeValoracion = '';
    errorValoracion = '';

    const estudianteId = Number(estudianteElegido);
    const imparticionId = Number(imparticionElegida);
    const indicadorId = Number(indicadorValoracion);
    const nivel = Number(nivelValoracion);

    if (
      !estudianteId ||
      !imparticionId ||
      !indicadoresEvaluables.some((i) => i.id === indicadorId) ||
      !Number.isInteger(nivel) ||
      nivel < 1 ||
      nivel > 4
    ) {
      errorValoracion = 'Completa el estudiante, indicador y nivel';
      return;
    }

    guardandoValoracion = true;

    try {
      const respuesta = await fetch(`${API_BASE}/valoraciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estudianteId,
          imparticionId,
          indicadorId,
          nivel,
          observacion: observacionValoracion.trim(),
        }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.error ?? 'No se pudo guardar');
      }

      observacionValoracion = '';
      nivelValoracion = '';
      mensajeValoracion = 'Valoración registrada correctamente';

      await cargarHistorial(estudianteId);
      await cargarSeguimientoGrupal(imparticionId);
    } catch (err) {
      errorValoracion = err.message;
    } finally {
      guardandoValoracion = false;
    }
  }
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
      Selecciona las competencias transversales y los indicadores que deseas
      observar en tu módulo profesional.
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
          {@const seleccionadosCompetencia = indicadores.filter((i) =>
            estaSeleccionado(i.id),
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
            {@const activos = (dimension.indicadores ?? []).filter(
              (indicador) => estaSeleccionado(indicador.id),
            )}

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
      Configuración provisional: la selección todavía no se almacena en la base
      de datos.
    </p>
  </section>

  <section class="panel">
    <h2>Guardar y recuperar configuraciones</h2>

    <p>
      Guarda los indicadores seleccionados para utilizarlos posteriormente en el
      seguimiento del alumnado.
    </p>

    <div class="formulario-configuracion">
      <label for="nombre-configuracion"> Nombre de la configuración </label>

      <input
        id="nombre-configuracion"
        type="text"
        bind:value={nombreConfiguracion}
        placeholder="Ejemplo: Lenguajes de Marcas - Grupo A"
      />

      <label for="descripcion-configuracion"> Descripción </label>

      <textarea
        id="descripcion-configuracion"
        bind:value={descripcionConfiguracion}
        rows="3"
        placeholder="Objetivos del seguimiento"></textarea>

      <button onclick={guardarConfiguracion} disabled={guardandoConfiguracion}>
        {guardandoConfiguracion
          ? 'Guardando...'
          : 'Guardar nueva configuración'}
      </button>
    </div>

    <div class="recuperar-configuracion">
      <h3>Configuraciones guardadas</h3>

      <label for="configuracion-guardada"> Seleccionar configuración </label>

      <select id="configuracion-guardada" bind:value={configuracionElegida}>
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

  <section class="panel">
    <h2>Seguimiento del alumnado</h2>

    {#if cargandoGrupo}
      <p>Cargando estudiantes...</p>
    {:else if errorGrupo}
      <p class="error" role="alert">{errorGrupo}</p>
      <button onclick={() => cargarGrupoSeguimiento()}> Reintentar </button>
    {:else if grupoSeguimiento}
      <p>
        <strong>{grupoSeguimiento.nombre}</strong>
        · Curso {grupoSeguimiento.curso}
        · {estudiantes.length} estudiantes
      </p>

      <div class="formulario-configuracion">
        <label for="imparticion"> Módulo profesional </label>

       <select
  id="imparticion"
  bind:value={imparticionElegida}
  onchange={() => {
    cargarSeguimientoGrupal(imparticionElegida);
  }}
>
          {#each imparticiones as imparticion (imparticion.id)}
            <option value={String(imparticion.id)}>
              {imparticion.nombreModulo}
            </option>
          {/each}
        </select>

        <label for="estudiante"> Estudiante </label>

        <select
          id="estudiante"
          bind:value={estudianteElegido}
          onchange={() => {
            mensajeValoracion = '';
            cargarHistorial(estudianteElegido);
          }}
        >
          {#each estudiantes as estudiante (estudiante.id)}
            <option value={String(estudiante.id)}>
              {estudiante.codigo} — {estudiante.nombre}
            </option>
          {/each}
        </select>
      </div>

      {#if estudianteElegido}
        <p>
          Estudiante seleccionado:
          <strong>
            {estudiantes.find(
              (estudiante) => estudiante.id === Number(estudianteElegido),
            )?.nombre}
          </strong>
        </p>
      {/if}
    {:else}
      <p>No hay datos del grupo disponibles.</p>
    {/if}

    <div class="evaluacion">
      <h3>Nueva valoración</h3>
      
<div class="formulario-configuracion">
  <label for="configuracion-evaluacion">
    Configuración de indicadores
  </label>

  <select
    id="configuracion-evaluacion"
    bind:value={configuracionElegida}
    onchange={() => {
      if (configuracionElegida) {
        recuperarConfiguracion();
      }
    }}
  >
    <option value="">Selecciona una configuración guardada</option>

    {#each configuraciones as configuracion (configuracion.id)}
      <option value={String(configuracion.id)}>
        {configuracion.nombre}
        ({configuracion.indicadores.length} indicadores)
      </option>
    {/each}
  </select>
</div>


      {#if indicadoresEvaluables.length === 0}
        <p>
          Selecciona primero los indicadores en el catálogo o recupera una
          configuración guardada.
        </p>
      {:else}
        <div class="formulario-configuracion">
          <label for="indicador-valoracion">
            Indicador que deseas evaluar
          </label>

          <select id="indicador-valoracion" bind:value={indicadorValoracion}>
            <option value="">Selecciona un indicador</option>

            {#each indicadoresEvaluables as indicador (indicador.id)}
              <option value={String(indicador.id)}>
                {indicador.descripcion}
              </option>
            {/each}
          </select>

          <label for="nivel-valoracion"> Nivel observado </label>

          <select id="nivel-valoracion" bind:value={nivelValoracion}>
            <option value="">Selecciona un nivel</option>
            <option value="1">1 — No demuestra el desempeño esperado</option>
            <option value="2">2 — Necesita apoyo frecuente</option>
            <option value="3">3 — Trabaja con autonomía</option>
            <option value="4">4 — Desempeño consistente y autónomo</option>
          </select>

          <label for="observacion-valoracion"> Observación docente </label>

          <textarea
            id="observacion-valoracion"
            rows="3"
            bind:value={observacionValoracion}
            placeholder="Describe el comportamiento observado..."></textarea>

          <button
            onclick={guardarValoracion}
            disabled={guardandoValoracion ||
              !estudianteElegido ||
              !imparticionElegida ||
              !indicadorValoracion ||
              !nivelValoracion}
          >
            {guardandoValoracion ? 'Guardando...' : 'Registrar valoración'}
          </button>
        </div>
      {/if}

      {#if mensajeValoracion}
        <p class="mensaje-exito" role="status">
          {mensajeValoracion}
        </p>
      {/if}

      {#if errorValoracion}
        <p class="error" role="alert">
          {errorValoracion}
        </p>
      {/if}

      <div class="historial">
        <h3>Historial de valoraciones</h3>

        {#if cargandoHistorial}
          <p>Cargando historial...</p>
        {:else if historial.length === 0}
          <p>Este estudiante todavía no tiene valoraciones registradas.</p>
        {:else}
          {#each historial.filter((item) => item.imparticionId === Number(imparticionElegida)) as valoracion (valoracion.id)}
            <article class="registro-valoracion">
              <div class="cabecera-competencia">
                <strong>{valoracion.indicador.descripcion}</strong>
                <span class="contador">Nivel {valoracion.nivel}/4</span>
              </div>

              <small>
                {new Date(valoracion.fecha).toLocaleString('es-ES')}
              </small>

              {#if valoracion.observacion}
                <p>{valoracion.observacion}</p>
              {/if}
            </article>
          {/each}
        {/if}
      </div>
      
<div class="evolucion-individual">
  <h3>Evolución individual por indicador</h3>

  <label for="indicador-grafico">
    Indicador que deseas analizar
  </label>

  <select
    id="indicador-grafico"
    bind:value={indicadorGrafico}
  >
    <option value="">Selecciona un indicador</option>

    {#each indicadoresHistorial as indicador (indicador.id)}
      <option value={String(indicador.id)}>
        {indicador.descripcion}
      </option>
    {/each}
  </select>

  {#if !indicadorGrafico}
    <p>Selecciona un indicador con valoraciones registradas.</p>
  {:else if puntosGrafico.length === 0}
    <p>No hay observaciones para este indicador.</p>
  {:else}
    <div class="grafico-contenedor">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label="Evolución cronológica de las valoraciones del indicador seleccionado"
      >
        {#each [1, 2, 3, 4] as nivel}
          <line
            x1={MARGEN.izquierda}
            x2={ANCHO - MARGEN.derecha}
            y1={puntoY(nivel)}
            y2={puntoY(nivel)}
            stroke="#dbe3ed"
            stroke-dasharray="4 4"
          />

          <text
            x={MARGEN.izquierda - 15}
            y={puntoY(nivel) + 5}
            text-anchor="end"
            font-size="14"
            fill="#526174"
          >
            {nivel}
          </text>
        {/each}

        {#if puntosGrafico.length > 1}
          <path
            d={trazadoGrafico}
            fill="none"
            stroke="#205493"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {/if}

        {#each puntosGrafico as punto, indice (punto.id)}
          <circle
            cx={punto.x}
            cy={punto.y}
            r="7"
            fill={punto.nivel <= 2 ? '#c47722' : '#205493'}
            stroke="white"
            stroke-width="2"
          >
            <title>
              {new Date(punto.fecha).toLocaleString('es-ES')}
              — Nivel {punto.nivel}/4
            </title>
          </circle>

          <text
            x={punto.x}
            y={ALTO - 14}
            text-anchor="middle"
            font-size="12"
            fill="#526174"
          >
            {indice + 1}
          </text>
        {/each}
      </svg>
    </div>

    <p class="nota-grafico">
      Eje horizontal: orden cronológico de las observaciones.
      Eje vertical: nivel de desempeño (1–4).
      Las distancias horizontales no representan intervalos
      temporales proporcionales.
    </p>

    <table class="tabla-evolucion">
      <thead>
        <tr>
          <th>Observación</th>
          <th>Fecha</th>
          <th>Nivel</th>
        </tr>
      </thead>
      <tbody>
        {#each valoracionesGrafico as valoracion, indice (valoracion.id)}
          <tr>
            <td>{indice + 1}</td>
            <td>
              {new Date(valoracion.fecha).toLocaleString('es-ES')}
            </td>
            <td>{valoracion.nivel}/4</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

    </div>
  </section>
  
<section class="panel dashboard">
  <div class="cabecera-panel">
    <div>
      <h2>Dashboard de seguimiento grupal</h2>
      <p>
        Detección de dificultades en competencias transversales.
      </p>
    </div>

    <button
      class="secundario"
      onclick={() => cargarSeguimientoGrupal(imparticionElegida)}
      disabled={!imparticionElegida || cargandoSeguimiento}
    >
      Actualizar datos
    </button>
  </div>

  {#if cargandoSeguimiento}
    <p>Calculando indicadores de seguimiento...</p>
  {:else if errorSeguimiento}
    <p class="error" role="alert">{errorSeguimiento}</p>
  {:else if seguimientoGrupal}
    <p>
      <strong>{seguimientoGrupal.imparticion.nombreModulo}</strong>
      · {seguimientoGrupal.imparticion.grupo}
    </p>

    <div class="metricas-dashboard">
      <div>
        <span>Estudiantes</span>
        <strong>{seguimientoGrupal.resumen.totalEstudiantes}</strong>
      </div>

      <div>
        <span>Valoraciones</span>
        <strong>{seguimientoGrupal.resumen.totalValoraciones}</strong>
      </div>

      <div>
        <span>Estudiantes con alertas</span>
        <strong>
          {seguimientoGrupal.resumen.estudiantesConDificultades}
        </strong>
      </div>

      <div>
        <span>Alertas activas</span>
        <strong>{seguimientoGrupal.resumen.totalAlertas}</strong>
      </div>
      
<div>
  <span>Estudiantes en atención inicial</span>
  <strong>
    {seguimientoGrupal.resumen.estudiantesAtencionInicial}
  </strong>
</div>

<div>
  <span>Estudiantes sin observaciones</span>
  <strong>
    {seguimientoGrupal.resumen.estudiantesSinObservaciones}
  </strong>
</div>

    </div>

    <h3>Indicadores que requieren revisión</h3>

    {#if seguimientoGrupal.dificultades.length === 0}
      <p>
        No se han detectado dos valoraciones bajas consecutivas
        para un mismo estudiante e indicador.
      </p>
      <p>
        Esto no implica que todos los estudiantes hayan alcanzado
        los desempeños esperados.
      </p>
    {:else}
      <div class="tabla-dashboard">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Indicador</th>
              <th>Anterior</th>
              <th>Actual</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {#each seguimientoGrupal.dificultades as dificultad (
              `${dificultad.estudianteId}-${dificultad.indicadorId}`
            )}
              <tr>
                <td>{dificultad.estudiante}</td>
                <td>{dificultad.indicador}</td>
                <td>{dificultad.nivelAnterior}/4</td>
                <td>{dificultad.nivelActual}/4</td>
                <td>
                  <span class="estado-revision">
                    Requiere revisión
                  </span>
                </td>
                <td>
                  <button
                    class="secundario"
                    onclick={() => {
                      estudianteElegido =
                        String(dificultad.estudianteId);

                      indicadorValoracion =
                        String(dificultad.indicadorId);

                      cargarHistorial(estudianteElegido);
                    }}
                  >
                    Ver estudiante
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    
<h3>Indicadores en atención inicial</h3>

{#if seguimientoGrupal.atencionesIniciales.length === 0}
  <p>No hay indicadores en atención inicial.</p>
{:else}
  <div class="tabla-dashboard">
    <table>
      <thead>
        <tr>
          <th>Estudiante</th>
          <th>Indicador</th>
          <th>Último nivel</th>
          <th>Observaciones</th>
          <th>Estado</th>
        </tr>
      </thead>

      <tbody>
        {#each seguimientoGrupal.atencionesIniciales as aviso (
          `${aviso.estudianteId}-${aviso.indicadorId}`
        )}
          <tr>
            <td>{aviso.estudiante}</td>
            <td>{aviso.indicador}</td>
            <td>{aviso.nivelActual}/4</td>
            <td>{aviso.numeroValoraciones}</td>
            <td>
              <span class="estado-atencion">
                Atención inicial
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

    <p class="nota-dashboard">
      Las alertas son señales de revisión docente calculadas
      a partir de dos valoraciones consecutivas de nivel 1 o 2.
      No constituyen calificaciones ni diagnósticos automáticos.
    </p>
  {:else}
    <p>Selecciona una impartición para consultar su seguimiento.</p>
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

  header {
    margin-bottom: 28px;
  }

  .etiqueta {
    color: #205493;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
  }

  h1 {
    font-size: 32px;
    margin: 10px 0;
    color: #17365d;
  }
  h2 {
    margin: 0 0 8px;
    color: #17365d;
  }
  h3 {
    margin: 0 0 8px;
    color: #205493;
  }
  h4 {
    margin: 12px 0;
  }

  p {
    line-height: 1.5;
    color: #526174;
  }

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

  .lista {
    display: grid;
    gap: 16px;
    margin-top: 24px;
  }

  .competencia {
    padding: 20px;
    border: 1px solid #dfe5ed;
    border-radius: 10px;
    background: #fafbfd;
  }

  .competencia p {
    margin: 5px 0 10px;
  }
  small {
    color: #65758a;
  }

  .contador {
    background: #e5eef8;
    color: #205493;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 700;
  }

  .acciones {
    justify-content: flex-start;
    margin-top: 18px;
  }

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

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

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

  .indicador input {
    margin-top: 3px;
    accent-color: #205493;
  }

  .resumen-competencia {
    border-bottom: 1px solid #dfe5ed;
    padding: 14px 0;
  }

  .resumen-competencia li {
    margin: 7px 0;
  }

  .aviso {
    font-size: 13px;
    margin-top: 20px;
    padding: 12px;
    background: #fff7e8;
    border-radius: 6px;
  }

  .error {
    color: #b42318;
  }

  @media (max-width: 650px) {
    .resumen {
      grid-template-columns: 1fr;
    }
    .contenedor {
      padding: 20px 12px;
    }
    .panel {
      padding: 16px;
    }
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
  .formulario-configuracion select {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid #b9c9da;
    border-radius: 7px;
    font: inherit;
    background: white;
    color: #243247;
  }
  .evaluacion {
  margin-top: 28px;
  border-top: 1px solid #dfe5ed;
  padding-top: 24px;
}

.historial {
  margin-top: 32px;
}

.registro-valoracion {
  padding: 16px;
  margin: 12px 0;
  border: 1px solid #dfe5ed;
  border-radius: 8px;
  background: #fafbfd;
}

.registro-valoracion small {
  display: block;
  margin-top: 8px;
}

.dashboard {
  margin-top: 24px;
}

.metricas-dashboard {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 24px 0 32px;
}

.metricas-dashboard > div {
  padding: 18px;
  background: #f3f6fb;
  border: 1px solid #dfe5ed;
  border-radius: 10px;
}

.metricas-dashboard span {
  display: block;
  font-size: 13px;
  color: #526174;
}

.metricas-dashboard strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  color: #17365d;
}

.tabla-dashboard {
  overflow-x: auto;
}

.tabla-dashboard table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tabla-dashboard th,
.tabla-dashboard td {
  padding: 12px;
  border-bottom: 1px solid #dfe5ed;
  text-align: left;
  vertical-align: top;
}

.tabla-dashboard th {
  background: #f3f6fb;
  color: #17365d;
}

.estado-revision {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 6px;
  background: #fff0d9;
  color: #875000;
  font-size: 12px;
  font-weight: 700;
}

.nota-dashboard {
  margin-top: 24px;
  font-size: 13px;
  color: #65758a;
}

@media (max-width: 700px) {
  .metricas-dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.estado-atencion {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 6px;
  background: #e8f1fc;
  color: #20538a;
  font-size: 12px;
  font-weight: 700;
}

.evolucion-individual {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #dfe5ed;
}

.evolucion-individual select {
  width: 100%;
  padding: 12px;
  margin: 10px 0 20px;
  border: 1px solid #b9c9da;
  border-radius: 7px;
  background: white;
  color: #243247;
  font: inherit;
}

.grafico-contenedor {
  width: 100%;
  overflow-x: auto;
  background: #fafbfd;
  border: 1px solid #dfe5ed;
  border-radius: 10px;
  padding: 12px;
  box-sizing: border-box;
}

.grafico-contenedor svg {
  display: block;
  width: 100%;
  height: auto;
  min-width: 420px;
}

.nota-grafico {
  font-size: 13px;
  color: #65758a;
}

.tabla-evolucion {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.tabla-evolucion th,
.tabla-evolucion td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #dfe5ed;
}

</style>
