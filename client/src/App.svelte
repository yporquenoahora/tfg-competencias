<script>
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import Catalogo from './components/Catalogo.svelte';
  import TimelineCurso from './components/TimelineCurso.svelte';
  import DashboardGrupal from './components/DashboardGrupal.svelte';
  import SeguimientoIndividual from './components/SeguimientoIndividual.svelte';
  import ImportarModulo from './components/ImportarModulo.svelte';
  import ImportarEstudiantes from './components/ImportarEstudiantes.svelte';
  import {
    actualizarPlanRefuerzo,
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

  let desde = '';
  let hasta = '';
  let vistaActiva = 'evaluacion';
  let rubricas = [];
  let errorRubricas = '';
  let evidenciaIdSeleccionada = '';
  let mensajeModulo = '';
  const vistas = [
    { id: 'evaluacion', nombre: 'Alumno', detalle: 'Consulta su evolución, registra observaciones y prepara refuerzos.' },
    { id: 'grupo', nombre: 'Grupo', detalle: 'Consulta las dificultades observadas en el grupo y abre el seguimiento de cada alumno.' },
    { id: 'curso', nombre: 'Curso', detalle: 'Compara la cobertura y las dificultades de tus grupos por quincena.' },
    { id: 'catalogo', nombre: 'Catálogo', detalle: 'Elige los indicadores que quieres observar en el módulo activo.' },
    { id: 'modulos', nombre: 'Módulos', detalle: 'Incorpora un módulo y sus referentes curriculares al grupo actual.' },
  ];
  $: vista = vistas.find((opcion) => opcion.id === vistaActiva);
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

  async function cambiarEstadoPlan(plan, estado) {
    const estudianteId = Number(estudianteElegido);
    const imparticionId = Number(imparticionElegida);
    if (plan.estudianteId !== estudianteId || plan.imparticionId !== imparticionId) {
      throw new Error('El plan pertenece a otro contexto de seguimiento');
    }
    await actualizarPlanRefuerzo(plan.id, { estado, estudianteId, imparticionId });
    planes = planes.map((item) => item.id === plan.id ? { ...item, estado } : item);
    void cargarSeguimiento();
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
    if (String(datos.imparticionId) === imparticionElegida) {
      configuracionEvaluacion = String(nueva.id);
      recuperarConfiguracion();
      mensajeModulo = '';
    }
    return nueva;
  }

  let grupos = [];
  let grupoElegido = '';
  let creandoGrupo = false;
  let nombreGrupo = '';
  let cicloGrupo = '';
  let cursoGrupo = '';
  let errorAltaGrupo = '';
  let guardandoGrupo = false;
  let ciclosGrupos = [];

  async function cargarGrupo(id = grupoElegido) {
    cargandoGrupo = true;
    errorGrupo = '';
    grupo = null;
    estudiantes = [];
    imparticiones = [];
    seleccionarModulo('');
    void seleccionarEstudiante('');
    try {
      grupos = await api('/grupos');
      grupoElegido = id || String(grupos[0]?.id ?? '');
      if (!grupoElegido) return;
      grupo = await obtenerGrupo(grupoElegido);
      estudiantes = grupo.estudiantes ?? [];
      imparticiones = grupo.imparticiones ?? [];
      seleccionarModulo(String(imparticiones[0]?.id ?? ''));
      void seleccionarEstudiante(estudiantes[0]?.id ?? '');
    } catch (error) {
      errorGrupo = error.message;
    } finally {
      cargandoGrupo = false;
    }
  }

  async function abrirAltaGrupo() {
    cursoGrupo = grupo?.curso ?? grupos[0]?.curso ?? '';
    creandoGrupo = true;
    errorAltaGrupo = '';
    try {
      const fichas = await api('/catalogo-curricular');
      ciclosGrupos = [...new Set(fichas.flatMap((ficha) => ficha.ofertas.map((oferta) => oferta.ciclo)))]
        .filter((ciclo) => !ciclo.startsWith('Optativas de Madrid'))
        .sort((a, b) => a.localeCompare(b, 'es'));
    } catch (error) {
      errorAltaGrupo = error.message;
    }
  }

  async function crearGrupo(evento) {
    evento.preventDefault();
    if (guardandoGrupo) return;
    guardandoGrupo = true;
    errorAltaGrupo = '';
    try {
      const nuevo = await api('/grupos', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombreGrupo, curso: cursoGrupo, ciclo: cicloGrupo }),
      });
      creandoGrupo = false;
      nombreGrupo = '';
      cicloGrupo = '';
      await cargarGrupo(String(nuevo.id));
      vistaActiva = 'modulos';
    } catch (error) {
      errorAltaGrupo = error.message;
    } finally {
      guardandoGrupo = false;
    }
  }

  async function actualizarEstudiantes() {
    try {
      errorGrupo = '';

      const id = grupo?.id;
      if (!id) return;
      const grupoActualizado = await obtenerGrupo(id);
      if (grupo?.id !== id) return;

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
      const datos = await obtenerSeguimientoGrupal(id, { desde, hasta });
      if (actual === solicitudSeguimiento) seguimiento = datos;
    } catch (error) {
      if (actual === solicitudSeguimiento) errorSeguimiento = error.message;
    } finally {
      if (actual === solicitudSeguimiento) cargandoSeguimiento = false;
    }
  }

  async function abrirRevision(fila, inicio, fin) {
    desde = inicio;
    hasta = fin;
    if (String(fila.grupoId) !== grupoElegido) await cargarGrupo(String(fila.grupoId));
    vistaActiva = 'grupo';
    if (String(fila.id) === imparticionElegida) await cargarSeguimiento();
    else seleccionarModulo(String(fila.id));
  }

  function seleccionarModulo(id) {
    if (id === imparticionElegida) return;
    imparticionElegida = id;
    seleccionados = [];
    mensajeModulo = '';
    cambiarModulo();
  }

  async function importarModulo(catalogoId) {
    const grupoId = grupo.id;
    const imparticion = await api(`/grupos/${grupoId}/modulos/catalogo`, {
      method: 'POST',
      body: JSON.stringify({ catalogoId }),
    });

    if (grupo?.id !== grupoId) return;
    if (!imparticiones.some((item) => item.id === imparticion.id)) {
      imparticiones = [...imparticiones, imparticion];
    }
    seleccionarModulo(String(imparticion.id));
    mensajeModulo = `${imparticion.nombreModulo} está activo. Elige los indicadores y guarda su configuración.`;
    vistaActiva = 'catalogo';
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
      {#each vistas as opcion (opcion.id)}
        <button
          class:activo={vistaActiva === opcion.id}
          onclick={() => (vistaActiva = opcion.id)}
          aria-current={vistaActiva === opcion.id ? 'page' : undefined}
        >{opcion.nombre}</button>
      {/each}
    </nav>

    <div class="contenido-panel">
      <header class="contexto-app">
        <div class="contexto-titulo">
          <h1>{vista.nombre}</h1>
          <p>{vista.detalle}</p>
        </div>
        <div class="contexto-controles">
          <div class="contexto-grupo">
            <label for="grupo-activo">Grupo actual</label>
            <select id="grupo-activo" value={grupoElegido} disabled={cargandoGrupo || guardandoValoracion || !grupos.length}
              onchange={(evento) => cargarGrupo(evento.currentTarget.value)}>
              {#if !grupos.length}<option value="">Sin grupos disponibles</option>{/if}
              {#each grupos as item (item.id)}
                <option value={String(item.id)}>{item.nombre} · {item.curso}</option>
              {/each}
            </select>
          </div>
          <div class="contexto-modulo">
            <label for="modulo-activo">Módulo activo</label>
            <select
              id="modulo-activo"
              value={imparticionElegida}
              disabled={!imparticiones.length}
              onchange={(evento) => seleccionarModulo(evento.currentTarget.value)}
            >
              {#if !imparticiones.length}
                <option value="">{cargandoGrupo ? 'Cargando módulos…' : 'Sin módulos disponibles'}</option>
              {/if}
              {#each imparticiones as imparticion (imparticion.id)}
                <option value={String(imparticion.id)}>{imparticion.nombreModulo}</option>
              {/each}
            </select>
          </div>
          <button class="secundario" onclick={abrirAltaGrupo}>Nuevo grupo</button>
          {#if vistaActiva !== 'modulos'}
            <button class="secundario" onclick={() => (vistaActiva = 'modulos')}>Añadir módulo</button>
          {/if}
        </div>
      </header>

      {#if creandoGrupo}
        <section class="panel">
          <h2>Nuevo grupo</h2>
          <form class="formulario" onsubmit={crearGrupo}>
            <label for="nuevo-grupo-nombre">Nombre del grupo</label>
            <input id="nuevo-grupo-nombre" bind:value={nombreGrupo} placeholder="2.º DAM A" required />
            <label for="nuevo-grupo-ciclo">Ciclo</label>
            <select id="nuevo-grupo-ciclo" bind:value={cicloGrupo} required>
              <option value="">Selecciona el ciclo</option>
              {#each ciclosGrupos as ciclo (ciclo)}<option value={ciclo}>{ciclo}</option>{/each}
            </select>
            <label for="nuevo-grupo-curso">Curso académico</label>
            <input id="nuevo-grupo-curso" bind:value={cursoGrupo} placeholder="2026/2027" required />
            {#if errorAltaGrupo}<p class="error" role="alert">{errorAltaGrupo}</p>{/if}
            <div class="acciones">
              <button disabled={guardandoGrupo || !ciclosGrupos.length}>Crear grupo</button>
              <button class="secundario" type="button" disabled={guardandoGrupo} onclick={() => (creandoGrupo = false)}>Cancelar</button>
            </div>
          </form>
        </section>
      {/if}

      {#if errorGrupo && vistaActiva !== 'evaluacion'}
        <p class="error" role="alert">No se pudo cargar el grupo. {errorGrupo}</p>
        <button class="secundario" onclick={() => cargarGrupo()}>Reintentar</button>
      {/if}

      {#if vistaActiva === 'catalogo' && mensajeModulo}
        <p class="exito" role="status">{mensajeModulo}</p>
      {/if}

      {#if vistaActiva === 'modulos'}
        {#if grupo?.ciclo}
          {#key grupo.id}
            <ImportarModulo {grupo} {imparticiones} guardar={importarModulo} />
          {/key}
        {:else if !cargandoGrupo}
          <p>Selecciona o crea un grupo con ciclo para consultar sus módulos.</p>
        {/if}
      {/if}

      <div hidden={vistaActiva !== 'catalogo'}>
        <Catalogo
          {competencias}
          {configuraciones}
          bind:seleccionados
          cargando={cargandoCatalogo}
          error={errorCatalogo}
          onGuardar={guardarConfiguracion}
          {imparticiones}
          {imparticionElegida}
        />
      </div>

      {#if vistaActiva === 'evaluacion'}
        <section class="panel">
          {#if cargandoGrupo}
            <section class="panel"><p>Cargando estudiantes...</p></section>
          {:else if errorGrupo}
            <section class="panel">
              <p class="error" role="alert">{errorGrupo}</p>
              <button onclick={() => cargarGrupo()}>Reintentar</button>
            </section>
          {:else}
            <SeguimientoIndividual
              {grupo}
              {estudiantes}
              {imparticiones}
              configuraciones={configuracionesDelModulo}
              {evaluables}
              bind:estudianteElegido
              {imparticionElegida}
              bind:configuracionEvaluacion
              bind:indicadorValoracion
              bind:nivelValoracion
              bind:observacionValoracion
              bind:evidenciaIdSeleccionada
              {historial}
              {planes}
              informeDesde={desde}
              informeHasta={hasta}
              {cargandoHistorial}
              {cargandoPlanes}
              {errorHistorial}
              {errorPlanes}
              {guardandoValoracion}
              {mensajeValoracion}
              {errorValoracion}
              {seleccionarEstudiante}
              {recuperarConfiguracion}
              {guardarValoracion}
              {guardarPlan}
              {cambiarEstadoPlan}
              {rubricas}
              {errorRubricas}
              abrirCatalogo={() => (vistaActiva = 'catalogo')}
            />
          {/if}
        </section>
      {/if}

      {#if vistaActiva === 'curso'}
        <TimelineCurso cursos={[...new Set(grupos.map((g) => g.curso))]} abrir={abrirRevision} />
      {/if}

      {#if vistaActiva === 'grupo'}
        <form class="panel revision-periodo" onsubmit={(evento) => { evento.preventDefault(); cargarSeguimiento(); }}>
          <label>Desde <input type="date" bind:value={desde} /></label>
          <label>Hasta <input type="date" bind:value={hasta} /></label>
          <button>Revisar periodo</button>
          <button class="secundario" type="button" onclick={() => { desde = ''; hasta = ''; cargarSeguimiento(); }}>Todo el curso</button>
        </form>
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

        {#if grupo}
          {#key grupo.id}
            <ImportarEstudiantes grupoId={grupo.id} onImportado={actualizarEstudiantes} />
          {/key}
        {/if}
      {/if}
    </div>
  </div>
</main>
