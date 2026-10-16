
<script>
  import { onMount } from 'svelte';

  const API_URL = 'http://localhost:3000/api/competencias';

  let competencias = [];
  let nombre = '';
  let descripcion = '';

  let cargando = true;
  let guardando = false;
  let error = '';
  let mensaje = '';

  async function cargarCompetencias() {
    cargando = true;
    error = '';

    try {
      const respuesta = await fetch(API_URL);

      if (!respuesta.ok) {
        throw new Error('No se pudieron cargar las competencias');
      }

      competencias = await respuesta.json();
    } catch (err) {
      error = err.message;
    } finally {
      cargando = false;
    }
  }

  async function crearCompetencia() {
    error = '';
    mensaje = '';

    if (!nombre.trim()) {
      error = 'Debes introducir el nombre de la competencia';
      return;
    }

    guardando = true;

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim()
        })
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo guardar la competencia');
      }

      nombre = '';
      descripcion = '';
      mensaje = 'Competencia creada correctamente';

      await cargarCompetencias();
    } catch (err) {
      error = err.message;
    } finally {
      guardando = false;
    }
  }

  onMount(cargarCompetencias);
</script>

<svelte:head>
  <title>Competencias transversales | TFG</title>
  <meta
    name="description"
    content="Aplicación para el seguimiento de competencias transversales"
  />
</svelte:head>

<main class="contenedor">
  <header>
    <h1>Seguimiento de competencias transversales</h1>
    <p>
      Configuración de competencias para su observación
      y seguimiento en Formación Profesional.
    </p>
  </header>

  <section class="panel">
    <h2>Nueva competencia</h2>

    <form onsubmit={(evento) => {
      evento.preventDefault();
      crearCompetencia();
    }}>
      <label for="nombre">Nombre de la competencia</label>
      <input
        id="nombre"
        type="text"
        bind:value={nombre}
        placeholder="Ejemplo: Trabajo en equipo"
        required
      />

      <label for="descripcion">Descripción</label>
      <textarea
        id="descripcion"
        bind:value={descripcion}
        placeholder="Describe qué se pretende observar"
        rows="3"
      ></textarea>

      <button type="submit" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar competencia'}
      </button>
    </form>

    {#if mensaje}
      <p class="exito" role="status">{mensaje}</p>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </section>

  <section class="panel">
    <h2>Competencias registradas</h2>

    {#if cargando}
      <p>Cargando competencias...</p>
    {:else if competencias.length === 0}
      <p>Todavía no se han registrado competencias.</p>
    {:else}
      <div class="lista">
        {#each competencias as competencia (competencia.id)}
          <article class="competencia">
            <h3>{competencia.nombre}</h3>

            {#if competencia.descripcion}
              <p>{competencia.descripcion}</p>
            {/if}

            <small>
              Indicadores registrados:
              {competencia.indicadores?.length ?? 0}
            </small>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    background: #f3f5f9;
    color: #243247;
  }

  .contenedor {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  header {
    margin-bottom: 32px;
  }

  h1 {
    margin-bottom: 12px;
    color: #17365d;
  }

  header p {
    color: #526174;
    line-height: 1.6;
  }

  .panel {
    background: white;
    border: 1px solid #e1e6ed;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.04);
  }

  h2 {
    margin-top: 0;
    color: #17365d;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  label {
    font-weight: bold;
  }

  input,
  textarea {
    padding: 12px;
    border: 1px solid #c7d0db;
    border-radius: 6px;
    font: inherit;
  }

  input:focus,
  textarea:focus {
    outline: 2px solid #4277bb;
    outline-offset: 1px;
  }

  button {
    align-self: flex-start;
    padding: 12px 20px;
    border: none;
    border-radius: 6px;
    background: #205493;
    color: white;
    font-weight: bold;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #173e6c;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .lista {
    display: grid;
    gap: 16px;
  }

  .competencia {
    border: 1px solid #e1e6ed;
    border-radius: 8px;
    padding: 18px;
    background: #fafbfd;
  }

  .competencia h3 {
    margin-top: 0;
    color: #205493;
  }

  .competencia p {
    line-height: 1.5;
  }

  small {
    color: #65758a;
  }

  .exito {
    color: #17653b;
    font-weight: bold;
  }

  .error {
    color: #b42318;
    font-weight: bold;
  }
</style>
