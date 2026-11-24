<script>
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

  $: if (!cursos.includes(curso)) curso = cursos[0] ?? '';
  $: void cargar(curso);
  $: periodos = datos ? calcularPeriodos(datos.inicio, datos.fin) : [];
  $: visibles = quincena === '' ? periodos : periodos.filter((p) => String(p.indice) === quincena);
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
      <label>Quincena
        <select value={quincena} onchange={(e) => (quincena = e.currentTarget.value)}>
          <option value="">Todo el curso</option>
          {#each periodos as periodo (periodo.indice)}
            <option value={String(periodo.indice)}>{periodo.etiqueta}</option>
          {/each}
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
    <p>Cada celda muestra alumnado con alguna dificultad sobre alumnado observado. Pulsa una quincena de un grupo para revisar el detalle.</p>
    <div class="tabla-scroll">
      <table class="timeline">
        <thead><tr><th scope="col">Grupo y módulo</th>
          {#each visibles as periodo (periodo.indice)}<th scope="col">{periodo.etiqueta}</th>{/each}
        </tr></thead>
        <tbody>
          {#each datos.filas.filter((fila) => !mostrarDemo || fila.grupo.endsWith('· Demo')) as fila (fila.id)}
            <tr>
              <th scope="row">{fila.grupo}<small>{fila.modulo}</small></th>
              {#each visibles as periodo (periodo.indice)}
                {@const dato = fila.ventanas.find((v) => v.indice === periodo.indice)}
                <td>
                  <button type="button" class="secundario" class:requiere={dato?.dificultad > 0}
                    aria-label={`${fila.grupo}, ${fila.modulo}, ${periodo.etiqueta}: ${dato ? `${dato.dificultad} con dificultad de ${dato.observados} observados` : 'sin observaciones'}`}
                    onclick={() => abrir(fila, periodo.desde, periodo.hasta)}>
                    {dato ? `${dato.dificultad}/${dato.observados}` : '—'}
                  </button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}<p>Añade un módulo a un grupo para consultar su evolución.</p>{/if}
</section>

<style>
  .timeline th, .timeline td { min-width: 80px; }
  .timeline th:first-child { min-width: 185px; position: sticky; left: 0; z-index: 1; }
  .timeline small { display: block; margin-top: 4px; }
  .timeline button { width: 100%; }
  .timeline button.requiere { background: #fff0df; border-color: #c27b48; }
</style>
