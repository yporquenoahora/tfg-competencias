<script>
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import Catalogo from './components/Catalogo.svelte';
  import DashboardGrupal from './components/DashboardGrupal.svelte';
  import SeguimientoIndividual from './components/SeguimientoIndividual.svelte';
  import ImportarEstudiantes from './components/ImportarEstudiantes.svelte';
  import {
    crearPlanRefuerzo,
    obtenerPlanesRefuerzo,
  } from './lib/planesRefuerzo.js';
  import {
    obtenerGrupo,
    obtenerHistorial,
    obtenerSeguimientoGrupal,
    registrarValoracion,
  } from './lib/seguimiento.js';
  import './app.css';

  let vistaActiva = 'evaluacion';
  let rubricas = [];
  let errorRubricas = '';
  let evidenciaIdSeleccionada = '';
  let catalogo;
  let competencias = [],
    configuraciones = [],
    grupo = null,
    estudiantes = [],
    imparticiones = [];
  let seleccionados = [],
    estudianteElegido = '',
    imparticionElegida = '';
  let historial = [],
    planes = [],
    seguimiento = null;
  let cargandoCatalogo = true,
    cargandoGrupo = true,
    cargandoHistorial = false;
  let cargandoPlanes = false,
    cargandoSeguimiento = false;
  let errorCatalogo = '',
    errorGrupo = '',
    errorHistorial = '',
    errorPlanes = '',
    errorSeguimiento = '';
  let indicadorValoracion = '',
    nivelValoracion = '',
    observacionValoracion = '';
  let guardandoValoracion = false,
    mensajeValoracion = '',
    errorValoracion = '';
  let configuracionEvaluacion = '';
  let solicitudEstudiante = 0,
    solicitudSeguimiento = 0;

  const indicadoresDe = (c) =>
    (c.dimensiones ?? []).flatMap((d) => d.indicadores ?? []);
  // Las configuraciones pertenecen a una impartición concreta.
  $: configuracionesDelModulo = configuraciones.filter(
    (c) =>
      Number(c.imparticionId) === Number(imparticionElegida) &&
      Boolean(imparticionElegida),
  );
  $: configuracionActiva = configuracionesDelModulo.find(
    (c) => String(c.id) === String(configuracionEvaluacion),
  );
  $: idsIndicadoresActivos = new Set(
    (configuracionActiva?.indicadores ?? []).map((item) =>
      Number(item.indicadorId),
    ),
  );
  $: evaluables = competencias
    .flatMap(indicadoresDe)
    .filter((indicador) => idsIndicadoresActivos.has(Number(indicador.id)));
  $: if (
    indicadorValoracion &&
    !evaluables.some((i) => String(i.id) === String(indicadorValoracion))
  ) {
    indicadorValoracion = '';
  }

  async function cargarRubricas() {
    errorRubricas = '';
    try {
      rubricas = await api('/rubricas');
    } catch (error) {
      errorRubricas = error.message;
    }
  }

  async function guardarPlan(datos) {
    const estudianteIdActual = Number(estudianteElegido);
    const imparticionIdActual = Number(imparticionElegida);
    if (
      datos.estudianteId !== estudianteIdActual ||
      datos.imparticionId !== imparticionIdActual
    ) {
      throw new Error(
        'La selección ha cambiado. Revisa el estudiante y el módulo.',
      );
    }
    const nuevoPlan = await crearPlanRefuerzo(datos);
    if (Number(estudianteElegido) === estudianteIdActual) {
      await seleccionarEstudiante(estudianteIdActual);
    }
    return nuevoPlan;
  }

  async function cargarCatalogo() {
    cargandoCatalogo = true;
    errorCatalogo = '';
    try {
      competencias = await api('/competencias');
      configuraciones = await api('/configuraciones');
    } catch (error) {
      errorCatalogo = error.message;
    } finally {
      cargandoCatalogo = false;
    }
  }

  async function guardarConfiguracion(datos) {
    const nueva = await api('/configuraciones', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
    configuraciones = await api('/configuraciones');
    return nueva;
  }

  async function cargarGrupo() {
    cargandoGrupo = true;
    errorGrupo = '';
    try {
      grupo = await obtenerGrupo(1);
      estudiantes = grupo.estudiantes ?? [];
      imparticiones = grupo.imparticiones ?? [];
      imparticionElegida = imparticiones.length
        ? String(imparticiones[0].id)
        : '';
      await Promise.all([
        seleccionarEstudiante(estudiantes[0]?.id ?? ''),
        cargarSeguimiento(),
      ]);
    } catch (error) {
      errorGrupo = error.message;
    } finally {
      cargandoGrupo = false;
    }
  }

  async function actualizarEstudiantes() {
    try {
      errorGrupo = '';

      const grupoActualizado = await obtenerGrupo(1);

      grupo = grupoActualizado;
      estudiantes = grupoActualizado.estudiantes ?? [];
      imparticiones = grupoActualizado.imparticiones ?? [];

      const estudianteSigueExistiendo = estudiantes.some(
        (e) => String(e.id) === String(estudianteElegido),
      );

      if (!estudianteSigueExistiendo) {
        await seleccionarEstudiante(estudiantes[0]?.id ?? '');
      }

      await cargarSeguimiento();
    } catch (error) {
      errorGrupo = error.message;
      throw error;
    }
  }

  async function seleccionarEstudiante(id, indicadorId = null) {
    estudianteElegido = id ? String(id) : '';
    if (indicadorId) indicadorValoracion = String(indicadorId);
    mensajeValoracion = '';
    historial = [];
    planes = [];
    errorHistorial = '';
    errorPlanes = '';
    const actual = ++solicitudEstudiante;
    if (!estudianteElegido) {
      cargandoHistorial = false;
      cargandoPlanes = false;
      return;
    }
    cargandoHistorial = true;
    cargandoPlanes = true;
    const [h, p] = await Promise.allSettled([
      obtenerHistorial(estudianteElegido),
      obtenerPlanesRefuerzo(estudianteElegido),
    ]);
    if (actual !== solicitudEstudiante) return;
    if (h.status === 'fulfilled') {
      historial = h.value;
    } else {
      errorHistorial = h.reason.message;
    }
    if (p.status === 'fulfilled') {
      planes = p.value;
    } else {
      errorPlanes = p.reason.message;
    }
    cargandoHistorial = false;
    cargandoPlanes = false;
  }

  async function cargarSeguimiento() {
    seguimiento = null;
    errorSeguimiento = '';
    const id = imparticionElegida;
    const actual = ++solicitudSeguimiento;
    if (!id) {
      cargandoSeguimiento = false;
      return;
    }
    cargandoSeguimiento = true;
    try {
      const datos = await obtenerSeguimientoGrupal(id);
      if (actual === solicitudSeguimiento) seguimiento = datos;
    } catch (error) {
      if (actual === solicitudSeguimiento) errorSeguimiento = error.message;
    } finally {
      if (actual === solicitudSeguimiento) cargandoSeguimiento = false;
    }
  }

  function cambiarModulo() {
    // Evitar conservar una configuración que podría
    // corresponder a otro módulo profesional.
    configuracionEvaluacion = '';

    // Limpiar el formulario de valoración.
    indicadorValoracion = '';
    nivelValoracion = '';
    observacionValoracion = '';
    evidenciaIdSeleccionada = '';

    mensajeValoracion = '';
    errorValoracion = '';

    // Actualizar el seguimiento del módulo seleccionado.
    cargarSeguimiento();
  }

  function recuperarConfiguracion() {
    indicadorValoracion = '';
    nivelValoracion = '';
    evidenciaIdSeleccionada = '';
    mensajeValoracion = '';
    errorValoracion = '';
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
      !evaluables.some((i) => Number(i.id) === indicadorId) ||
      !Number.isInteger(nivel) ||
      nivel < 1 ||
      nivel > 4
    ) {
      errorValoracion = 'Completa estudiante, indicador y nivel';
      return;
    }
    const evidenciaId = evidenciaIdSeleccionada
      ? Number(evidenciaIdSeleccionada)
      : null;
    if (
      evidenciaId !== null &&
      (!Number.isSafeInteger(evidenciaId) || evidenciaId <= 0)
    ) {
      errorValoracion = 'Selecciona una evidencia válida';
      return;
    }
    guardandoValoracion = true;
    try {
      await registrarValoracion({
        estudianteId,
        imparticionId,
        indicadorId,
        nivel,
        observacion: observacionValoracion.trim(),
        evidenciaId,
      });
      observacionValoracion = '';
      nivelValoracion = '';
      evidenciaIdSeleccionada = '';
      await Promise.all([
        seleccionarEstudiante(estudianteId),
        cargarSeguimiento(),
      ]);
      mensajeValoracion = 'Valoración registrada correctamente';
    } catch (error) {
      errorValoracion = error.message;
    } finally {
      guardandoValoracion = false;
    }
  }

  onMount(() => {
    cargarCatalogo();
    cargarGrupo();
    cargarRubricas();
  });
</script>

<svelte:head>
  <title>Seguimiento de competencias transversales | TFE</title>
  <meta
    name="description"
    content="Configuración y seguimiento docente en Formación Profesional"
  />
</svelte:head>

<main class="contenedor">
  <div class="layout-panel">
    <nav class="menu-principal" aria-label="Navegación principal">
      <div class="menu-identidad">
        <strong>Competencias FP</strong>
        <small>Panel de seguimiento docente</small>
      </div>
      <button
        class:activo={vistaActiva === 'evaluacion'}
        onclick={() => (vistaActiva = 'evaluacion')}
        aria-current={vistaActiva === 'evaluacion' ? 'page' : undefined}
        >Evaluación</button
      >
      <button
        class:activo={vistaActiva === 'grupo'}
        onclick={() => (vistaActiva = 'grupo')}
        aria-current={vistaActiva === 'grupo' ? 'page' : undefined}
        >Grupo</button
      >
      <button
        class:activo={vistaActiva === 'catalogo'}
        onclick={() => (vistaActiva = 'catalogo')}
        aria-current={vistaActiva === 'catalogo' ? 'page' : undefined}
        >Catálogo</button
      >
    </nav>

    <div class="contenido-panel">
      <div hidden={vistaActiva !== 'catalogo'}>
        <Catalogo
          bind:this={catalogo}
          {competencias}
          {configuraciones}
          bind:seleccionados
          cargando={cargandoCatalogo}
          error={errorCatalogo}
          onGuardar={guardarConfiguracion}
          {imparticiones}
          bind:imparticionElegida
        />
      </div>

      {#if vistaActiva === 'evaluacion'}
        <section class="panel" id="seguimiento-individual">
          {#if cargandoGrupo}
            <section class="panel"><p>Cargando estudiantes...</p></section>
          {:else if errorGrupo}
            <section class="panel">
              <p class="error" role="alert">{errorGrupo}</p>
              <button onclick={cargarGrupo}>Reintentar</button>
            </section>
          {:else}
            <SeguimientoIndividual
              {grupo}
              {estudiantes}
              {imparticiones}
              configuraciones={configuracionesDelModulo}
              {evaluables}
              bind:estudianteElegido
              bind:imparticionElegida
              bind:configuracionEvaluacion
              bind:indicadorValoracion
              bind:nivelValoracion
              bind:observacionValoracion
              bind:evidenciaIdSeleccionada
              {historial}
              {planes}
              {cargandoHistorial}
              {cargandoPlanes}
              {errorHistorial}
              {errorPlanes}
              {guardandoValoracion}
              {mensajeValoracion}
              {errorValoracion}
              {seleccionarEstudiante}
              {cambiarModulo}
              {recuperarConfiguracion}
              {guardarValoracion}
              {guardarPlan}
              {rubricas}
              {errorRubricas}
            />
          {/if}
        </section>
      {/if}

      {#if vistaActiva === 'grupo'}
        <DashboardGrupal
          {seguimiento}
          cargando={cargandoSeguimiento}
          error={errorSeguimiento}
          actualizar={cargarSeguimiento}
          verEstudiante={(id, indicadorId) => {
            seleccionarEstudiante(id, indicadorId);
            vistaActiva = 'evaluacion';
          }}
        />

        <ImportarEstudiantes
          grupoId={grupo?.id ?? 1}
          onImportado={actualizarEstudiantes}
        />
      {/if}
    </div>
  </div>
</main>
