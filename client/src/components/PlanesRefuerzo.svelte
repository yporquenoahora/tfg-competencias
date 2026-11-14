<script>
  export let planes = [];
  export let cargando = false;
  export let error = '';
  export let estudianteId = '';
  export let imparticionId = '';
  $: visibles = planes.filter(p => p.imparticionId === Number(imparticionId));
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
</section>
