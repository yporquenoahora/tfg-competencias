<script>
  import ComparativaCurso from './ComparativaCurso.svelte';
  import GraficoCurso from './GraficoCurso.svelte';
  import { api } from '../lib/api.js';
  export let cursos = [];
  export let abrir;

  const dia = 86400000;
  const fecha = (ms) => new Date(ms).toISOString().slice(0, 10);
  const corta = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' });

  let curso = '';
  let datos = null;
  let quincena = '';
  let error = '';
  let cargando = false;
  let peticion = 0;
  let mostrarDemo = false;
  let formularioHito = false;
  let imparticionHito = '';
  let fechaHito = '';
  let tituloHito = '';
  let notaHito = '';
  let guardandoHito = false;
  let actualizandoHito = null;
  let errorHito = '';
  let avisoHito = '';


  $: if (!cursos.includes(curso)) curso = cursos[0] ?? '';
  $: void cargar(curso);
  $: periodos = datos ? calcularPeriodos(datos.inicio, datos.fin) : [];
  $: visibles = quincena === '' ? periodos : periodos.filter((p) => String(p.indice) === quincena);
  $: filasVisibles = datos?.filas.filter((fila) => !mostrarDemo || fila.grupo.endsWith('· Demo')) ?? [];
  $: hitosVisibles = filasVisibles.flatMap((fila) =>
    (fila.hitos ?? []).filter((hito) => quincena === '' || String(hito.quincena) === quincena)
      .map((hito) => ({ ...hito, fila })),
  ).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
  $: disponiblesDemo = datos?.filas.some((fila) => fila.grupo.endsWith('· Demo'));

  function calcularPeriodos(inicio, fin) {
    const primero = Date.parse(inicio);
    const limite = Date.parse(fin);
    const lista = [];
    for (let t = primero; t < limite; t += 14 * dia) {
      const ultimo = Math.min(t + 13 * dia, limite - dia);
      lista.push({ indice: lista.length, desde: fecha(t), hasta: fecha(ultimo),
        etiqueta: `${corta.format(t)} – ${corta.format(ultimo)}` });
    }
    return lista;
  }

  async function cargar(valor) {
    const version = ++peticion;
    datos = null;
    quincena = '';
    mostrarDemo = false;
    formularioHito = false;
    errorHito = '';
    avisoHito = '';
    error = '';
    if (!valor) return;
    cargando = true;
    try {
      const respuesta = await api(`/curso/seguimiento?curso=${encodeURIComponent(valor)}`);
      if (version === peticion) datos = respuesta;
    } catch (fallo) {
      if (version === peticion) error = fallo.message;
    } finally {
      if (version === peticion) cargando = false;
    }
  }

  function abrirFormularioHito() {
    imparticionHito = String(filasVisibles[0]?.id ?? '');
    fechaHito = visibles.length === 1 ? visibles[0].desde : '';
    tituloHito = '';
    notaHito = '';
    errorHito = '';
    avisoHito = '';
    formularioHito = true;
  }

  async function guardarHito(evento) {
    evento.preventDefault();
    if (guardandoHito) return;
    const id = Number(imparticionHito);
    const version = peticion;
    errorHito = '';
    guardandoHito = true;
    try {
      const hito = await api(`/imparticiones/${id}/hitos`, {
        method: 'POST',
        body: JSON.stringify({ fecha: fechaHito, titulo: tituloHito, nota: notaHito }),
      });
      if (version !== peticion) return;
      const fecha = hito.fecha.slice(0, 10);
      const periodo = periodos.find((p) => p.desde <= fecha && fecha <= p.hasta);
      datos = { ...datos, filas: datos.filas.map((fila) => fila.id === id
        ? { ...fila, hitos: [...(fila.hitos ?? []), { ...hito, fecha, quincena: periodo.indice }] }
        : fila) };
      quincena = String(periodo.indice);
      formularioHito = false;
      avisoHito = 'Hito añadido a la línea temporal.';
    } catch (fallo) {
      if (version === peticion) errorHito = fallo.message;
    } finally {
      guardandoHito = false;
    }
  }

  async function marcarHito(hito) {
    if (actualizandoHito !== null) return;
    const version = peticion;
    actualizandoHito = hito.id;
    errorHito = '';
    avisoHito = '';
    try {
      const cambiado = await api(`/imparticiones/${hito.fila.id}/hitos/${hito.id}`, {
        method: 'PATCH', body: JSON.stringify({ revisado: !hito.revisado }),
      });
      if (version !== peticion) return;
      datos = { ...datos, filas: datos.filas.map((fila) => fila.id === hito.fila.id
        ? { ...fila, hitos: fila.hitos.map((item) => item.id === hito.id ? { ...item, ...cambiado } : item) }
        : fila) };
      avisoHito = cambiado.revisado ? 'Hito marcado como revisado.' : 'Hito devuelto a pendiente.';
    } catch (fallo) {
      if (version === peticion) errorHito = fallo.message;
    } finally {
      actualizandoHito = null;
    }
  }

  function escenario(indice) {
    mostrarDemo = true;
    quincena = String(indice);
  }
</script>

<section class="panel">
  <h2>Evolución de los grupos</h2>
  {#if cursos.length}
    <div class="revision-periodo">
      <label>Curso académico
        <select value={curso} onchange={(e) => (curso = e.currentTarget.value)}>
          {#each cursos as item (item)}<option value={item}>{item}</option>{/each}
        </select>
      </label>
    </div>
  {/if}

  {#if cargando}<p role="status">Cargando seguimiento…</p>
  {:else if error}
    <p class="error" role="alert">{error}</p>
    <button class="secundario" onclick={() => cargar(curso)}>Reintentar</button>
  {:else if datos?.filas.length}
    {#if disponiblesDemo}
      <div class="acciones" aria-label="Escenarios de demostración">
        <button class="secundario" onclick={() => escenario(0)}>Ver dificultad compartida</button>
        <button class="secundario" onclick={() => escenario(1)}>Ver evolución tras el refuerzo</button>
        <button class="secundario" onclick={() => { mostrarDemo = false; quincena = ''; }}>Reiniciar vista</button>
      </div>
    {/if}
    <div class="acciones">
      <button type="button" onclick={abrirFormularioHito} disabled={formularioHito}>Añadir hito de revisión</button>
    </div>
    {#if formularioHito}
      <form class="formulario" onsubmit={guardarHito}>
        <label for="hito-imparticion">Grupo y módulo</label>
        <select id="hito-imparticion" bind:value={imparticionHito} required>
          {#each filasVisibles as fila (fila.id)}
            <option value={String(fila.id)}>{fila.grupo} · {fila.modulo}</option>
          {/each}
        </select>
        <label for="hito-fecha">Fecha de revisión</label>
        <input id="hito-fecha" type="date" bind:value={fechaHito} min={periodos[0]?.desde} max={periodos.at(-1)?.hasta} required />
        <label for="hito-titulo">Qué revisar</label>
        <input id="hito-titulo" bind:value={tituloHito} placeholder="Comprobar la validación XML antes de la entrega" maxlength="120" required />
        <label for="hito-nota">Nota para la revisión</label>
        <textarea id="hito-nota" bind:value={notaHito} rows="2" maxlength="500"></textarea>
        <div class="acciones">
          <button type="submit" disabled={guardandoHito}>Guardar hito</button>
          <button type="button" class="secundario" onclick={() => (formularioHito = false)} disabled={guardandoHito}>Cancelar</button>
        </div>
      </form>
    {/if}
    {#if errorHito}<p class="error" role="alert">{errorHito}</p>{/if}
    {#if avisoHito}<p class="exito" role="status">{avisoHito}</p>{/if}

    <ComparativaCurso filas={filasVisibles} {periodos} {quincena} seleccionar={(valor) => (quincena = valor)} {abrir} />
    <details>
      <summary>Ver perfiles y evolución de un grupo</summary>
      <GraficoCurso filas={filasVisibles} periodos={visibles} {abrir} />
    </details>
    <details>
      <summary>Ver tabla comparativa de todos los grupos</summary>
    <p>Cada celda muestra alumnado con alguna dificultad sobre alumnado observado. Pulsa una quincena de un grupo para revisar el detalle.</p>
    <div class="tabla-scroll">
      <table class="timeline">
        <thead><tr><th scope="col">Grupo y módulo</th>
          {#each visibles as periodo (periodo.indice)}<th scope="col">{periodo.etiqueta}</th>{/each}
        </tr></thead>
        <tbody>
          {#each filasVisibles as fila (fila.id)}
            <tr>
              <th scope="row">{fila.grupo}<small>{fila.modulo}</small></th>
              {#each visibles as periodo (periodo.indice)}
                {@const dato = fila.ventanas.find((v) => v.indice === periodo.indice)}
                {@const pendientes = (fila.hitos ?? []).filter((h) => h.quincena === periodo.indice && !h.revisado).length}
                <td>
                  <button type="button" class="secundario" class:requiere={dato?.dificultad > 0}
                    aria-label={`${fila.grupo}, ${fila.modulo}, ${periodo.etiqueta}: ${dato ? `${dato.dificultad} con dificultad de ${dato.observados} observados` : 'sin observaciones'}${pendientes ? `, ${pendientes} hitos pendientes` : ''}`}
                    onclick={() => abrir(fila, periodo.desde, periodo.hasta)}>
                    {dato ? `${dato.dificultad}/${dato.observados}` : '—'}
                    {#if pendientes}<small class="hito-pendiente">{pendientes} {pendientes === 1 ? 'hito' : 'hitos'}</small>{/if}
                  </button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    </details>
    <h3>Hitos de revisión</h3>
    {#if hitosVisibles.length}
      <ul class="lista lista-hitos">
        {#each hitosVisibles as hito (hito.id)}
          {@const periodo = periodos[hito.quincena]}
          <li class="registro">
            <div class="cabecera">
              <strong>{hito.titulo}</strong>
              <span>{hito.revisado ? 'Revisado' : 'Pendiente'}</span>
            </div>
            <p>{corta.format(new Date(hito.fecha + 'T00:00:00Z'))} · {hito.fila.grupo} · {hito.fila.modulo}</p>
            {#if hito.nota}<p>{hito.nota}</p>{/if}
            <div class="acciones">
              <button class="secundario" type="button" onclick={() => abrir(hito.fila, periodo.desde, periodo.hasta)}>Abrir seguimiento</button>
              <button class="secundario" type="button" disabled={actualizandoHito !== null} onclick={() => marcarHito(hito)}>
                {hito.revisado ? 'Volver a pendiente' : 'Marcar revisado'}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {:else}<p>Este periodo todavía no tiene hitos programados.</p>{/if}
  {:else}<p>Añade un módulo a un grupo para consultar su evolución.</p>{/if}
  {#if datos?.gruposSinModulo?.length}
    <details>
      <summary>Grupos sin módulo asignado ({datos.gruposSinModulo.length})</summary>
      <ul>{#each datos.gruposSinModulo as grupo (grupo.id)}<li>{grupo.nombre}</li>{/each}</ul>
      <p>Selecciona el grupo en la cabecera y pulsa «Añadir módulo» para empezar su seguimiento.</p>
    </details>
  {/if}
</section>

<style>
  .timeline th, .timeline td { min-width: 80px; }
  .timeline th:first-child { min-width: 185px; position: sticky; left: 0; z-index: 1; }
  .timeline small { display: block; margin-top: 4px; }
  .timeline button { width: 100%; }
  .lista-hitos { list-style: none; padding: 0; }
  .hito-pendiente { color: #873e1c; font-weight: 700; }
  .timeline button.requiere { background: #fff0df; border-color: #c27b48; }
</style>
