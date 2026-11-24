<script>
    import { leerCsvEstudiantes } from '../lib/csvEstudiantes.js';
    import { api } from '../lib/api.js';

    let { grupoId, onImportado = () => {} } = $props();

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
            const estudiantes = leerCsvEstudiantes(await archivo.text());

            const datos = await api(
                `/grupos/${encodeURIComponent(grupoId)}/estudiantes/importar`,
                {
                    method: 'POST',
                    body: JSON.stringify({ estudiantes }),
                },
            );

            resultado = datos;
            await onImportado(datos.nuevasMatriculas ?? []);
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

    <input type="file" accept=".csv,text/csv" onchange={seleccionarArchivo} />

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
        padding: 0.65rem 1rem;
        cursor: pointer;
    }

    .error {
        color: #b42318;
    }

    .resultado {
        margin-top: 1rem;
        padding: 0.75rem;
        background: #eef6ee;
        border-radius: 6px;
    }
</style>
