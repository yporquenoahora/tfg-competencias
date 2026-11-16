<script>
    import Evolucion from '../components/Evolucion.svelte';
    import PlanesRefuerzo from '../components/PlanesRefuerzo.svelte';

    export let grupo = null;
    export let estudiantes = [];
    export let imparticiones = [];
    export let configuraciones = [];
    export let evaluables = [];
    export let guardarPlan;
    export let estudianteElegido = '';
    export let imparticionElegida = '';
    export let configuracionEvaluacion = '';
    export let indicadorValoracion = '';
    export let nivelValoracion = '';
    export let observacionValoracion = '';
    export let historial = [];
    export let planes = [];
    export let cargandoHistorial = false;
    export let cargandoPlanes = false;
    export let errorHistorial = '';
    export let errorPlanes = '';
    export let guardandoValoracion = false;
    export let mensajeValoracion = '';
    export let errorValoracion = '';
    export let seleccionarEstudiante;
    export let cambiarModulo;
    export let recuperarConfiguracion;
    export let guardarValoracion;
    export let rubricas = [];
    export let errorRubricas = '';
    export let evidenciaIdSeleccionada = ''; // Enlazar desde App.svelte

    // Carga dependiente del módulo, actividad y estudiante.
    let actividades = [];
    let evidencias = [];
    let actividadElegida = '';
    let cargandoActividades = false;
    let cargandoEvidencias = false;
    let errorActividades = '';
    let errorEvidencias = '';
    let versionActividades = 0;
    let versionEvidencias = 0;

    $: void cargarActividades(imparticionElegida);
    $: void cargarEvidencias(actividadElegida, estudianteElegido, imparticionElegida);

    async function cargarActividades(imparticionId) {
        const version = ++versionActividades;
        actividades = [];
        actividadElegida = '';
        evidenciaIdSeleccionada = '';
        errorActividades = '';
        cargandoActividades = Boolean(imparticionId);
        if (!imparticionId) return;
        try {
            const respuesta = await fetch(
                `http://localhost:3000/api/actividades?imparticionId=${encodeURIComponent(imparticionId)}`
            );
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const datos = await respuesta.json();
            if (version === versionActividades) actividades = datos;
        } catch (error) {
            if (version === versionActividades) errorActividades = error.message;
        } finally {
            if (version === versionActividades) cargandoActividades = false;
        }
    }

    async function cargarEvidencias(actividadId, estudianteId, imparticionId) {
        const version = ++versionEvidencias;
        evidencias = [];
        evidenciaIdSeleccionada = '';
        errorEvidencias = '';
        cargandoEvidencias = Boolean(actividadId && estudianteId && imparticionId);
        if (!cargandoEvidencias) return;
        try {
            const parametros = new URLSearchParams({
                actividadId: String(actividadId),
                estudianteId: String(estudianteId)
            });
            const respuesta = await fetch(
                `http://localhost:3000/api/evidencias?${parametros}`
            );
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const datos = await respuesta.json();
            if (version === versionEvidencias) evidencias = datos;
        } catch (error) {
            if (version === versionEvidencias) errorEvidencias = error.message;
        } finally {
            if (version === versionEvidencias) cargandoEvidencias = false;
        }
    }

    let panelLateral = null;
    let botonCerrarPanel;
    const escalaGeneral = [
        { valor: 1, descripcion: 'No demuestra el desempeño esperado' },
        { valor: 2, descripcion: 'Necesita apoyo frecuente' },
        { valor: 3, descripcion: 'Trabaja con autonomía' },
        { valor: 4, descripcion: 'Desempeño consistente y autónomo' },
    ];

    $: rubricaActiva = rubricas.find((r) =>
        r.indicadores?.some(
            (a) => Number(a.indicadorId) === Number(indicadorValoracion),
        ),
    );
    $: nivelesDisponibles = rubricaActiva?.niveles?.length
        ? [...rubricaActiva.niveles].sort((a, b) => a.valor - b.valor)
        : escalaGeneral;
    $: historialModulo = historial.filter(
        (v) => Number(v.imparticionId) === Number(imparticionElegida),
    );
    $: historialReciente = [...historialModulo]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 3);
    $: indicadoresPlan = [
        ...new Map(
            [
                ...evaluables,
                ...historialModulo
                    .filter((v) => v.indicador)
                    .map((v) => v.indicador),
            ].map((i) => [i.id, i]),
        ).values(),
    ];

    function abrirPanel(nombre) {
        panelLateral = nombre;
        setTimeout(() => botonCerrarPanel?.focus(), 0);
    }
    function cerrarPanel() {
        panelLateral = null;
    }
    function teclaPanel(event) {
        if (event.key === 'Escape') cerrarPanel();
    }
    function cambiarIndicador() {
        nivelValoracion = '';
    }
    function cambiarEstudiante(event) {
        cerrarPanel();
        seleccionarEstudiante(event.currentTarget.value);
    }
    function cambiarImparticion() {
        cerrarPanel();
        cambiarModulo();
    }
    // Consulta bajo demanda de la trazabilidad de cada valoración.
    let trazabilidades = {};
    let cargandoTrazabilidad = {};
    let erroresTrazabilidad = {};
    let valoracionExpandida = null;

    async function alternarTrazabilidad(id) {
        if (valoracionExpandida === id) {
            valoracionExpandida = null;
            return;
        }

        valoracionExpandida = id;

        if (Object.prototype.hasOwnProperty.call(trazabilidades, id)) return;

        cargandoTrazabilidad = { ...cargandoTrazabilidad, [id]: true };
        erroresTrazabilidad = { ...erroresTrazabilidad, [id]: '' };

        try {
            const respuesta = await fetch(
                `http://localhost:3000/api/valoraciones/${id}/trazabilidad`,
            );
            if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);

            const datos = await respuesta.json();
            trazabilidades = { ...trazabilidades, [id]: datos };
        } catch (error) {
            erroresTrazabilidad = {
                ...erroresTrazabilidad,
                [id]: error.message ?? 'No se pudo cargar la trazabilidad',
            };
        } finally {
            cargandoTrazabilidad = { ...cargandoTrazabilidad, [id]: false };
        }
    }

</script>

<section class="seguimiento-compacto" id="seguimiento-individual">
    {#if grupo}
        <header class="cabecera-seguimiento">
            <div>
                <h2>Seguimiento del alumnado</h2>
                <p>
                    {grupo.nombre} · Curso {grupo.curso} · {estudiantes.length} estudiantes
                </p>
            </div>
        </header>

        <div class="contexto-evaluacion">
            <div class="campo">
                <label for="imparticion">Módulo profesional</label>
                <select
                    id="imparticion"
                    bind:value={imparticionElegida}
                    onchange={cambiarImparticion}
                >
                    {#each imparticiones as imparticion (imparticion.id)}
                        <option value={String(imparticion.id)}
                            >{imparticion.nombreModulo}</option
                        >
                    {/each}
                </select>
            </div>
            <div class="campo">
                <label for="estudiante">Estudiante</label>
                <select
                    id="estudiante"
                    value={estudianteElegido}
                    onchange={cambiarEstudiante}
                >
                    {#each estudiantes as estudiante (estudiante.id)}
                        <option value={String(estudiante.id)}
                            >{estudiante.codigo} — {estudiante.nombre}</option
                        >
                    {/each}
                </select>
            </div>
        </div>

        <div class="columnas-seguimiento">
            <section
                class="tarjeta-seguimiento"
                aria-labelledby="titulo-valoracion"
            >
                <h3 id="titulo-valoracion">Nueva valoración</h3>
                <div class="campo">
                    <label for="configuracion-evaluacion"
                        >Configuración de indicadores</label
                    >
                    <select
                        id="configuracion-evaluacion"
                        bind:value={configuracionEvaluacion}
                        onchange={recuperarConfiguracion}
                    >
                        <option value=""
                            >Selecciona una configuración guardada</option
                        >
                        {#each configuraciones as configuracion (configuracion.id)}
                            <option value={String(configuracion.id)}>
                                {configuracion.nombre} ({configuracion
                                    .indicadores?.length ?? 0} indicadores)
                            </option>
                        {/each}
                    </select>
                </div>

                {#if evaluables.length === 0}
                    <p>
                        No hay indicadores disponibles. Añade indicadores desde
                        el Catálogo para comenzar.
                    </p>
                {:else}
                    <div class="campo">
                        <label for="indicador-valoracion">Indicador</label>
                        <select
                            id="indicador-valoracion"
                            bind:value={indicadorValoracion}
                            onchange={cambiarIndicador}
                        >
                            <option value="">Selecciona un indicador</option>
                            {#each evaluables as indicador (indicador.id)}
                                <option value={String(indicador.id)}
                                    >{indicador.descripcion}</option
                                >
                            {/each}
                        </select>
                    </div>

                    {#if errorRubricas}
                        <p class="error" role="alert">
                            No se pudieron cargar las rúbricas: {errorRubricas}
                        </p>
                    {:else if rubricaActiva}
                        <p class="rubrica-resumen">
                            <strong>Rúbrica:</strong>
                            {rubricaActiva.nombre}
                        </p>
                    {:else if indicadorValoracion}
                        <p class="rubrica-resumen">
                            Sin rúbrica asociada: se utiliza la escala general.
                        </p>
                    {/if}

                    <div class="campo">
                        <label for="nivel-valoracion">Nivel observado</label>
                        <select
                            id="nivel-valoracion"
                            bind:value={nivelValoracion}
                        >
                            <option value="">Selecciona un nivel</option>
                            {#each nivelesDisponibles as nivel (nivel.valor)}
                                <option value={String(nivel.valor)}
                                    >{nivel.valor} — {nivel.descripcion}</option
                                >
                            {/each}
                        </select>
                    </div>
                    {#if nivelValoracion}
                        <p class="descriptor-elegido">
                            {nivelesDisponibles.find(
                                (n) =>
                                    String(n.valor) === String(nivelValoracion),
                            )?.descripcion ?? ''}
                        </p>
                    {/if}
                    <div class="campo">
                        <label for="actividad-valoracion">Actividad (opcional)</label>
                        <select id="actividad-valoracion" bind:value={actividadElegida}
                            disabled={cargandoActividades || !imparticionElegida}>
                            <option value="">Sin actividad asociada</option>
                            {#each actividades as actividad (actividad.id)}
                                <option value={String(actividad.id)}>{actividad.titulo}</option>
                            {/each}
                        </select>
                        {#if cargandoActividades}<small>Cargando actividades...</small>{/if}
                        {#if errorActividades}
                            <p class="error" role="alert">Error al cargar actividades: {errorActividades}</p>
                        {/if}
                    </div>
                    <div class="campo">
                        <label for="evidencia-valoracion">Evidencia (opcional)</label>
                        <select id="evidencia-valoracion" bind:value={evidenciaIdSeleccionada}
                            disabled={!actividadElegida || cargandoEvidencias || !estudianteElegido}>
                            <option value="">Sin evidencia asociada</option>
                            {#each evidencias as evidencia (evidencia.id)}
                                <option value={String(evidencia.id)}>
                                    {evidencia.descripcion}
                                </option>
                            {/each}
                        </select>
                        {#if cargandoEvidencias}<small>Cargando evidencias...</small>{/if}
                        {#if errorEvidencias}
                            <p class="error" role="alert">Error al cargar evidencias: {errorEvidencias}</p>
                        {/if}
                    </div>
                    <div class="campo">
                        <label for="observacion-valoracion"
                            >Observación docente</label
                        >
                        <textarea
                            id="observacion-valoracion"
                            rows="2"
                            bind:value={observacionValoracion}
                            placeholder="Describe el comportamiento observado..."
                        ></textarea>
                    </div>
                    <button
                        class="accion-primaria"
                        type="button"
                        onclick={guardarValoracion}
                        disabled={guardandoValoracion ||
                            !estudianteElegido ||
                            !imparticionElegida ||
                            !indicadorValoracion ||
                            !nivelValoracion}
                    >
                        {guardandoValoracion
                            ? 'Guardando...'
                            : 'Registrar valoración'}
                    </button>
                {/if}
                {#if mensajeValoracion}<p class="exito" role="status">
                        {mensajeValoracion}
                    </p>{/if}
                {#if errorValoracion}<p class="error" role="alert">
                        {errorValoracion}
                    </p>{/if}
            </section>

            <div class="columna-resumen">
                <section
                    class="tarjeta-seguimiento evolucion-compacta"
                    aria-labelledby="titulo-evolucion"
                >
                    <h3 id="titulo-evolucion">Evolución</h3>
                    {#if cargandoHistorial}
                        <p>Cargando evolución...</p>
                    {:else if errorHistorial}
                        <p class="error" role="alert">{errorHistorial}</p>
                    {:else}
                        <Evolucion
                            {historial}
                            imparticionId={imparticionElegida}
                        />
                    {/if}
                </section>

            </div>
        </div>
        <div class="resumenes-inferiores">
                <section
                    class="tarjeta-seguimiento"
                    aria-labelledby="titulo-historial"
                >
                    <div class="cabecera-tarjeta">
                        <h3 id="titulo-historial">Historial reciente</h3>
                        <button
                            class="enlace-accion"
                            type="button"
                            onclick={() => abrirPanel('historial')}
                            >Ver todo</button
                        >
                    </div>
                    {#if cargandoHistorial}
                        <p>Cargando historial...</p>
                    {:else if errorHistorial}
                        <p class="error" role="alert">{errorHistorial}</p>
                    {:else if historialReciente.length === 0}
                        <p>Sin valoraciones en este módulo.</p>
                    {:else}
                        <ul class="lista-resumen">
                            {#each historialReciente as valoracion (valoracion.id)}
                                <li>
                                    <span
                                        >{valoracion.indicador?.descripcion ??
                                            'Indicador'}</span
                                    ><strong>{valoracion.nivel}/4</strong>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </section>

                <section
                    class="tarjeta-seguimiento"
                    aria-labelledby="titulo-planes"
                >
                    <div class="cabecera-tarjeta">
                        <h3 id="titulo-planes">Planes de refuerzo</h3>
                        <button
                            class="enlace-accion"
                            type="button"
                            onclick={() => abrirPanel('planes')}
                            >Gestionar</button
                        >
                    </div>
                    {#if cargandoPlanes}
                        <p>Cargando planes...</p>
                    {:else if errorPlanes}
                        <p class="error" role="alert">{errorPlanes}</p>
                    {:else}
                        <p>
                            {planes.length}
                            {planes.length === 1
                                ? 'plan registrado'
                                : 'planes registrados'} para este estudiante.
                        </p>
                    {/if}
                </section>
        </div>
    {:else}
        <p>No hay datos del grupo disponibles.</p>
    {/if}
</section>

{#if panelLateral}
    <div class="panel-overlay">
        <button
            class="panel-fondo"
            type="button"
            aria-label="Cerrar panel"
            onclick={cerrarPanel}
        ></button>
        <div
            class="panel-deslizante"
            onkeydown={teclaPanel}
            role="dialog"
            tabindex="-1"
            aria-modal="true"
            aria-label={panelLateral === 'historial'
                ? 'Historial de valoraciones'
                : 'Planes de refuerzo'}
        >
            <header class="panel-deslizante-cabecera">
                <h2>
                    {panelLateral === 'historial'
                        ? 'Historial y evolución'
                        : 'Planes de refuerzo'}
                </h2>
                <button bind:this={botonCerrarPanel} type="button" onclick={cerrarPanel}>Cerrar</button>
            </header>
            <div class="panel-deslizante-contenido">
                {#if panelLateral === 'historial'}
                    {#if cargandoHistorial}
                        <p>Cargando historial...</p>
                    {:else if errorHistorial}
                        <p class="error" role="alert">{errorHistorial}</p>
                    {:else if historialModulo.length === 0}
                        <p>
                            Este estudiante todavía no tiene valoraciones en
                            este módulo.
                        </p>
                    {:else}
                        <div class="lista">
                            {#each [...historialModulo].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) as valoracion (valoracion.id)}
                                <article class="registro">
                                    <div class="cabecera">
                                        <strong
                                            >{valoracion.indicador
                                                ?.descripcion ??
                                                'Indicador'}</strong
                                        >
                                        <span class="contador"
                                            >Nivel {valoracion.nivel}/4</span
                                        >
                                    </div>
                                    <small
                                        >{new Date(
                                            valoracion.fecha,
                                        ).toLocaleString('es-ES')}</small
                                    >
                                    {#if valoracion.observacion}<p>
                                            {valoracion.observacion}
                                        </p>{/if}
                                    <button
                                        type="button"
                                        class="enlace-accion"
                                        onclick={() => alternarTrazabilidad(valoracion.id)}
                                        aria-expanded={valoracionExpandida === valoracion.id}
                                    >
                                        {valoracionExpandida === valoracion.id
                                            ? 'Ocultar detalles'
                                            : 'Ver trazabilidad'}
                                    </button>

                                    {#if valoracionExpandida === valoracion.id}
                                        <div class="detalle-trazabilidad">
                                            {#if cargandoTrazabilidad[valoracion.id]}
                                                <p>Cargando trazabilidad...</p>
                                            {:else if erroresTrazabilidad[valoracion.id]}
                                                <p class="error" role="alert">
                                                    {erroresTrazabilidad[valoracion.id]}
                                                </p>
                                            {:else if trazabilidades[valoracion.id]}
                                                {@const detalle = trazabilidades[valoracion.id]}
                                                <p><strong>Descriptor aplicado:</strong> {detalle.descriptorAplicado ?? 'No registrado'}</p>
                                                {#if detalle.evidencia}
                                                    <p><strong>Actividad:</strong> {detalle.evidencia.actividad?.titulo ?? 'No disponible'}</p>
                                                    <p><strong>Evidencia:</strong> {detalle.evidencia.descripcion}</p>
                                                    {#if detalle.evidencia.referencia}
                                                        <p><strong>Referencia:</strong> {detalle.evidencia.referencia}</p>
                                                    {/if}
                                                {:else}
                                                    <p>Esta valoración no tiene una evidencia vinculada.</p>
                                                {/if}
                                            {/if}
                                        </div>
                                    {/if}
                                </article>
                            {/each}
                        </div>
                    {/if}
                {:else}
                    <PlanesRefuerzo
                        {planes}
                        cargando={cargandoPlanes}
                        error={errorPlanes}
                        estudianteId={estudianteElegido}
                        imparticionId={imparticionElegida}
                        indicadores={indicadoresPlan}
                        {guardarPlan}
                    />
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .seguimiento-compacto {
        min-width: 0;
    }
    .evolucion-compacta {
        overflow: hidden;
    }
    .cabecera-seguimiento h2 {
        margin: 0 0 0.25rem;
    }
    .cabecera-seguimiento p {
        margin: 0 0 1rem;
        color: #52647d;
    }
    .contexto-evaluacion {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 14px;
    }
    .columnas-seguimiento {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
        gap: 14px;
        align-items: start;
    }
    .resumenes-inferiores {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 14px;
    }
    .columna-resumen {
        display: grid;
        gap: 12px;
        min-width: 0;
    }
    .tarjeta-seguimiento {
        min-width: 0;
        padding: 16px;
        border: 1px solid #dce3ed;
        border-radius: 12px;
        background: #fff;
    }
    .tarjeta-seguimiento h3 {
        margin: 0 0 12px;
        font-size: 1.05rem;
    }
    .campo {
        display: grid;
        gap: 5px;
        margin-bottom: 12px;
        min-width: 0;
    }
    .campo label {
        font-weight: 600;
        font-size: 0.9rem;
    }
    .campo select,
    .campo textarea {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        padding: 9px 11px;
        border: 1px solid #b9cbe0;
        border-radius: 8px;
        font: inherit;
        background: #fff;
        color: #172b49;
    }
    .campo textarea {
        resize: vertical;
    }
    .accion-primaria {
        padding: 10px 14px;
        border: 0;
        border-radius: 8px;
        background: #173b68;
        color: white;
        font: inherit;
        cursor: pointer;
    }
    .accion-primaria:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
    .rubrica-resumen,
    .descriptor-elegido {
        margin: 0 0 12px;
        font-size: 0.88rem;
        color: #52647d;
    }
    .cabecera-tarjeta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }
    .cabecera-tarjeta h3 {
        margin-bottom: 8px;
    }
    .enlace-accion {
        background: none;
        border: 0;
        color: #17569b;
        text-decoration: underline;
        cursor: pointer;
        font: inherit;
        font-size: 0.88rem;
        white-space: nowrap;
    }
    .lista-resumen {
        padding: 0;
        margin: 0;
        list-style: none;
    }
    .lista-resumen li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        border-top: 1px solid #e9eef5;
        font-size: 0.85rem;
    }
    .lista-resumen li span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .lista-resumen li strong {
        flex-shrink: 0;
    }
    .panel-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
    }
    .panel-fondo {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 0;
        background: rgba(15, 23, 42, 0.42);
        cursor: default;
    }
    .panel-deslizante {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(560px, 100%);
        box-sizing: border-box;
        overflow-y: auto;
        background: white;
        padding: 24px;
        box-shadow: -12px 0 35px rgba(0, 0, 0, 0.15);
    }
    .panel-deslizante-cabecera {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #dce3ed;
    }
    .panel-deslizante-cabecera h2 {
        margin: 0;
        font-size: 1.2rem;
    }
    @media (max-width: 1050px) {
        .columnas-seguimiento,
        .resumenes-inferiores {
            grid-template-columns: 1fr;
        }
    }
    @media (max-width: 650px) {
        .contexto-evaluacion {
            grid-template-columns: 1fr;
        }
        .tarjeta-seguimiento {
            padding: 12px;
        }
        .panel-deslizante {
            padding: 16px;
        }
    }
    .detalle-trazabilidad {
        margin-top: 12px;
        padding: 12px;
        border: 1px solid #dce3ed;
        border-radius: 8px;
        background: #f6f8fc;
        font-size: 0.88rem;
    }

    .detalle-trazabilidad p { margin: 0 0 8px; }
    .detalle-trazabilidad p:last-child { margin-bottom: 0; }
    .registro > .enlace-accion { margin-top: 10px; }
</style>
