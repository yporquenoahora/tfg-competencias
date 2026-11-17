
<script>
  let { grupoId, apiBase = 'http://localhost:3000', onImportado = () => {} } = $props();

  let archivo = $state(null);
  let cargando = $state(false);
  let error = $state('');
  let resultado = $state(null);

  function seleccionarArchivo(event) {
    archivo = event.currentTarget.files?.[0] ?? null;
    error = '';
    resultado = null;
  }

  async function importar() {
    if (!archivo) {
      error = 'Selecciona un archivo CSV.';
      return;
    }

    cargando = true;
    error = '';
    resultado = null;

    try {
      const texto = (await archivo.text()).replace(/^\uFEFF/, '');
      const lineas = texto.split(/\r?\n/).filter(linea => linea.trim());

      if (lineas.length < 2) {
        throw new Error('El CSV debe contener cabecera y estudiantes.');
      }

      const separador = lineas[0].includes(';') ? ';' : ',';
      const cabecera = lineas[0].split(separador)
        .map(valor => valor.trim().toLowerCase());

      const indiceCodigo = cabecera.indexOf('codigo');
      const indiceNombre = cabecera.indexOf('nombre');

      if (indiceCodigo === -1 || indiceNombre === -1) {
        throw new Error('El CSV debe incluir las columnas codigo y nombre.');
      }

      const estudiantes = lineas.slice(1).map((linea, indice) => {
        const columnas = linea.split(separador).map(valor => valor.trim());

        if (columnas.length !== cabecera.length) {
          throw new Error(`Número de columnas incorrecto en la fila ${indice + 2}.`);
        }

        return {
          codigo: columnas[indiceCodigo],
          nombre: columnas[indiceNombre]
        };
      });

      const respuesta = await fetch(
        `${apiBase}/api/grupos/${grupoId}/estudiantes/importar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estudiantes })
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? 'Error al importar.');
      }

      resultado = datos;
      await onImportado();
    } catch (e) {
      error = e.message;
    } finally {
      cargando = false;
    }
  }
</script>

<section class="importacion">
  <h3>Importar estudiantes</h3>
  <p>Selecciona un CSV con las columnas codigo y nombre.</p>

  <input
    type="file"
    accept=".csv,text/csv"
    onchange={seleccionarArchivo}
  />

  <button onclick={importar} disabled={cargando || !archivo}>
    {cargando ? 'Importando...' : 'Importar al grupo'}
  </button>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if resultado}
    <div class="resultado" role="status">
      <strong>Importación completada</strong>
      <p>Procesados: {resultado.total}</p>
      <p>Creados: {resultado.creados}</p>
      <p>Nuevas matrículas: {resultado.matriculados}</p>
      <p>Ya matriculados: {resultado.yaMatriculados}</p>
    </div>
  {/if}
</section>

<style>
  .importacion {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  input {
    display: block;
    margin: 1rem 0;
  }

  button {
    padding: .65rem 1rem;
    cursor: pointer;
  }

  .error {
    color: #b42318;
  }

  .resultado {
    margin-top: 1rem;
    padding: .75rem;
    background: #eef6ee;
    border-radius: 6px;
  }
</style>
