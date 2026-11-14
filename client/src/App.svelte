<script>
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import Catalogo from './components/Catalogo.svelte';
  import DashboardGrupal from './components/DashboardGrupal.svelte';
  import Evolucion from './components/Evolucion.svelte';
  import PlanesRefuerzo from './components/PlanesRefuerzo.svelte';
  import './app.css';

  let catalogo;
  let competencias=[], configuraciones=[], grupo=null, estudiantes=[], imparticiones=[];
  let seleccionados=[], estudianteElegido='', imparticionElegida='';
  let historial=[], planes=[], seguimiento=null;
  let cargandoCatalogo=true, cargandoGrupo=true, cargandoHistorial=false, cargandoPlanes=false, cargandoSeguimiento=false;
  let errorCatalogo='', errorGrupo='', errorHistorial='', errorPlanes='', errorSeguimiento='';
  let indicadorValoracion='', nivelValoracion='', observacionValoracion='';
  let guardandoValoracion=false, mensajeValoracion='', errorValoracion='';
  let configuracionEvaluacion='';
  let solicitudEstudiante=0, solicitudSeguimiento=0;

  const indicadoresDe = c => (c.dimensiones??[]).flatMap(d=>d.indicadores??[]);
  $: evaluables=competencias.flatMap(indicadoresDe).filter(i=>seleccionados.includes(i.id));
  $: if (indicadorValoracion && !evaluables.some(i=>String(i.id)===indicadorValoracion)) indicadorValoracion='';
  $: historialModulo=historial.filter(v=>v.imparticionId===Number(imparticionElegida));

  async function cargarCatalogo() {
    cargandoCatalogo=true; errorCatalogo='';
    try { competencias=await api('/competencias'); configuraciones=await api('/configuraciones'); }
    catch(e) { errorCatalogo=e.message; } finally { cargandoCatalogo=false; }
  }
  async function guardarConfiguracion(datos) {
    const nueva=await api('/configuraciones',{method:'POST',body:JSON.stringify(datos)});
    configuraciones=await api('/configuraciones'); return nueva;
  }
  async function cargarGrupo() {
    cargandoGrupo=true; errorGrupo='';
    try {
      grupo=await api('/grupos/1/estudiantes');
      estudiantes=grupo.estudiantes??[]; imparticiones=grupo.imparticiones??[];
      imparticionElegida=imparticiones.length?String(imparticiones[0].id):'';
      await Promise.all([seleccionarEstudiante(estudiantes[0]?.id??''),cargarSeguimiento()]);
    } catch(e) { errorGrupo=e.message; } finally { cargandoGrupo=false; }
  }
  async function seleccionarEstudiante(id, indicadorId=null) {
    estudianteElegido=id?String(id):'';
    if (indicadorId) indicadorValoracion=String(indicadorId);
    mensajeValoracion=''; historial=[]; planes=[]; errorHistorial=''; errorPlanes='';
    const actual=++solicitudEstudiante;
    if (!estudianteElegido) return;
    cargandoHistorial=true; cargandoPlanes=true;
    const [h,p]=await Promise.allSettled([
      api(`/estudiantes/${estudianteElegido}/valoraciones`),
      api(`/estudiantes/${estudianteElegido}/planes-refuerzo`)
    ]);
    if (actual!==solicitudEstudiante) return;
    if(h.status==='fulfilled') historial=h.value.valoraciones??[]; else errorHistorial=h.reason.message;
    if(p.status==='fulfilled') planes=p.value.planes??[]; else errorPlanes=p.reason.message;
    cargandoHistorial=false; cargandoPlanes=false;
  }
  async function cargarSeguimiento() {
    seguimiento=null; errorSeguimiento='';
    const id=imparticionElegida, actual=++solicitudSeguimiento;
    if(!id) return;
    cargandoSeguimiento=true;
    try { const datos=await api(`/imparticiones/${id}/seguimiento`); if(actual===solicitudSeguimiento) seguimiento=datos; }
    catch(e) { if(actual===solicitudSeguimiento) errorSeguimiento=e.message; }
    finally { if(actual===solicitudSeguimiento) cargandoSeguimiento=false; }
  }
  function cambiarModulo() { cargarSeguimiento(); }
  function recuperarConfiguracion() { if(configuracionEvaluacion) catalogo?.recuperar(configuracionEvaluacion); }
  async function guardarValoracion() {
    mensajeValoracion=''; errorValoracion='';
    const estudianteId=Number(estudianteElegido), imparticionId=Number(imparticionElegida);
    const indicadorId=Number(indicadorValoracion), nivel=Number(nivelValoracion);
    if(!estudianteId||!imparticionId||!evaluables.some(i=>i.id===indicadorId)||!Number.isInteger(nivel)||nivel<1||nivel>4) {
      errorValoracion='Completa estudiante, indicador y nivel'; return;
    }
    guardandoValoracion=true;
    try {
      await api('/valoraciones',{method:'POST',body:JSON.stringify({estudianteId,imparticionId,indicadorId,nivel,observacion:observacionValoracion.trim()})});
      observacionValoracion=''; nivelValoracion=''; mensajeValoracion='Valoración registrada correctamente';
      await Promise.all([seleccionarEstudiante(estudianteId),cargarSeguimiento()]);
    } catch(e) { errorValoracion=e.message; } finally { guardandoValoracion=false; }
  }
  onMount(() => { cargarCatalogo(); cargarGrupo(); });
</script>
<svelte:head><title>Seguimiento de competencias transversales | TFE</title><meta name="description" content="Configuración y seguimiento docente en Formación Profesional"/></svelte:head>
<main class="contenedor">
  <header><span class="etiqueta">TFE · FORMACIÓN PROFESIONAL</span><h1>Configuración del seguimiento</h1><p>Selecciona competencias, observa indicadores y planifica intervenciones docentes.</p></header>
  <Catalogo bind:this={catalogo} {competencias} {configuraciones} bind:seleccionados cargando={cargandoCatalogo} error={errorCatalogo} onGuardar={guardarConfiguracion}/>
  <section class="panel" id="seguimiento-individual">
    <h2>Seguimiento del alumnado</h2>
    {#if cargandoGrupo}<p>Cargando estudiantes...</p>
    {:else if errorGrupo}<p class="error" role="alert">{errorGrupo}</p><button onclick={cargarGrupo}>Reintentar</button>
    {:else if grupo}
      <p><strong>{grupo.nombre}</strong> · Curso {grupo.curso} · {estudiantes.length} estudiantes</p>
      <div class="formulario"><label for="imparticion">Módulo profesional</label><select id="imparticion" bind:value={imparticionElegida} onchange={cambiarModulo}>{#each imparticiones as i (i.id)}<option value={String(i.id)}>{i.nombreModulo}</option>{/each}</select>
      <label for="estudiante">Estudiante</label><select id="estudiante" bind:value={estudianteElegido} onchange={() => seleccionarEstudiante(estudianteElegido)}>{#each estudiantes as e (e.id)}<option value={String(e.id)}>{e.codigo} — {e.nombre}</option>{/each}</select></div>
      <div class="subpanel"><h3>Nueva valoración</h3>
        <div class="formulario"><label for="configuracion-evaluacion">Configuración de indicadores</label><select id="configuracion-evaluacion" bind:value={configuracionEvaluacion} onchange={recuperarConfiguracion}><option value="">Selecciona una configuración guardada</option>{#each configuraciones as c (c.id)}<option value={String(c.id)}>{c.nombre} ({c.indicadores.length} indicadores)</option>{/each}</select></div>
        {#if !evaluables.length}<p>Selecciona indicadores en el catálogo o recupera una configuración guardada.</p>
        {:else}<div class="formulario"><label for="indicador-valoracion">Indicador que deseas evaluar</label><select id="indicador-valoracion" bind:value={indicadorValoracion}><option value="">Selecciona un indicador</option>{#each evaluables as i (i.id)}<option value={String(i.id)}>{i.descripcion}</option>{/each}</select>
          <label for="nivel-valoracion">Nivel observado</label><select id="nivel-valoracion" bind:value={nivelValoracion}><option value="">Selecciona un nivel</option><option value="1">1 — No demuestra el desempeño esperado</option><option value="2">2 — Necesita apoyo frecuente</option><option value="3">3 — Trabaja con autonomía</option><option value="4">4 — Desempeño consistente y autónomo</option></select>
          <label for="observacion-valoracion">Observación docente</label><textarea id="observacion-valoracion" rows="3" bind:value={observacionValoracion} placeholder="Describe el comportamiento observado..."></textarea>
          <button onclick={guardarValoracion} disabled={guardandoValoracion||!estudianteElegido||!imparticionElegida||!indicadorValoracion||!nivelValoracion}>{guardandoValoracion?'Guardando...':'Registrar valoración'}</button></div>{/if}
        {#if mensajeValoracion}<p class="exito" role="status">{mensajeValoracion}</p>{/if}{#if errorValoracion}<p class="error" role="alert">{errorValoracion}</p>{/if}
      </div>
      <div class="subpanel"><h3>Historial de valoraciones</h3>
        {#if cargandoHistorial}<p>Cargando historial...</p>{:else if errorHistorial}<p class="error" role="alert">{errorHistorial}</p>{:else if !historialModulo.length}<p>Este estudiante todavía no tiene valoraciones en este módulo.</p>
        {:else}<div class="lista">{#each historialModulo as v (v.id)}<article class="registro"><div class="cabecera"><strong>{v.indicador.descripcion}</strong><span class="contador">Nivel {v.nivel}/4</span></div><small>{new Date(v.fecha).toLocaleString('es-ES')}</small>{#if v.observacion}<p>{v.observacion}</p>{/if}</article>{/each}</div>{/if}
      </div>
      <Evolucion {historial} imparticionId={imparticionElegida}/>
      <PlanesRefuerzo {planes} cargando={cargandoPlanes} error={errorPlanes} estudianteId={estudianteElegido} imparticionId={imparticionElegida}/>
    {:else}<p>No hay datos del grupo disponibles.</p>{/if}
  </section>
  <DashboardGrupal {seguimiento} cargando={cargandoSeguimiento} error={errorSeguimiento} actualizar={cargarSeguimiento} verEstudiante={(id,indicadorId) => { seleccionarEstudiante(id,indicadorId); document.getElementById('seguimiento-individual')?.scrollIntoView({behavior:'smooth'}); }}/>
</main>
