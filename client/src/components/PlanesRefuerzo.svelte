<script>
  export let planes = [];
  export let cargando = false;
  export let error = '';
  export let estudianteId = '';
  export let imparticionId = '';
  export let indicadores = [];
  export let propuestas = [];
  export let guardarPlan;

  $: visibles = planes.filter(p => Number(p.imparticionId) === Number(imparticionId));

  let indicadorId = '';
  let objetivo = '';
  let descripcion = '';
  let fechaRevision = '';
  let guardando = false;
  let mensaje = '';
  let errorFormulario = '';

  // Precarga editable: no realiza ninguna petición ni guarda el plan.
  function aplicarPropuesta(propuesta) {
    indicadorId = String(propuesta.indicadorId);
    objetivo = propuesta.objetivo;
    descripcion = propuesta.descripcion;
    fechaRevision = '';
    mensaje = '';
    errorFormulario = '';
  }

  async function enviarPlan() {
    mensaje = '';
    errorFormulario = '';
    if (!estudianteId || !imparticionId || !indicadorId ||
        !objetivo.trim() || !descripcion.trim()) {
      errorFormulario = 'Completa todos los campos obligatorios.';
      return;
    }
    guardando = true;
    try {
      await guardarPlan({
        estudianteId: Number(estudianteId),
        imparticionId: Number(imparticionId),
        indicadorId: Number(indicadorId),
        objetivo: objetivo.trim(),
        descripcion: descripcion.trim(),
        fechaRevision: fechaRevision || null
      });
      indicadorId = '';
      objetivo = '';
      descripcion = '';
      fechaRevision = '';
      mensaje = 'Plan de refuerzo registrado correctamente.';
    } catch (err) {
      errorFormulario = err?.message ?? 'No se pudo guardar el plan.';
    } finally {
      guardando = false;
    }
  }
</script>

<section class="subpanel" aria-label="Planes de refuerzo del estudiante">
  <h3>Planes de refuerzo del estudiante</h3>
  {#if !estudianteId}
    <p>Selecciona un estudiante.</p>
  {:else if cargando}
    <p>Cargando planes...</p>
  {:else if error}
    <p class="error" role="alert">{error}</p>
  {:else if !visibles.length}
    <p>Este estudiante no tiene planes de refuerzo registrados en este módulo.</p>
  {:else}
    <div class="lista">
      {#each visibles as plan (plan.id)}
        <article class="registro">
          <div class="cabecera"><h4>{plan.objetivo}</h4><span class="etiqueta-estado">{plan.estado}</span></div>
          <p><strong>Indicador:</strong> {plan.indicador.descripcion}</p>
          <p><strong>Estrategia:</strong> {plan.descripcion}</p>
          <p><strong>Módulo:</strong> {plan.imparticion.nombreModulo}</p>
          <p><strong>Fecha de revisión:</strong> {plan.fechaRevision ? new Date(plan.fechaRevision).toLocaleDateString('es-ES') : 'Sin establecer'}</p>
        </article>
      {/each}
    </div>
  {/if}

  {#if estudianteId && imparticionId}
    <section class="propuestas" aria-labelledby="titulo-propuestas">
      <h4 id="titulo-propuestas">Propuestas de intervención</h4>
      {#if propuestas.length === 0}
        <p>No hay indicadores con atención pendiente según las últimas observaciones de este módulo. Puedes crear un plan manualmente.</p>
      {:else}
        <p class="nota">Propuestas orientativas basadas en las últimas valoraciones. Revisa su pertinencia antes de guardar.</p>
        {#each propuestas as propuesta (propuesta.indicadorId)}
          <article class="propuesta">
            <strong>{propuesta.indicador}</strong>
            <p><span class="estado">{propuesta.estado === 'revision_prioritaria' ? 'Revisión prioritaria' : 'Atención inicial'}</span> · Nivel actual {propuesta.nivelActual}/4</p>
            <p>{propuesta.descripcion}</p>
            <button type="button" class="boton-propuesta" onclick={() => aplicarPropuesta(propuesta)}>Aplicar al formulario</button>
          </article>
        {/each}
      {/if}
    </section>

    <div class="formulario-plan">
      <h4>Nuevo plan de refuerzo</h4>
      <form onsubmit={(event) => { event.preventDefault(); enviarPlan(); }}>
        <label for="plan-indicador">Indicador *</label>
        <select id="plan-indicador" bind:value={indicadorId} required>
          <option value="">Selecciona un indicador</option>
          {#each indicadores as indicador (indicador.id)}
            <option value={String(indicador.id)}>{indicador.descripcion}</option>
          {/each}
        </select>
        <label for="plan-objetivo">Objetivo *</label>
        <input id="plan-objetivo" type="text" bind:value={objetivo} required placeholder="Ej.: Mejorar la planificación de tareas" />
        <label for="plan-descripcion">Estrategia de intervención *</label>
        <textarea id="plan-descripcion" rows="4" bind:value={descripcion} required placeholder="Describe las acciones de refuerzo..."></textarea>
        <label for="plan-revision">Fecha de revisión</label>
        <input id="plan-revision" type="date" bind:value={fechaRevision} />
        <button type="submit" disabled={guardando || !indicadores.length}>{guardando ? 'Guardando...' : 'Crear plan de refuerzo'}</button>
      </form>
      {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}
      {#if errorFormulario}<p class="error" role="alert">{errorFormulario}</p>{/if}
    </div>
  {/if}
</section>

<style>
  .propuestas { margin-top: 20px; padding: 14px; border: 1px solid #f2d7c4; border-radius: 10px; background: #fffaf6; }
  .propuestas h4 { margin: 0 0 8px; }
  .propuesta { padding: 12px 0; border-top: 1px solid #f2d7c4; }
  .propuesta p { margin: 7px 0; }
  .nota { color: #795f50; font-size: .9rem; }
  .estado { color: #a94317; font-weight: 600; }
  .boton-propuesta { background: #fff3e8; border: 1px solid #c95622; color: #873e1c; padding: 8px 12px; border-radius: 7px; cursor: pointer; }
  .formulario-plan { margin-top: 28px; padding-top: 24px; border-top: 1px solid #f2d7c4; }
  form { display: grid; gap: 12px; margin-top: 16px; }
  input, select, textarea { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #d9bda8; border-radius: 7px; font: inherit; }
  label { font-weight: 600; }
  button[type="submit"] { justify-self: start; background: #c95622; color: white; padding: 10px 14px; border: 0; border-radius: 8px; cursor: pointer; }
  button:disabled { opacity: .55; cursor: not-allowed; }
</style>
