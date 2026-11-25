<script>
  export let seguimiento = null;
  export let cargando = false;
  export let error = '';
  export let actualizar = () => {};
  export let verEstudiante = () => {};
  let vistaCasos = 'prioridad';
  const metricas = [
    ['Alumnado activo', 'totalEstudiantes', null],
    ['Valoraciones', 'totalValoraciones', null],
    ['Revisión prioritaria', 'estudiantesRevisionPrioritaria', 'prioridad'],
    ['Atención inicial', 'estudiantesAtencionInicial', 'atencion'],
    ['Sin observaciones', 'estudiantesSinObservaciones', 'cobertura'],
  ];
  const vistas = [
    ['prioridad', 'Prioridad'], ['atencion', 'Atención'],
    ['cobertura', 'Sin observaciones'], ['refuerzos', 'Refuerzos'],
  ];
  $: observados = seguimiento?.resumen.estudiantesObservados ?? 0;
  $: total = seguimiento?.resumen.totalEstudiantes ?? 0;
  let errorInforme = '';
  function imprimirGrupo() {
    errorInforme = '';
    const ventana = window.open('', '_blank', 'width=900,height=720');
    if (!ventana) { errorInforme = 'Permite las ventanas emergentes para abrir el informe.'; return; }
    ventana.opener = null;
    const doc = ventana.document;
    doc.documentElement.lang = 'es';
    doc.title = 'Informe de seguimiento del grupo';
    const estilo = doc.createElement('style');
    estilo.textContent = 'body{font:15px system-ui;max-width:850px;margin:32px auto;padding:0 18px;color:#252122} table{width:100%;border-collapse:collapse} td,th{padding:8px;border:1px solid #ddd;text-align:left} @media print{button{display:none}}';
    doc.head.append(estilo);
    const agregar = (tag, texto, padre = doc.body) => {
      const nodo = doc.createElement(tag);
      nodo.textContent = texto;
      padre.append(nodo);
      return nodo;
    };
    agregar('h1', doc.title);
    agregar('p', `${seguimiento.imparticion.grupo} · ${seguimiento.imparticion.nombreModulo}`);
    const periodo = seguimiento.periodo;
    const mostrarFecha = (fecha) => fecha?.split('-').reverse().join('/');
    agregar('p', periodo?.desde || periodo?.hasta
      ? `Periodo: ${mostrarFecha(periodo.desde) ?? 'Inicio'} — ${mostrarFecha(periodo.hasta) ?? 'Última observación'}`
      : 'Periodo completo');
    agregar('p', `${observados}/${total} alumnos con observaciones · ${seguimiento.resumen.totalValoraciones} valoraciones`);
    const imprimir = agregar('button', 'Imprimir o guardar PDF');
    imprimir.addEventListener('click', () => ventana.print());
    agregar('h2', 'Dificultad por indicador');
    const tabla = agregar('table', '');
    const cabecera = agregar('tr', '', tabla);
    for (const titulo of ['Indicador', 'En dificultad / observados', 'RA y CE']) agregar('th', titulo, cabecera);
    for (const fila of seguimiento.porIndicador ?? []) {
      const tr = agregar('tr', '', tabla);
      agregar('td', fila.nombre, tr);
      agregar('td', `${fila.dificultad.length}/${fila.observados}`, tr);
      agregar('td', (fila.criterios ?? []).map(({ ra, ce }) => `${ra} · ${ce}`).join(', ') || 'Sin vínculo registrado', tr);
    }
    for (const [titulo, casos, nombre] of [
      ['Revisión prioritaria', seguimiento.dificultades, (v) => `${v.estudiante} · ${v.indicador}`],
      ['Atención inicial', seguimiento.atencionesIniciales, (v) => `${v.estudiante} · ${v.indicador}`],
      ['Sin observaciones', seguimiento.sinObservaciones, (v) => v.nombre],
      ['Refuerzos pendientes', seguimiento.refuerzos, (v) => `${v.nombre} · ${v.objetivo}`],
    ]) {
      agregar('h2', titulo);
      if (!casos?.length) agregar('p', 'Sin casos en este periodo.');
      else {
        const lista = agregar('ul', '');
        for (const caso of casos) agregar('li', nombre(caso), lista);
      }
    }
  }
</script>
<section class="panel dashboard">
  <div class="cabecera"><div><h2>Seguimiento del grupo</h2></div><div class="selector-casos">
    <button class="secundario" onclick={actualizar} disabled={cargando}>Actualizar datos</button>
    <button onclick={imprimirGrupo} disabled={cargando || !seguimiento}>Informe de grupo</button>
  </div></div>
  {#if errorInforme}<p class="error" role="alert">{errorInforme}</p>{/if}
  {#if cargando}<p>Calculando indicadores...</p>
  {:else if error}<p class="error" role="alert">{error}</p>
  {:else if seguimiento}
    <p><strong>{seguimiento.imparticion.nombreModulo}</strong> · {seguimiento.imparticion.grupo}</p>
    <div class="metricas">
      {#each metricas as [etiqueta, campo, vista] (campo)}
        {#if vista}
          <button type="button" class="metrica" aria-pressed={vistaCasos === vista}
            onclick={() => (vistaCasos = vista)}>
            <span>{etiqueta}</span><strong>{seguimiento.resumen[campo] ?? 0}</strong>
          </button>
        {:else}
          <div class="metrica"><span>{etiqueta}</span><strong>{seguimiento.resumen[campo] ?? 0}</strong></div>
        {/if}
      {/each}
    </div>
    <div class="tablero-grupo">
      <section class="tarjeta-mando">
        <h3>Cobertura del periodo</h3>
        <p><strong>{observados} de {total}</strong> alumnos con observaciones</p>
        {#if total}
          <meter min="0" max={total} value={observados} aria-label="Alumnos con observaciones"></meter>
        {/if}
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

      </section>
      <section class="tarjeta-mando">
        <h3>Cola de seguimiento</h3>
        <div class="selector-casos" aria-label="Filtrar casos">
          {#each vistas as [clave, etiqueta] (clave)}
            <button type="button" class="secundario" aria-pressed={vistaCasos === clave}
              onclick={() => (vistaCasos = clave)}>{etiqueta}</button>
          {/each}
        </div>
        <div class="casos-scroll" role="region" aria-label="Casos del grupo">
        {#if vistaCasos === 'prioridad'}
    <h3>Indicadores que requieren revisión</h3>
    {#if !seguimiento.dificultades?.length}<p>No hay alertas prioritarias. Esto no implica que todos los desempeños estén alcanzados.</p>
    {:else}
      <div class="tabla-scroll"><table><thead><tr><th>Estudiante</th><th>Indicador</th><th>Anterior</th><th>Actual</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
        {#each seguimiento.dificultades as d (`${d.estudianteId}-${d.indicadorId}`)}
          <tr><td>{d.estudiante}</td><td>{d.indicador}</td><td>{d.nivelAnterior}/4</td><td>{d.nivelActual}/4</td><td><span class="estado-revision">Revisión prioritaria</span></td><td><button class="secundario" onclick={() => verEstudiante(d.estudianteId,d.indicadorId)}>Ver estudiante</button></td></tr>
        {/each}
      </tbody></table></div>
    {/if}
        {:else if vistaCasos === 'atencion'}
    <h3>Indicadores en atención inicial</h3>
    {#if !seguimiento.atencionesIniciales?.length}<p>No hay indicadores en atención inicial.</p>
    {:else}
      <div class="tabla-scroll"><table><thead><tr><th>Estudiante</th><th>Indicador</th><th>Último nivel</th><th>Observaciones</th><th>Estado</th></tr></thead><tbody>
        {#each seguimiento.atencionesIniciales as a (`${a.estudianteId}-${a.indicadorId}`)}
          <tr><td>{a.estudiante}</td><td>{a.indicador}</td><td>{a.nivelActual}/4</td><td>{a.numeroValoraciones}</td><td><button class="secundario" onclick={() => verEstudiante(a.estudianteId, a.indicadorId)}>Ver estudiante</button></td></tr>
        {/each}
      </tbody></table></div>
    {/if}
        {:else if vistaCasos === 'cobertura'}
    <section>
      <h4>Alumnado sin observaciones ({seguimiento.sinObservaciones?.length ?? 0})</h4>
      <ul>{#each seguimiento.sinObservaciones ?? [] as alumno (alumno.id)}
        <li><button class="secundario" onclick={() => verEstudiante(alumno.id)}>{alumno.nombre}</button></li>
      {:else}<li>Todo el alumnado tiene al menos una observación en el periodo.</li>{/each}</ul>
    </section>
        {:else}
    <section>
      <h4>Refuerzos pendientes de revisión ({seguimiento.refuerzos?.length ?? 0})</h4>
      <ul>{#each seguimiento.refuerzos ?? [] as plan (plan.id)}
        <li><button class="secundario" onclick={() => verEstudiante(plan.estudianteId, plan.indicadorId)}>{plan.nombre}</button>
          {plan.objetivo} · {plan.fechaRevision ? new Date(plan.fechaRevision).toLocaleDateString('es-ES') : 'Sin fecha de revisión'}</li>
      {:else}<li>No hay refuerzos pendientes en esta consulta.</li>{/each}</ul>
    </section>

        {/if}
        </div>
      </section>
    </div>
    <p class="nota">Atención inicial: última valoración de nivel 1 o 2 sin dos valoraciones bajas consecutivas. Revisión prioritaria: dos últimas valoraciones de nivel 1 o 2 para el mismo indicador. Son señales docentes, no diagnósticos ni calificaciones.</p>
  {:else}<p>Selecciona una impartición para consultar el seguimiento.</p>{/if}
</section>

<style>
  .indicador-grupo { padding: 10px 0; border-bottom: 1px solid #e6dbd2; }
  .indicador-grupo summary { cursor: pointer; }
  .barra-indicador { display: block; }
  .indicador-grupo meter { width: min(100%, 420px); height: 22px; }
  .indicador-grupo li { margin-block: 5px; }
  .tablero-grupo { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 5fr); gap: 16px; }
  .tarjeta-mando { min-width: 0; border: 1px solid #e4d7cb; border-radius: 10px; padding: 14px; }
  .tarjeta-mando h3 { margin-top: 0; }
  .tarjeta-mando meter { width: 100%; }
  .dashboard .metricas { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr)); gap: 8px; }
  .metrica { text-align: left; min-width: 0; color: #4d3125; border: 1px solid #e4d7cb; border-radius: 8px; background: #faf4ed; padding: 10px; }
  .metrica strong, .metrica span { display: block; }
  .metrica strong { font-size: 1.6rem; }
  .metrica[aria-pressed="true"], .selector-casos button[aria-pressed="true"] { outline: 2px solid #a84b25; outline-offset: -2px; }
  .selector-casos { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .casos-scroll { max-height: 320px; overflow: auto; }
  @media (max-width: 950px) { .tablero-grupo { grid-template-columns: 1fr; } }
</style>
