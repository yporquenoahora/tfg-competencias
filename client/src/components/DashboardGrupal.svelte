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
  <div class="cabecera"><div><h2>Dashboard de seguimiento grupal</h2><p>Señales para la revisión docente de competencias transversales.</p></div><button class="secundario" onclick={actualizar} disabled={cargando}>Actualizar datos</button></div>
  {#if cargando}<p>Calculando indicadores...</p>
  {:else if error}<p class="error" role="alert">{error}</p>
  {:else if seguimiento}
    <p><strong>{seguimiento.imparticion.nombreModulo}</strong> · {seguimiento.imparticion.grupo}</p>
    <div class="metricas">
      {#each metricas as [etiqueta,campo]}
        <div><span>{etiqueta}</span><strong>{seguimiento.resumen[campo] ?? 0}</strong></div>
      {/each}
    </div>
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
          <tr><td>{a.estudiante}</td><td>{a.indicador}</td><td>{a.nivelActual}/4</td><td>{a.numeroValoraciones}</td><td><span class="estado-atencion">Atención inicial</span></td></tr>
        {/each}
      </tbody></table></div>
    {/if}
    <p class="nota">Atención inicial: última valoración de nivel 1 o 2 sin dos valoraciones bajas consecutivas. Revisión prioritaria: dos últimas valoraciones de nivel 1 o 2 para el mismo indicador. Son señales docentes, no diagnósticos ni calificaciones.</p>
  {:else}<p>Selecciona una impartición para consultar el seguimiento.</p>{/if}
</section>
