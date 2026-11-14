<script>
  import { onMount } from 'svelte';
  import { api } from './lib/api.js';
  import Catalogo from './components/Catalogo.svelte';
  import DashboardGrupal from './components/DashboardGrupal.svelte';
  import Evolucion from './components/Evolucion.svelte';
  import PlanesRefuerzo from './components/PlanesRefuerzo.svelte';
  import SeguimientoIndividual from './components/SeguimientoIndividual.svelte';
  import { crearPlanRefuerzo } from './lib/planesRefuerzo.js';
  import './app.css';

  import {
  obtenerGrupo,
  obtenerHistorial,
  obtenerSeguimientoGrupal,
  registrarValoracion
} from './lib/seguimiento.js';
import { obtenerPlanesRefuerzo } from './lib/planesRefuerzo.js';
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
  async function guardarPlan(datos) {
  const estudianteIdActual = Number(estudianteElegido);
  const imparticionIdActual = Number(imparticionElegida);

  if (
    datos.estudianteId !== estudianteIdActual ||
    datos.imparticionId !== imparticionIdActual
  ) {
    throw new Error('La selección ha cambiado. Revisa el estudiante y el módulo.');
  }

  const nuevoPlan = await crearPlanRefuerzo(datos);

  if (Number(estudianteElegido) === estudianteIdActual) {
    await seleccionarEstudiante(estudianteIdActual);
  }

  return nuevoPlan;
}

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
      grupo = await obtenerGrupo(1);
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
    const [h, p] = await Promise.allSettled([
  obtenerHistorial(estudianteElegido),
  obtenerPlanesRefuerzo(estudianteElegido)
]);
    if (actual!==solicitudEstudiante) return;
    if (h.status === 'fulfilled') {
  historial = h.value;
} else {
  errorHistorial = h.reason.message;
}
    if (p.status === 'fulfilled') {
  planes = p.value;
} else {
  errorPlanes = p.reason.message;
}
    cargandoHistorial=false; cargandoPlanes=false;
  }
  async function cargarSeguimiento() {
    seguimiento=null; errorSeguimiento='';
    const id=imparticionElegida, actual=++solicitudSeguimiento;
    if(!id) return;
    cargandoSeguimiento=true;
    try {const datos = await obtenerSeguimientoGrupal(id);if(actual===solicitudSeguimiento) seguimiento=datos; }
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
      await registrarValoracion({
  estudianteId,
  imparticionId,
  indicadorId,
  nivel,
  observacion: observacionValoracion.trim()
});
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
    
{#if cargandoGrupo}
  <section class="panel">
    <p>Cargando estudiantes...</p>
  </section>
{:else if errorGrupo}
  <section class="panel">
    <p class="error" role="alert">{errorGrupo}</p>
    <button onclick={cargarGrupo}>Reintentar</button>
  </section>
{:else}
  <SeguimientoIndividual
    {grupo}
    {estudiantes}
    {imparticiones}
    {configuraciones}
    {evaluables}
    bind:estudianteElegido
    bind:imparticionElegida
    bind:configuracionEvaluacion
    bind:indicadorValoracion
    bind:nivelValoracion
    bind:observacionValoracion
    {historial}
    {planes}
    {cargandoHistorial}
    {cargandoPlanes}
    {errorHistorial}
    {errorPlanes}
    {guardandoValoracion}
    {mensajeValoracion}
    {errorValoracion}
    {seleccionarEstudiante}
    {cambiarModulo}
    {recuperarConfiguracion}
    {guardarValoracion}
    {guardarPlan}
  />
{/if}

  </section>
  <DashboardGrupal {seguimiento} cargando={cargandoSeguimiento} error={errorSeguimiento} actualizar={cargarSeguimiento} verEstudiante={(id,indicadorId) => { seleccionarEstudiante(id,indicadorId); document.getElementById('seguimiento-individual')?.scrollIntoView({behavior:'smooth'}); }}/>
</main>
