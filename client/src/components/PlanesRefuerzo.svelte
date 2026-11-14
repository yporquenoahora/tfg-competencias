<script>
  export let planes = [];
  export let cargando = false;
  export let error = '';
  export let estudianteId = '';
  export let imparticionId = '';
  $: visibles = planes.filter(p => p.imparticionId === Number(imparticionId));
  export let indicadores = [];
export let guardarPlan;

let indicadorId = '';
let objetivo = '';
let descripcion = '';
let fechaRevision = '';

let guardando = false;
let mensaje = '';
let errorFormulario = '';

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
    errorFormulario = err.message;
  } finally {
    guardando = false;
  }
}
</script>
<section class="subpanel" aria-label="Planes de refuerzo del estudiante">
  <h3>Planes de refuerzo del estudiante</h3>
  {#if !estudianteId}<p>Selecciona un estudiante.</p>
  {:else if cargando}<p>Cargando planes...</p>
  {:else if error}<p class="error" role="alert">{error}</p>
  {:else if !visibles.length}<p>Este estudiante no tiene planes de refuerzo registrados en este módulo.</p>
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
  <div class="formulario-plan">
    <h4>Nuevo plan de refuerzo</h4>

    <form onsubmit={(event) => {
      event.preventDefault();
      enviarPlan();
    }}>
      <label for="plan-indicador">Indicador *</label>
      <select id="plan-indicador" bind:value={indicadorId} required>
        <option value="">Selecciona un indicador</option>
        {#each indicadores as indicador (indicador.id)}
          <option value={String(indicador.id)}>
            {indicador.descripcion}
          </option>
        {/each}
      </select>

      <label for="plan-objetivo">Objetivo *</label>
      <input
        id="plan-objetivo"
        type="text"
        bind:value={objetivo}
        required
        placeholder="Ej.: Mejorar la planificación de tareas"
      />

      <label for="plan-descripcion">Estrategia de intervención *</label>
      <textarea
        id="plan-descripcion"
        rows="4"
        bind:value={descripcion}
        required
        placeholder="Describe las acciones de refuerzo..."
      ></textarea>

      <label for="plan-revision">Fecha de revisión</label>
      <input
        id="plan-revision"
        type="date"
        bind:value={fechaRevision}
      />

      <button type="submit" disabled={guardando || !indicadores.length}>
        {guardando ? 'Guardando...' : 'Crear plan de refuerzo'}
      </button>
    </form>

    {#if mensaje}
      <p class="exito" role="status">{mensaje}</p>
    {/if}

    {#if errorFormulario}
      <p class="error" role="alert">{errorFormulario}</p>
    {/if}
  </div>
{/if}

</section>
<style>
  .formulario-plan {
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid #dfe5ed;
  }

  form {
    display: grid;
    gap: 12px;
    margin-top: 16px;
  }

  input, select, textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid #b9c9da;
    border-radius: 7px;
    font: inherit;
  }

  label {
    font-weight: 600;
  }

  button {
    justify-self: start;
  }
</style>