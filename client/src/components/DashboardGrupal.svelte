<script>
  export let seguimiento = null;
  export let cargando = false;
  export let error = '';
  export let actualizar = () => {};
  export let verEstudiante = () => {};
  const metricas = [
    ['Estudiantes','totalEstudiantes'], ['Valoraciones','totalValoraciones'],
    ['Revisión prioritaria','estudiantesRevisionPrioritaria'], ['Alertas prioritarias','totalAlertas'],
    ['Atención inicial','estudiantesAtencionInicial'], ['Sin observaciones','estudiantesSinObservaciones']
  ];
</script>
<section class="panel dashboard">
  <div class="cabecera"><div><h2>Seguimiento del grupo</h2></div><button class="secundario" onclick={actualizar} disabled={cargando}>Actualizar datos</button></div>
  {#if cargando}<p>Calculando indicadores...</p>
  {:else if error}<p class="error" role="alert">{error}</p>
  {:else if seguimiento}
    <p><strong>{seguimiento.imparticion.nombreModulo}</strong> · {seguimiento.imparticion.grupo}</p>
    <div class="metricas">
      {#each metricas as [etiqueta,campo]}
        <div><span>{etiqueta}</span><strong>{seguimiento.resumen[campo] ?? 0}</strong></div>
      {/each}
    </div>
    <h3>Dificultades por indicador</h3>
    {#if seguimiento.porIndicador?.length}
      <p>Última observación de cada alumno para cada indicador dentro del periodo.</p>
      {#each seguimiento.porIndicador as indicador (indicador.id)}
        <details class="indicador-grupo">
          <summary>
            <strong>{indicador.nombre}</strong> · {indicador.dificultad.length} de {indicador.observados} observados
            <span class="barra-indicador">
              <meter min="0" max={indicador.observados} value={indicador.dificultad.length}
                aria-label={`Alumnado con dificultades en ${indicador.nombre}`}></meter>
            </span>
          </summary>
          {#each indicador.criterios ?? [] as criterio}
            <p><strong>{criterio.ra} · {criterio.ce}</strong> {criterio.texto}</p>
          {/each}
          {#if indicador.dificultad.length}
            <ul>{#each indicador.dificultad as alumno (alumno.id)}
              <li><button class="secundario" onclick={() => verEstudiante(alumno.id, indicador.id)}>{alumno.nombre}</button></li>
            {/each}</ul>
          {:else}<p>Las últimas observaciones están por encima del nivel de atención.</p>{/if}
        </details>
      {/each}
    {:else}<p>Este periodo aún no tiene observaciones.</p>{/if}

    <details class="indicador-grupo">
      <summary>Alumnado sin observaciones ({seguimiento.sinObservaciones?.length ?? 0})</summary>
      <ul>{#each seguimiento.sinObservaciones ?? [] as alumno (alumno.id)}
        <li><button class="secundario" onclick={() => verEstudiante(alumno.id)}>{alumno.nombre}</button></li>
      {:else}<li>Todo el alumnado tiene al menos una observación en el periodo.</li>{/each}</ul>
    </details>
    <details class="indicador-grupo">
      <summary>Refuerzos pendientes de revisión ({seguimiento.refuerzos?.length ?? 0})</summary>
      <ul>{#each seguimiento.refuerzos ?? [] as plan (plan.id)}
        <li><button class="secundario" onclick={() => verEstudiante(plan.estudianteId, plan.indicadorId)}>{plan.nombre}</button>
          {plan.objetivo} · {plan.fechaRevision ? new Date(plan.fechaRevision).toLocaleDateString('es-ES') : 'Sin fecha de revisión'}</li>
      {:else}<li>No hay refuerzos pendientes en esta consulta.</li>{/each}</ul>
    </details>

    <h3>Indicadores que requieren revisión</h3>
    {#if !seguimiento.dificultades?.length}<p>No hay alertas prioritarias. Esto no implica que todos los desempeños estén alcanzados.</p>
    {:else}
      <div class="tabla-scroll"><table><thead><tr><th>Estudiante</th><th>Indicador</th><th>Anterior</th><th>Actual</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
        {#each seguimiento.dificultades as d (`${d.estudianteId}-${d.indicadorId}`)}
          <tr><td>{d.estudiante}</td><td>{d.indicador}</td><td>{d.nivelAnterior}/4</td><td>{d.nivelActual}/4</td><td><span class="estado-revision">Revisión prioritaria</span></td><td><button class="secundario" onclick={() => verEstudiante(d.estudianteId,d.indicadorId)}>Ver estudiante</button></td></tr>
        {/each}
      </tbody></table></div>
    {/if}
    <h3>Indicadores en atención inicial</h3>
    {#if !seguimiento.atencionesIniciales?.length}<p>No hay indicadores en atención inicial.</p>
    {:else}
      <div class="tabla-scroll"><table><thead><tr><th>Estudiante</th><th>Indicador</th><th>Último nivel</th><th>Observaciones</th><th>Estado</th></tr></thead><tbody>
        {#each seguimiento.atencionesIniciales as a (`${a.estudianteId}-${a.indicadorId}`)}
          <tr><td>{a.estudiante}</td><td>{a.indicador}</td><td>{a.nivelActual}/4</td><td>{a.numeroValoraciones}</td><td><button class="secundario" onclick={() => verEstudiante(a.estudianteId, a.indicadorId)}>Ver estudiante</button></td></tr>
        {/each}
      </tbody></table></div>
    {/if}
    <p class="nota">Atención inicial: última valoración de nivel 1 o 2 sin dos valoraciones bajas consecutivas. Revisión prioritaria: dos últimas valoraciones de nivel 1 o 2 para el mismo indicador. Son señales docentes, no diagnósticos ni calificaciones.</p>
  {:else}<p>Selecciona una impartición para consultar el seguimiento.</p>{/if}
</section>

<style>
  .indicador-grupo { padding: 10px 0; border-bottom: 1px solid #e6dbd2; }
  .indicador-grupo summary { cursor: pointer; }
  .barra-indicador { display: block; }
  .indicador-grupo meter { width: min(100%, 420px); height: 22px; }
  .indicador-grupo li { margin-block: 5px; }
</style>
