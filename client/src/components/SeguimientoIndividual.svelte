
<script>
  import Evolucion from './Evolucion.svelte';
  import PlanesRefuerzo from './PlanesRefuerzo.svelte';

  export let grupo = null;
  export let estudiantes = [];
  export let imparticiones = [];
  export let configuraciones = [];
  export let evaluables = [];

  export let guardarPlan;

  export let estudianteElegido = '';
  export let imparticionElegida = '';
  export let configuracionEvaluacion = '';
  export let indicadorValoracion = '';
  export let nivelValoracion = '';
  export let observacionValoracion = '';

  export let historial = [];
  export let planes = [];

  export let cargandoHistorial = false;
  export let cargandoPlanes = false;
  export let errorHistorial = '';
  export let errorPlanes = '';

  export let guardandoValoracion = false;
  export let mensajeValoracion = '';
  export let errorValoracion = '';

  export let seleccionarEstudiante;
  export let cambiarModulo;
  export let recuperarConfiguracion;
  export let guardarValoracion;

  $: historialModulo = historial.filter(
    (v) => v.imparticionId === Number(imparticionElegida)
  );
  $: indicadoresPlan = [
  ...new Map(
    [
      ...evaluables,
      ...historialModulo
        .filter(v => v.indicador)
        .map(v => v.indicador)
    ].map(indicador => [indicador.id, indicador])
  ).values()
];
</script>

<section class="panel" id="seguimiento-individual">
  <h2>Seguimiento del alumnado</h2>

  {#if grupo}
    <p>
      <strong>{grupo.nombre}</strong>
      · Curso {grupo.curso}
      · {estudiantes.length} estudiantes
    </p>

    <div class="formulario">
      <label for="imparticion">Módulo profesional</label>
      <select
        id="imparticion"
        bind:value={imparticionElegida}
        onchange={cambiarModulo}
      >
        {#each imparticiones as imparticion (imparticion.id)}
          <option value={String(imparticion.id)}>
            {imparticion.nombreModulo}
          </option>
        {/each}
      </select>

      <label for="estudiante">Estudiante</label>
      <select
        id="estudiante"
        value={estudianteElegido}
        onchange={(event) =>
          seleccionarEstudiante(event.currentTarget.value)}
      >
        {#each estudiantes as estudiante (estudiante.id)}
          <option value={String(estudiante.id)}>
            {estudiante.codigo} — {estudiante.nombre}
          </option>
        {/each}
      </select>
    </div>

    <div class="subpanel">
      <h3>Nueva valoración</h3>

      <div class="formulario">
        <label for="configuracion-evaluacion">
          Configuración de indicadores
        </label>
        <select
          id="configuracion-evaluacion"
          bind:value={configuracionEvaluacion}
          onchange={recuperarConfiguracion}
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

      {#if evaluables.length === 0}
        <p>
          Selecciona indicadores en el catálogo o recupera
          una configuración guardada.
        </p>
      {:else}
        <div class="formulario">
          <label for="indicador-valoracion">
            Indicador que deseas evaluar
          </label>
          <select
            id="indicador-valoracion"
            bind:value={indicadorValoracion}
          >
            <option value="">Selecciona un indicador</option>
            {#each evaluables as indicador (indicador.id)}
              <option value={String(indicador.id)}>
                {indicador.descripcion}
              </option>
            {/each}
          </select>

          <label for="nivel-valoracion">Nivel observado</label>
          <select id="nivel-valoracion" bind:value={nivelValoracion}>
            <option value="">Selecciona un nivel</option>
            <option value="1">1 — No demuestra el desempeño esperado</option>
            <option value="2">2 — Necesita apoyo frecuente</option>
            <option value="3">3 — Trabaja con autonomía</option>
            <option value="4">4 — Desempeño consistente y autónomo</option>
          </select>

          <label for="observacion-valoracion">
            Observación docente
          </label>
          <textarea
            id="observacion-valoracion"
            rows="3"
            bind:value={observacionValoracion}
            placeholder="Describe el comportamiento observado..."
          ></textarea>

          <button
            onclick={guardarValoracion}
            disabled={guardandoValoracion ||
              !estudianteElegido ||
              !imparticionElegida ||
              !indicadorValoracion ||
              !nivelValoracion}
          >
            {guardandoValoracion
              ? 'Guardando...'
              : 'Registrar valoración'}
          </button>
        </div>
      {/if}

      {#if mensajeValoracion}
        <p class="exito" role="status">{mensajeValoracion}</p>
      {/if}

      {#if errorValoracion}
        <p class="error" role="alert">{errorValoracion}</p>
      {/if}
    </div>

    <div class="subpanel">
      <h3>Historial de valoraciones</h3>

      {#if cargandoHistorial}
        <p>Cargando historial...</p>
      {:else if errorHistorial}
        <p class="error" role="alert">{errorHistorial}</p>
      {:else if historialModulo.length === 0}
        <p>Este estudiante todavía no tiene valoraciones en este módulo.</p>
      {:else}
        <div class="lista">
          {#each historialModulo as valoracion (valoracion.id)}
            <article class="registro">
              <div class="cabecera">
                <strong>{valoracion.indicador.descripcion}</strong>
                <span class="contador">
                  Nivel {valoracion.nivel}/4
                </span>
              </div>
              <small>
                {new Date(valoracion.fecha).toLocaleString('es-ES')}
              </small>
              {#if valoracion.observacion}
                <p>{valoracion.observacion}</p>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </div>

    <Evolucion {historial} imparticionId={imparticionElegida} />

  <PlanesRefuerzo
  {planes}
  cargando={cargandoPlanes}
  error={errorPlanes}
  estudianteId={estudianteElegido}
  imparticionId={imparticionElegida}
  indicadores={indicadoresPlan}
  {guardarPlan}
/>
  {:else}
    <p>No hay datos del grupo disponibles.</p>
  {/if}
</section>
