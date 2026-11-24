<script>
  export let filas = [];
  export let periodos = [];
  export let abrir;

  const tramos = [
    { clave: 'mejora', etiqueta: 'Mejoran', color: '#16745d' },
    { clave: 'estable', etiqueta: 'Sin cambio neto', color: '#4672a9' },
    { clave: 'retroceso', etiqueta: 'Retroceden', color: '#a63d39' },
    { clave: 'sinComparacion', etiqueta: 'Sin comparación', color: '#c9c4bc' },
  ];
  let id = '';
  let activo = null;
  $: fila = filas.find((item) => String(item.id) === id) ?? filas[0];
  $: puntos = fila ? periodos.map((periodo) => {
    const dato = fila.ventanas.find((v) => v.indice === periodo.indice);
    const e = dato?.evolucion;
    const inscritos = fila.total || 1;
    return {
      periodo, dato, inscritos,
      mejora: e?.mejora ?? 0, estable: e?.estable ?? 0, retroceso: e?.retroceso ?? 0,
      sinComparacion: fila.total - (e?.comparables ?? 0),
      proporcion: dato?.observados ? 100 * dato.dificultad / dato.observados : null,
    };
  }) : [];
  $: seleccionado = puntos.find(({ periodo }) => periodo.indice === activo)
    ?? puntos.find((punto) => punto.dato) ?? puntos[0];
  $: ancho = Math.max(700, puntos.length * 82 + 80);
  const x = (i) => 59 + i * 82;
  const y = (porcentaje) => 145 - porcentaje;
  const alto = (punto, tramo) => punto[tramo.clave] / punto.inscritos * 100;
  const inicio = (punto, i) => tramos.slice(0, i).reduce((suma, tramo) => suma + alto(punto, tramo), 0);
  function cambiarFila(evento) {
    id = evento.currentTarget.value;
    activo = null;
  }
</script>

{#if fila}
  <section class="grafico-curso" aria-label="Gráfico de evolución por quincena">
    <div class="revision-periodo">
      <label>Grupo y módulo del gráfico
        <select value={String(fila.id)} onchange={cambiarFila}>
          {#each filas as item (item.id)}
            <option value={String(item.id)}>{item.grupo} · {item.modulo}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="leyenda">
      {#each tramos as tramo (tramo.clave)}
        <span><i style:background={tramo.color}></i>{tramo.etiqueta}</span>
      {/each}
      <span><i class="muestra-linea"></i>Dificultad sobre observados</span>
    </div>
    <div class="tabla-scroll">
      <svg width={ancho} height="190" viewBox={`0 0 ${ancho} 190`} aria-label="Barras de evolución y línea de dificultades">
        {#each [0, 50, 100] as valor (valor)}
          <line x1="42" x2={ancho - 16} y1={y(valor)} y2={y(valor)} stroke="#ddd3ca" />
          <text x="35" y={y(valor) + 4} text-anchor="end">{valor}%</text>
        {/each}
        {#each puntos as punto, i (punto.periodo.indice)}
          {@const previo = puntos[i - 1]}
          {#each tramos as tramo, j (tramo.clave)}
            <rect x={x(i)} y={y(inicio(punto, j) + alto(punto, tramo))}
              width="38" height={alto(punto, tramo)} fill={tramo.color} />
          {/each}
          {#if punto.proporcion !== null}
            {#if previo && previo.proporcion !== null}
              <line x1={x(i - 1) + 19} x2={x(i) + 19} y1={y(previo.proporcion)} y2={y(punto.proporcion)}
                stroke="#302720" stroke-width="3" />
            {/if}
            <circle cx={x(i) + 19} cy={y(punto.proporcion)} r="4" stroke="#fff" fill="#302720" />
          {/if}
          {#if fila.hitos?.some((hito) => hito.quincena === punto.periodo.indice)}
            <circle cx={x(i) + 19} cy="31" r="5" fill="#c65320" />
          {/if}
          <text x={x(i) + 19} y="168" text-anchor="middle">{punto.periodo.desde.slice(8)}/{punto.periodo.desde.slice(5, 7)}</text>
        {/each}
        {#each puntos as punto, i (punto.periodo.indice)}
          <rect class="objetivo" class:activo={seleccionado === punto} x={x(i) - 4} y="22" width="46" height="154"
            role="button" tabindex="0" aria-label={`Explorar ${punto.periodo.etiqueta}`}
            onclick={() => (activo = punto.periodo.indice)}
            onkeydown={(evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                activo = punto.periodo.indice;
              }
            }} />
        {/each}
      </svg>
    </div>
    {#if seleccionado}
      <div class="detalle-grafico">
        <strong>{seleccionado.periodo.etiqueta}</strong>
        <p>
          {seleccionado.mejora} mejoran · {seleccionado.estable} sin cambio neto ·
          {seleccionado.retroceso} retroceden · {seleccionado.sinComparacion} sin comparación
        </p>
        {#if seleccionado.dato?.observados}
          <p>{seleccionado.dato.dificultad} de {seleccionado.dato.observados} observados presentan alguna dificultad.</p>
        {:else}<p>Quincena sin observaciones.</p>{/if}
        {#if seleccionado.dato?.actividades?.length}
          <p><strong>Actividades con evidencias:</strong> {seleccionado.dato.actividades.join(' · ')}</p>
        {/if}
        {#each (fila.hitos ?? []).filter((hito) => hito.quincena === seleccionado.periodo.indice) as hito (hito.id)}
          <p><strong>{hito.revisado ? 'Hito revisado' : 'Hito pendiente'}:</strong> {hito.titulo}</p>
        {/each}
        <button type="button" onclick={() => abrir(fila, seleccionado.periodo.desde, seleccionado.periodo.hasta)}>Abrir revisión de la quincena</button>
      </div>
    {/if}
    <p class="nota">Las barras comparan los mismos indicadores de cada alumno con la quincena anterior. Los colores reflejan el balance al entrar o salir del nivel de dificultad. El punto naranja señala un hito.</p>
  </section>
{/if}

<style>
  .grafico-curso { margin-block: 20px; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 12px 0; font-size: .85rem; }
  .leyenda span { display: inline-flex; align-items: center; gap: 6px; }
  .leyenda i { width: 12px; height: 12px; border-radius: 2px; }
  .leyenda .muestra-linea { height: 3px; background: #302720; }
  .objetivo { fill: transparent; cursor: pointer; }
  .objetivo.activo, .objetivo:focus { stroke: #873e1c; stroke-dasharray: 4 3; }
  svg text { fill: #514338; font-size: 11px; }
  .detalle-grafico { padding: 14px; background: #f9f4ee; border-radius: 8px; }
  .detalle-grafico p { margin: 5px 0; }
  .detalle-grafico button { margin-top: 8px; }
</style>
