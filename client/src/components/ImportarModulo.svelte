<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';

  export let grupo = null;
  export let imparticiones = [];
  export let guardar;

  const especialidades = [
    { clave: 'INF', nombre: 'Informática' },
    { clave: 'SAI', nombre: 'Sistemas y Aplicaciones Informáticas' },
    { clave: 'TEC', nombre: 'Tecnología' },
  ];
  const nombreEspecialidad = (clave) => especialidades.find((item) => item.clave === clave)?.nombre;
  const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  let modulos = [];
  let consulta = '';
  let especialidad = '';
  let ciclo = '';
  let seleccionadoId = '';
  let cargando = true;
  let guardando = false;
  let errorCatalogo = '';
  let errorAlta = '';

  $: ciclos = [...new Set(modulos.flatMap((modulo) => modulo.ofertas.map((oferta) => oferta.ciclo)))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  $: filtrados = filtrarModulos(modulos, especialidad, ciclo, consulta);
  $: seleccionado = filtrados.find((modulo) => modulo.id === seleccionadoId);
  $: yaAñadido = seleccionado && imparticiones.some(
    (imparticion) => imparticion.modulo?.codigo === `oficial:${seleccionado.id}`,
  );

  function filtrarModulos(fichas, especialidadActiva, cicloActivo, textoBuscado) {
    const termino = normalizar(textoBuscado);
    return fichas
      .map((modulo) => ({
        ...modulo,
        ofertas: modulo.ofertas.filter((oferta) =>
          (!especialidadActiva || oferta.especialidades.includes(especialidadActiva)) &&
          (!cicloActivo || oferta.ciclo === cicloActivo) &&
          normalizar(`${modulo.nombre} ${oferta.ciclo}`).includes(termino),
        ),
      }))
      .filter((modulo) => modulo.ofertas.length);
  }

  async function cargarCatalogo() {
    cargando = true;
    errorCatalogo = '';
    try {
      const datos = await api(`/catalogo-curricular?ciclo=${encodeURIComponent(grupo.ciclo)}`);
      modulos = datos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    } catch (error) {
      errorCatalogo = error.message;
    } finally {
      cargando = false;
    }
  }

  async function añadirModulo() {
    if (guardando || !seleccionado || !grupo) return;
    guardando = true;
    errorAlta = '';
    try {
      await guardar(seleccionado.id);
    } catch (error) {
      errorAlta = error.message;
    } finally {
      guardando = false;
    }
  }

  onMount(() => { void cargarCatalogo(); });
</script>

<section class="panel">
  <h2>Añadir un módulo al grupo</h2>
  <p>Módulos disponibles para <strong>{grupo.ciclo}</strong>. Al añadir un módulo, sus resultados de aprendizaje y criterios de evaluación quedan disponibles para el seguimiento.</p>

  {#if cargando}
    <p role="status">Cargando catálogo curricular…</p>
  {:else if errorCatalogo}
    <p class="error" role="alert">No se pudo cargar el catálogo. {errorCatalogo}</p>
    <button class="secundario" onclick={cargarCatalogo}>Reintentar</button>
  {:else}
    <div class="filtros">
      <label>Buscar módulo
        <input type="search" bind:value={consulta} placeholder="Por ejemplo, Bases de datos" />
      </label>
      <label>Especialidad
        <select value={especialidad} onchange={(evento) => { especialidad = evento.currentTarget.value; }}>
          <option value="">Todas</option>
          {#each especialidades as item (item.clave)}
            <option value={item.clave}>{item.nombre}</option>
          {/each}
        </select>
      </label>
      <label>Ciclo u oferta formativa
        <select value={ciclo} onchange={(evento) => { ciclo = evento.currentTarget.value; }}>
          <option value="">Todos</option>
          {#each ciclos as oferta (oferta)}
            <option value={oferta}>{oferta}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="selector-curriculo">
      <div>
        <p class="resultados" role="status">{filtrados.length} {filtrados.length === 1 ? 'módulo' : 'módulos'}</p>
        {#if filtrados.length}
          <ul class="lista-modulos" aria-label="Módulos encontrados">
            {#each filtrados as modulo (modulo.id)}
              <li>
                <button
                  type="button"
                  class="opcion-modulo"
                  aria-pressed={seleccionadoId === modulo.id}
                  onclick={() => { seleccionadoId = modulo.id; errorAlta = ''; }}
                >
                  <strong>{modulo.nombre}</strong>
                  <span class="especialidades">
                    {#each [...new Set(modulo.ofertas.flatMap((oferta) => oferta.especialidades))] as clave (clave)}
                      <abbr title={nombreEspecialidad(clave)}>{clave}</abbr>
                    {/each}
                  </span>
                  <small>
                    {modulo.ofertas[0].ciclo}{modulo.ofertas.length > 1 ? ` y ${modulo.ofertas.length - 1} más` : ''}
                  </small>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <p>Prueba con otro nombre o cambia los filtros.</p>
        {/if}
      </div>

      {#if seleccionado}
        <div class="ficha-modulo">
          <div class="cabecera">
            <h3>{seleccionado.nombre}</h3>
            <button type="button" disabled={!grupo || guardando} onclick={añadirModulo}>
              {guardando ? 'Añadiendo…' : yaAñadido ? 'Activar módulo' : 'Añadir al grupo'}
            </button>
          </div>
          {#if !grupo}<p>El grupo debe estar disponible para añadir el módulo.</p>{/if}
          {#if errorAlta}<p class="error" role="alert">{errorAlta}</p>{/if}
          <details>
            <summary>Ciclos y atribuciones docentes</summary>
            <ul>
              {#each seleccionado.ofertas as oferta (oferta.ciclo)}
                <li>
                  {oferta.ciclo} · <a href={oferta.atribucion} target="_blank" rel="noreferrer">{oferta.especialidades.join(' / ')}</a>
                  {#if oferta.nota}<small>{oferta.nota}</small>{/if}
                </li>
              {/each}
            </ul>
            {#if seleccionado.ofertas.some((oferta) => oferta.nota)}
              <a href="https://www.boe.es/eli/es/rd/2023/04/18/286/con" target="_blank" rel="noreferrer">Atribución de Tecnología al ámbito de Ciencias Aplicadas</a>
            {/if}
          </details>

          <h4>Resultados de aprendizaje y criterios</h4>
          {#each seleccionado.resultados as resultado (resultado.codigo)}
            <details>
              <summary><strong>{resultado.codigo}</strong> {resultado.texto}</summary>
              <ul>
                {#each resultado.criterios as criterio (criterio.codigo)}
                  <li><strong>{criterio.codigo}</strong> {criterio.texto}</li>
                {/each}
              </ul>
            </details>
          {/each}
          <p><a href={seleccionado.fuente} target="_blank" rel="noreferrer">Consultar currículo oficial</a></p>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .filtros, .selector-curriculo {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }

  .filtros { grid-template-columns: 1.3fr 1fr 1fr; }

  .filtros label {
    display: grid;
    gap: 6px;
    min-width: 0;
    font-weight: 600;
  }

  .filtros input, .filtros select {
    width: 100%;
    min-height: 42px;
    padding: 8px;
    border: 1px solid #b7a395;
    border-radius: 7px;
    color: inherit;
    background: #fff;
    font: inherit;
  }

  .selector-curriculo { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }

  .resultados { margin: 0 0 8px; }

  .lista-modulos {
    display: grid;
    gap: 6px;
    max-height: 33rem;
    margin: 0;
    padding: 3px;
    overflow: auto;
    list-style: none;
  }

  .opcion-modulo {
    display: block;
    width: 100%;
    text-align: left;
    color: inherit;
    background: #fff;
    border: 1px solid #e6dbd2;
  }

  .opcion-modulo:hover, .opcion-modulo[aria-pressed="true"] {
    color: #302720;
    background: #fff2e6;
    border-color: #b56f42;
  }

  .opcion-modulo small, li small { display: block; margin-top: 4px; }

  .especialidades {
    display: inline-flex;
    gap: 4px;
    margin-left: 6px;
    font-size: 0.75rem;
    vertical-align: middle;
  }

  .especialidades abbr {
    padding: 1px 4px;
    border-radius: 4px;
    background: #f2e7dd;
    color: #563b30;
    text-decoration: none;
  }

  .ficha-modulo {
    min-width: 0;
    padding: 16px;
    border: 1px solid #e6dbd2;
    border-radius: 8px;
  }

  .ficha-modulo h3 { margin: 6px 0; }
  .ficha-modulo details { padding: 8px 0; border-bottom: 1px solid #e6dbd2; }
  .ficha-modulo summary { cursor: pointer; }
  .ficha-modulo li { margin: 6px 0; line-height: 1.4; }

  @media (max-width: 840px) {
    .filtros, .selector-curriculo { grid-template-columns: minmax(0, 1fr); }
    .lista-modulos { max-height: 16rem; }
  }
</style>
