<script>
  import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';
  export let puntos = [];
  export let motivos = [];
  export let motivo = '';

  const colores = ['#237d71', '#b34b2d', '#6554a0'];
  const izquierda = 66, derecha = 668, arriba = 30, abajo = 320;
  const escalaX = (v) => izquierda + (derecha - izquierda) * v;
  const escalaY = (v) => abajo - (abajo - arriba) * v;
  const porcentaje = (v) => `${Math.round(v * 100)} %`;
  const niveles = [0, .25, .5, .75, 1];
  let abierto = null;
  let elegido = '';
  let ejeManual = '';
  $: reiniciar(puntos);
  $: eje = motivos.some(([clave]) => clave === ejeManual) ? ejeManual : motivo || motivos[0]?.[0];
  $: indiceEje = motivos.findIndex(([clave]) => clave === eje);
  $: etiquetaEje = motivos[indiceEje]?.[1] ?? 'Motivo';
  $: grupos = resumir(puntos, motivos);
  $: nodos = simular(grupos, abierto, indiceEje);
  $: nodoActivo = nodos.find((nodo) => nodo.id === elegido);
  $: grupoActivo = grupos.find((grupo) => grupo.cluster === abierto);

  function reiniciar() {
    abierto = null;
    elegido = '';
  }

  function resumir(datos, categorias) {
    const resumen = new Map();
    for (const perfil of datos) {
      if (!resumen.has(perfil.cluster)) resumen.set(perfil.cluster, []);
      resumen.get(perfil.cluster).push(perfil);
    }
    return [...resumen].map(([cluster, miembros]) => {
      const media = (obtener) => miembros.reduce((suma, p) => suma + obtener(p), 0) / miembros.length;
      const vector = categorias.map((_, i) => media((p) => p.vector[i]));
      const dominante = vector.indexOf(Math.max(...vector));
      return { id: `cluster-${cluster}`, cluster, miembros, vector, proporcion: media((p) => p.proporcion),
        nombre: vector[dominante] > 0 ? categorias[dominante][1] : 'Sin motivo predominante' };
    });
  }

  function simular(grupos, abierto, eje) {
    const maxGrupo = Math.max(1, ...grupos.map((g) => g.miembros.length));
    const maxEntregas = Math.max(1, ...grupos.flatMap((g) => g.miembros.map((p) => p.afectadas)));
    const nodos = grupos.flatMap((grupo) => grupo.cluster === abierto
      ? grupo.miembros.map((p) => ({ ...p, radio: Math.sqrt(20 + 130 * p.afectadas / maxEntregas) }))
      : [{ ...grupo, radio: Math.sqrt(200 + 1000 * grupo.miembros.length / maxGrupo) }]);
    for (const nodo of nodos) {
      nodo.objetivoX = escalaX(nodo.vector[eje] ?? 0);
      nodo.objetivoY = escalaY(nodo.proporcion);
      const r = nodo.radio;
      nodo.x = Math.min(derecha - r, Math.max(izquierda + r, nodo.objetivoX));
      nodo.y = Math.min(abajo - r, Math.max(arriba + r, nodo.objetivoY));
    }
    const simulacion = forceSimulation(nodos).stop()
      .force('x', forceX((n) => n.objetivoX).strength(.26))
      .force('y', forceY((n) => n.objetivoY).strength(.26))
      .force('colision', forceCollide((n) => n.radio + 3).iterations(3));
    for (let paso = 0; paso < 160; paso++) {
      simulacion.tick();
      for (const nodo of nodos) {
        const r = nodo.radio;
        nodo.x = Math.min(derecha - r, Math.max(izquierda + r, nodo.x));
        nodo.y = Math.min(abajo - r, Math.max(arriba + r, nodo.y));
      }
    }
    return nodos;
  }

  function activar(nodo) {
    if (nodo.miembros) {
      abierto = nodo.cluster;
      elegido = '';
    } else {
      elegido = nodo.id;
    }
  }
</script>

<div class="revision-periodo">
  <label>Motivo del eje X
    <select value={eje} onchange={(e) => (ejeManual = e.currentTarget.value)}>
      {#each motivos as [clave, nombre] (clave)}<option value={clave}>{nombre}</option>{/each}
    </select>
  </label>
  {#if grupoActivo}
    <button type="button" class="secundario" onclick={reiniciar}>Volver a los clústeres</button>
  {/if}
</div>

<p class="nota">Eje X: entregas afectadas por el motivo elegido. Eje Y: entregas con alguna dificultad. Ambos se expresan sobre las entregas observadas. El área distingue el volumen del clúster o, al abrirlo, las entregas en dificultad por perfil. Las fuerzas separan las burbujas cercanas.</p>

<div class="tabla-scroll">
  <svg viewBox="0 0 704 376" aria-label="Diagrama de fuerza de dificultades">
    {#each niveles as nivel (nivel)}
      {@const x = escalaX(nivel)}
      {@const y = escalaY(nivel)}
      <line x1={izquierda} x2={derecha} y1={y} y2={y} stroke="#e4d7cb" />
      <line x1={x} x2={x} y1={arriba} y2={abajo} stroke="#eee4db" />
      <text x="56" y={y + 4} text-anchor="end">{porcentaje(nivel)}</text>
      <text x={x} y={abajo + 19} text-anchor="middle">{porcentaje(nivel)}</text>
    {/each}
    <text x="367" y="366" text-anchor="middle">{etiquetaEje}</text>
    <text transform="translate(15 174) rotate(-90)" text-anchor="middle">Entregas en dificultad</text>

    {#each nodos as nodo (nodo.id)}
      {#if nodo === nodoActivo}
        <line x1={nodo.objetivoX} x2={nodo.x} y1={nodo.objetivoY} y2={nodo.y}
          stroke="#483125" stroke-dasharray="3 3" />
        <circle cx={nodo.objetivoX} cy={nodo.objetivoY} r="3" fill="#483125" />
      {/if}
    {/each}
    {#each nodos as nodo (nodo.id)}
      {@const etiqueta = nodo.miembros ? `${nodo.nombre} · ${nodo.miembros.length} perfiles` : `${nodo.grupo} · perfil ${nodo.id.split('/')[0]}`}
      <g role="button" tabindex="0" aria-label={etiqueta}
        aria-pressed={nodo.id === elegido}
        onclick={() => activar(nodo)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(nodo); }
        }}>
        <title>{etiqueta} · {porcentaje(nodo.vector[indiceEje] ?? 0)} para el motivo · {porcentaje(nodo.proporcion)} en dificultad</title>
        <circle cx={nodo.x} cy={nodo.y} r={nodo.radio} fill={colores[nodo.cluster]}
          opacity={abierto != null && nodo.miembros ? .42 : .9} stroke={nodo === nodoActivo ? '#2f241d' : '#fff'} stroke-width="2" />
        {#if nodo.miembros}
          <text class="cantidad" x={nodo.x} y={nodo.y + 4} text-anchor="middle">{nodo.miembros.length}</text>
        {/if}
      </g>
    {/each}
  </svg>
</div>

{#if grupoActivo}
  <p><strong>{grupoActivo.nombre}</strong> · {grupoActivo.miembros.length} perfiles abiertos</p>
  {#if nodoActivo}
    <p aria-live="polite">{nodoActivo.grupo} · Perfil {nodoActivo.id.split('/')[0]} ·
      {nodoActivo.afectadas}/{nodoActivo.entregas} entregas en dificultad · {nodoActivo.cobertura} unidades ·
      {porcentaje(nodoActivo.vector[indiceEje] ?? 0)} para {etiquetaEje}.</p>
  {:else}<p>Selecciona un perfil para consultar sus recuentos.</p>{/if}
{/if}

<div class="acciones">
  {#each grupos as grupo (grupo.id)}
    <button type="button" class="secundario" aria-pressed={abierto === grupo.cluster} onclick={() => activar(grupo)}>
      <span class="marca" style:background={colores[grupo.cluster]}></span>
      {grupo.nombre} · {grupo.miembros.length} perfiles
    </button>
  {/each}
</div>

<style>
  svg { display:block; width:min(100%, 800px); min-width:360px; }
  text { font:11px system-ui; fill:#4b3a30; }
  .cantidad { fill:white; font-weight:700; pointer-events:none; }
  g[role=button] { cursor:pointer; }
  g[role=button]:focus { outline:none; }
  g[role=button]:focus circle { stroke:#2f241d; stroke-width:3; }
  .marca { display:inline-block; width:.75em; height:.75em; border-radius:100%; }
  button[aria-pressed=true] { outline:2px solid #a84b25; }
</style>
