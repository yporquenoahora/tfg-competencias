<script>
  export let grupo = null;
  export let guardar;

  let siguienteId = 0;
  const nuevoCriterio = () => ({ id: ++siguienteId, codigo: '', texto: '' });
  const nuevoResultado = () => ({
    id: ++siguienteId,
    codigo: '',
    texto: '',
    criterios: [nuevoCriterio()],
  });

  let codigo = '';
  let nombre = '';
  let resultados = [nuevoResultado()];
  let guardando = false;
  let error = '';

  async function enviar(evento) {
    evento.preventDefault();
    if (guardando || !grupo) return;

    error = '';
    guardando = true;
    try {
      await guardar({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        resultados: resultados.map((ra) => ({
          codigo: ra.codigo.trim(),
          texto: ra.texto.trim(),
          criterios: ra.criterios.map((ce) => ({
            codigo: ce.codigo.trim(),
            texto: ce.texto.trim(),
          })),
        })),
      });
    } catch (fallo) {
      error = fallo.message;
    } finally {
      guardando = false;
    }
  }
</script>

<section class="panel">
  <h2>Añadir un módulo al grupo</h2>
  {#if grupo}
    <p>Introduce el código, el nombre y los resultados de aprendizaje y criterios de evaluación que utilizarás para el seguimiento. Al guardar podrás elegir los indicadores en Catálogo.</p>

    <form class="formulario" onsubmit={enviar}>
      <fieldset disabled={guardando}>
        <legend>Identificación del módulo</legend>
        <label for="nuevo-modulo-codigo">Código del módulo</label>
        <input id="nuevo-modulo-codigo" bind:value={codigo} required />
        <label for="nuevo-modulo-nombre">Nombre del módulo</label>
        <input id="nuevo-modulo-nombre" bind:value={nombre} required />
      </fieldset>

      {#each resultados as resultado, indice (resultado.id)}
        <fieldset disabled={guardando}>
          <legend>Resultado de aprendizaje {indice + 1}</legend>
          <label for="ra-codigo-{resultado.id}">Código del RA</label>
          <input id="ra-codigo-{resultado.id}" bind:value={resultado.codigo} placeholder="RA1" required />
          <label for="ra-texto-{resultado.id}">Texto del resultado de aprendizaje</label>
          <textarea id="ra-texto-{resultado.id}" bind:value={resultado.texto} rows="2" required></textarea>

          {#each resultado.criterios as criterio, posicion (criterio.id)}
            <fieldset>
              <legend>Criterio de evaluación {posicion + 1}</legend>
              <label for="ce-codigo-{criterio.id}">Código del criterio</label>
              <input id="ce-codigo-{criterio.id}" bind:value={criterio.codigo} placeholder="CE1a" required />
              <label for="ce-texto-{criterio.id}">Texto del criterio de evaluación</label>
              <textarea id="ce-texto-{criterio.id}" bind:value={criterio.texto} rows="2" required></textarea>
              {#if resultado.criterios.length > 1}
                <button type="button" class="secundario" onclick={() => {
                  resultado.criterios = resultado.criterios.filter((item) => item.id !== criterio.id);
                }}>Quitar criterio {posicion + 1}</button>
              {/if}
            </fieldset>
          {/each}

          <div class="acciones-curriculo">
            <button type="button" class="secundario" onclick={() => {
              resultado.criterios = [...resultado.criterios, nuevoCriterio()];
            }}>Añadir criterio</button>
            {#if resultados.length > 1}
              <button type="button" class="secundario" onclick={() => {
                resultados = resultados.filter((item) => item.id !== resultado.id);
              }}>Quitar resultado {indice + 1}</button>
            {/if}
          </div>
        </fieldset>
      {/each}

      <div class="acciones-curriculo">
        <button type="button" class="secundario" disabled={guardando} onclick={() => {
          resultados = [...resultados, nuevoResultado()];
        }}>Añadir resultado de aprendizaje</button>
        <button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar módulo en el grupo'}</button>
      </div>
      {#if error}
        <p class="error" role="alert">{error}</p>
      {/if}
    </form>
  {:else}
    <p>El formulario estará disponible cuando se cargue el grupo.</p>
  {/if}
</section>

<style>
  fieldset {
    display: grid;
    min-width: 0;
    gap: 8px;
    margin: 0;
    padding: 16px;
    border: 1px solid #d9cec4;
    border-radius: 8px;
  }

  fieldset fieldset {
    margin-top: 8px;
  }

  legend {
    padding: 0 6px;
    font-weight: 700;
  }

  .acciones-curriculo {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
