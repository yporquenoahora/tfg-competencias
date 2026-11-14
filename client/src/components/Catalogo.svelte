<script>
  export let competencias = [];
  export let seleccionados = [];
  export let cargando = false;
  export let error = '';
  export let configuraciones = [];
  export let onGuardar = async () => {};
  let expandidas = [];
  let nombre = '', descripcion = '', configuracionElegida = '';
  let guardando = false, mensaje = '', errorLocal = '';
  const indicadores = c => (c.dimensiones ?? []).flatMap(d => d.indicadores ?? []);
  $: activas = competencias.filter(c => indicadores(c).some(i => seleccionados.includes(i.id)));
  $: disponibles = competencias.reduce((n,c) => n + indicadores(c).length, 0);
  function cambiarIndicador(id) { seleccionados = seleccionados.includes(id) ? seleccionados.filter(x=>x!==id) : [...seleccionados,id]; }
  function cambiarCompetencia(c) {
    const ids = indicadores(c).map(i=>i.id);
    seleccionados = ids.every(id=>seleccionados.includes(id)) ? seleccionados.filter(id=>!ids.includes(id)) : [...new Set([...seleccionados,...ids])];
  }
  export function recuperar(id) {
    const c = configuraciones.find(c=>c.id===Number(id));
    if (!c) return;
    configuracionElegida=String(c.id);
    seleccionados=c.indicadores.map(i=>i.indicadorId);
    nombre=c.nombre; descripcion=c.descripcion??'';
    expandidas=competencias.filter(c=>indicadores(c).some(i=>seleccionados.includes(i.id))).map(c=>c.id);
    mensaje='Configuración recuperada correctamente'; errorLocal='';
  }
  async function guardar() {
    mensaje=''; errorLocal='';
    if (!nombre.trim() || !seleccionados.length) { errorLocal='Indica un nombre y selecciona al menos un indicador'; return; }
    guardando=true;
    try { const c=await onGuardar({nombre:nombre.trim(),descripcion:descripcion.trim(),indicadorIds:seleccionados}); configuracionElegida=String(c.id); mensaje='Configuración guardada correctamente'; }
    catch(e) { errorLocal=e.message; } finally { guardando=false; }
  }
</script>
<div class="metricas"><div><span>Competencias seleccionadas</span><strong>{activas.length}</strong></div><div><span>Indicadores seleccionados</span><strong>{seleccionados.length}</strong></div><div><span>Indicadores disponibles</span><strong>{disponibles}</strong></div></div>
<section class="panel">
  <div class="cabecera"><div><h2>Catálogo de competencias</h2><p>Selecciona competencias completas o indicadores individuales.</p></div><button class="secundario" onclick={() => seleccionados=[]} disabled={!seleccionados.length}>Limpiar selección</button></div>
  {#if cargando}<p>Cargando catálogo...</p>{:else if error}<p class="error" role="alert">{error}</p>{:else if !competencias.length}<p>No hay competencias registradas.</p>
  {:else}<div class="lista">
    {#each competencias as c (c.id)}
      <article class="registro"><div class="cabecera"><div><h3>{c.nombre}</h3>{#if c.descripcion}<p>{c.descripcion}</p>{/if}<small>Fuente: {c.fuente?.nombre ?? 'Sin especificar'}</small></div><span class="contador">{indicadores(c).filter(i=>seleccionados.includes(i.id)).length}/{indicadores(c).length}</span></div>
      <div class="acciones"><button class="secundario" onclick={() => expandidas=expandidas.includes(c.id)?expandidas.filter(x=>x!==c.id):[...expandidas,c.id]}>{expandidas.includes(c.id)?'Ocultar indicadores':'Ver dimensiones e indicadores'}</button><button onclick={() => cambiarCompetencia(c)} disabled={!indicadores(c).length}>{indicadores(c).length && indicadores(c).every(i=>seleccionados.includes(i.id))?'Deseleccionar todos':'Seleccionar todos'}</button></div>
      {#if expandidas.includes(c.id)}<div class="dimensiones">{#each c.dimensiones??[] as d (d.id)}<div class="dimension"><h4>{d.nombre}</h4>{#if d.descripcion}<p>{d.descripcion}</p>{/if}{#each d.indicadores??[] as i (i.id)}<label class="indicador"><input type="checkbox" checked={seleccionados.includes(i.id)} onchange={() => cambiarIndicador(i.id)}/>{i.descripcion}</label>{/each}</div>{/each}</div>{/if}
      </article>
    {/each}
  </div>{/if}
</section>
<section class="panel"><h2>Resumen de configuración</h2>{#if !seleccionados.length}<p>No has seleccionado ningún indicador.</p>{:else}{#each activas as c (c.id)}<div class="registro"><h3>{c.nombre}</h3>{#each c.dimensiones??[] as d (d.id)}{@const activos=(d.indicadores??[]).filter(i=>seleccionados.includes(i.id))}{#if activos.length}<h4>{d.nombre}</h4><ul>{#each activos as i (i.id)}<li>{i.descripcion}</li>{/each}</ul>{/if}{/each}</div>{/each}{/if}</section>
<section class="panel"><h2>Guardar y recuperar configuraciones</h2>
  <div class="formulario"><label for="nombre-config">Nombre de configuración</label><input id="nombre-config" bind:value={nombre} placeholder="Ejemplo: Lenguajes de Marcas - Grupo A"/><label for="desc-config">Descripción</label><textarea id="desc-config" rows="3" bind:value={descripcion}></textarea><button onclick={guardar} disabled={guardando}>{guardando?'Guardando...':'Guardar nueva configuración'}</button></div>
  <div class="formulario"><label for="recuperar-config">Configuraciones guardadas</label><select id="recuperar-config" bind:value={configuracionElegida}><option value="">Selecciona una configuración</option>{#each configuraciones as c (c.id)}<option value={String(c.id)}>{c.nombre} ({c.indicadores.length} indicadores)</option>{/each}</select><button class="secundario" onclick={() => recuperar(configuracionElegida)} disabled={!configuracionElegida}>Cargar configuración</button></div>
  {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}{#if errorLocal}<p class="error" role="alert">{errorLocal}</p>{/if}
</section>
