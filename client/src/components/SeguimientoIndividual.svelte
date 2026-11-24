<script>
    import Evolucion from '../components/Evolucion.svelte';
    import PlanesRefuerzo from '../components/PlanesRefuerzo.svelte';
    import { API_BASE } from '../lib/api.js';

    export let informeDesde = '';
    export let informeHasta = '';
    let desdeInforme = '';
    let hastaInforme = '';
    $: desdeInforme = informeDesde;
    $: hastaInforme = informeHasta;

    const fechaInforme = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    function enPeriodo(fecha) {
        const instante = new Date(fecha);
        if (!fecha || !Number.isFinite(+instante)) return false;
        const dia = fechaInforme.format(instante);
        return (!desdeInforme || dia >= desdeInforme) && (!hastaInforme || dia <= hastaInforme);
    }

    export let grupo = null;
    export let estudiantes = [];
    export let imparticiones = [];
    export let configuraciones = [];
    export let evaluables = [];
    export let cambiarEstadoPlan;
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
    export let abrirCatalogo;
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
    $: void cargarEvidencias(
        actividadElegida,
        estudianteElegido,
        imparticionElegida,
    );

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
                `${API_BASE}/actividades?imparticionId=${encodeURIComponent(imparticionId)}`,
            );
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const datos = await respuesta.json();
            if (version === versionActividades) actividades = datos;
        } catch (error) {
            if (version === versionActividades)
                errorActividades = error.message;
        } finally {
            if (version === versionActividades) cargandoActividades = false;
        }
    }

    async function cargarEvidencias(actividadId, estudianteId, imparticionId) {
        const version = ++versionEvidencias;
        evidencias = [];
        evidenciaIdSeleccionada = '';
        errorEvidencias = '';
        cargandoEvidencias = Boolean(
            actividadId && estudianteId && imparticionId,
        );
        if (!cargandoEvidencias) return;
        try {
            const parametros = new URLSearchParams({
                actividadId: String(actividadId),
                estudianteId: String(estudianteId),
            });
            const respuesta = await fetch(
                `${API_BASE}/evidencias?${parametros}`,
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

    // Propuestas orientativas: dos últimas observaciones del mismo indicador y módulo.
    $: propuestasRefuerzo = [...new Set(historialModulo.map(v => v.indicadorId))]
        .map(id => {
            const registros = historialModulo
                .filter(v => Number(v.indicadorId) === Number(id))
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id);
            const [ultima, anterior] = registros;
            if (!ultima || Number(ultima.nivel) > 2) return null;
            const prioritaria = Boolean(anterior && Number(anterior.nivel) <= 2);
            const descripcionIndicador = ultima.indicador?.descripcion ?? 'el indicador observado';
            return {
                indicadorId: Number(id),
                indicador: descripcionIndicador,
                estado: prioritaria ? 'revision_prioritaria' : 'atencion_inicial',
                nivelActual: ultima.nivel,
                objetivo: `Mejorar el desempeño en: ${descripcionIndicador}`,
                descripcion: prioritaria
                    ? `Acordar con el estudiante una secuencia breve de tareas, proporcionar una guía de apoyo y observar nuevamente el indicador en dos actividades. Registrar las evidencias y ajustar el apoyo según los resultados.`
                    : `Revisar con el estudiante las dificultades observadas, ofrecer una pauta concreta de trabajo y realizar una nueva observación en la siguiente actividad.`,
            };
        })
        .filter(Boolean);

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
    $: if (imparticionElegida !== undefined) cerrarPanel();
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
                `${API_BASE}/valoraciones/${id}/trazabilidad`,
            );
            if (!respuesta.ok)
                throw new Error(`Error HTTP ${respuesta.status}`);

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

    let exportandoInforme = false;
    let errorInforme = '';

    function escaparHTML(valor) {
        return String(valor ?? '').replace(
            /[&<>"']/g,
            (caracter) =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                })[caracter],
        );
    }

    async function exportarInforme() {
        errorInforme = '';
        if (desdeInforme && hastaInforme && desdeInforme > hastaInforme) {
            errorInforme = 'La fecha de inicio debe preceder a la fecha de fin.';
            return;
        }
        const periodo = `${desdeInforme || 'Inicio del seguimiento'} — ${hastaInforme || 'Último registro'}`;

        const estudiante = estudiantes.find(
            (e) => String(e.id) === String(estudianteElegido),
        );
        const imparticion = imparticiones.find(
            (i) => String(i.id) === String(imparticionElegida),
        );

        if (
            !estudiante ||
            !imparticion ||
            cargandoHistorial ||
            cargandoPlanes ||
            errorHistorial ||
            errorPlanes
        ) {
            errorInforme =
                'Espera a que terminen de cargar los datos del estudiante.';
            return;
        }

        // Abrir inmediatamente para evitar bloqueos de ventanas emergentes.
        const ventana = window.open('', '_blank');

        if (!ventana) {
            errorInforme =
                'Permite las ventanas emergentes para generar el informe.';
            return;
        }

        ventana.document.write('<p>Preparando informe...</p>');
        exportandoInforme = true;

        try {
            const valoraciones = historialModulo.filter((v) => enPeriodo(v.fecha)).sort(
                (a, b) => new Date(b.fecha) - new Date(a.fecha),
            );

            const detalles = await Promise.all(
                valoraciones.map(async (v) => {
                    const respuesta = await fetch(
                        `${API_BASE}/valoraciones/${v.id}/trazabilidad`,
                    );

                    if (!respuesta.ok) {
                        throw new Error(
                            `No se pudo consultar la valoración ${v.id}`,
                        );
                    }

                    return respuesta.json();
                }),
            );

            const filas = valoraciones
                .map((v, indice) => {
                    const detalle = detalles[indice];
                    const evidencia = detalle.evidencia;

                    return `
                <tr>
                    <td>${escaparHTML(new Date(v.fecha).toLocaleDateString('es-ES'))}</td>
                    <td>${escaparHTML(v.indicador?.descripcion ?? 'Indicador no disponible')}</td>
                    <td>${escaparHTML(v.nivel)}/4</td>
                    <td>${escaparHTML(v.observacion || 'Sin observación')}</td>
                    <td>
                        ${escaparHTML(detalle.descriptorAplicado || 'No registrado')}
                        ${
                            evidencia
                                ? `
                            <p><strong>Actividad:</strong>
                            ${escaparHTML(evidencia.actividad?.titulo || 'No disponible')}</p>
                            <p><strong>Evidencia:</strong>
                            ${escaparHTML(evidencia.descripcion)}</p>
                            ${
                                evidencia.referencia
                                    ? `
                                <p><strong>Referencia:</strong>
                                ${escaparHTML(evidencia.referencia)}</p>
                            `
                                    : ''
                            }
                        `
                                : ''
                        }
                    </td>
                </tr>
            `;
                })
                .join('');

            // Resumen pedagógico por indicador, siempre dentro de la impartición seleccionada.
            const gruposIndicadores = new Map();
            for (const v of valoraciones) {
                if (!gruposIndicadores.has(v.indicadorId)) gruposIndicadores.set(v.indicadorId, []);
                gruposIndicadores.get(v.indicadorId).push(v);
            }
            const resumentes = [...gruposIndicadores.entries()].map(([id, registros]) => {
                const ordenados = [...registros].sort((a, b) =>
                    new Date(a.fecha) - new Date(b.fecha) || a.id - b.id);
                const inicial = ordenados[0];
                const actual = ordenados[ordenados.length - 1];
                const anterior = ordenados.length > 1 ? ordenados[ordenados.length - 2] : null;
                const diferencia = Number(actual.nivel) - Number(inicial.nivel);
                const tendencia = ordenados.length < 2 ? 'Evidencia insuficiente'
                    : diferencia > 0 ? 'Mejora observada'
                    : diferencia < 0 ? 'Retroceso observado' : 'Sin cambio entre inicio y fin';
                const estado = Number(actual.nivel) > 2 ? 'Sin alerta actual'
                    : anterior && Number(anterior.nivel) <= 2 ? 'Revisión prioritaria'
                    : 'Atención inicial';
                return { id, nombre: actual.indicador?.descripcion ?? 'Indicador',
                    inicial: inicial.nivel, actual: actual.nivel, diferencia,
                    numero: ordenados.length, tendencia, estado };
            });

            const moduloCurricularId = imparticion.moduloId;
            const asociaciones = new Map();
            if (moduloCurricularId != null) {
                await Promise.all(resumentes.map(async (item) => {
                    const respuesta = await fetch(
                        `${API_BASE}/indicadores/${item.id}/criterios`
                    );
                    if (!respuesta.ok) throw new Error(`No se pudo consultar el currículo del indicador ${item.id}`);
                    const indicador = await respuesta.json();
                    const criterios = (indicador.criteriosCurriculares ?? [])
                        .map(a => a.criterio)
                        .filter(c => Number(c?.resultado?.moduloId) === Number(moduloCurricularId));
                    asociaciones.set(item.id, criterios);
                }));
            }
            const filasResumen = resumentes.map(item => {
                const criterios = asociaciones.get(item.id) ?? [];
                const textoCurricular = moduloCurricularId == null
                    ? 'Impartición sin currículo asociado'
                    : criterios.length ? criterios.map(c =>
                        `${escaparHTML(c.resultado.codigo)}: ${escaparHTML(c.resultado.texto)} — ${escaparHTML(c.codigo)}: ${escaparHTML(c.texto)}`
                    ).join('<hr>') : 'Sin CE vinculados en este módulo';
                return `<tr><td>${escaparHTML(item.nombre)}</td>
                    <td>${item.numero}</td><td>${item.inicial}/4</td><td>${item.actual}/4</td>
                    <td>${item.diferencia > 0 ? '+' : ''}${item.diferencia}</td>
                    <td>${escaparHTML(item.tendencia)}</td><td>${escaparHTML(item.estado)}</td>
                    <td>${textoCurricular}</td></tr>`;
            }).join('');
            const planesModulo = planes.filter(p =>
                Number(p.imparticionId) === Number(imparticionElegida) &&
                ((!desdeInforme && !hastaInforme) || enPeriodo(p.fechaInicio) || enPeriodo(p.fechaRevision)),
            );
            const filasPlanes = planesModulo.map(p => `<tr>
                <td>${escaparHTML(p.indicador?.descripcion ?? 'Indicador')}</td>
                <td>${escaparHTML(p.objetivo)}</td>
                <td>${escaparHTML(p.descripcion)}</td>
                <td>${escaparHTML(p.estado)}</td>
                <td>${p.fechaRevision ? escaparHTML(new Date(p.fechaRevision).toLocaleDateString('es-ES')) : 'Sin establecer'}</td>
            </tr>`).join('');

            const documento = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe individual - ${escaparHTML(estudiante.codigo)}</title>
<style>
    @page { size: A4; margin: 16mm; }
    body {
        font-family: Arial, sans-serif;
        color: #302720;
        font-size: 10pt;
        line-height: 1.45;
    }
    h1 { font-size: 20pt; margin-bottom: 5mm; }
    h2 {
        font-size: 13pt;
        border-bottom: 1px solid #c95622;
        padding-bottom: 2mm;
        margin-top: 8mm;
    }
    .metadatos p { margin: 2mm 0; }
    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 8pt;
    }
    th, td {
        padding: 7px;
        border: 1px solid #f2d7c4;
        vertical-align: top;
        overflow-wrap: anywhere;
    }
    th { background: #fff3e8; text-align: left; }
    tr { break-inside: avoid; }
    .nota { color: #795f50; font-size: 9pt; }
    .acciones { margin: 20px 0; }
    @media print {
        .acciones { display: none; }
    }
</style>
</head>
<body>
    <h1>Informe individual de seguimiento</h1>
    <p class="nota">Competencias transversales · Formación Profesional</p>

    <div class="metadatos">
        <p><strong>Periodo:</strong> ${escaparHTML(periodo)}</p>
        <p><strong>Estudiante:</strong>
        ${escaparHTML(estudiante.nombre)} (${escaparHTML(estudiante.codigo)})</p>
        <p><strong>Grupo:</strong> ${escaparHTML(grupo.nombre)}</p>
        <p><strong>Curso:</strong> ${escaparHTML(grupo.curso)}</p>
        <p><strong>Módulo:</strong> ${escaparHTML(imparticion.nombreModulo)}</p>
        <p><strong>Fecha de emisión:</strong>
        ${new Date().toLocaleDateString('es-ES')}</p>
    </div>

    <h2>Resumen pedagógico por indicador</h2>
    ${resumentes.length ? `<table><thead><tr>
        <th>Indicador</th><th>N.º</th><th>Inicial</th><th>Actual</th><th>Variación</th>
        <th>Tendencia</th><th>Seguimiento</th><th>RA / CE vinculados</th>
    </tr></thead><tbody>${filasResumen}</tbody></table>`
    : '<p>No hay observaciones para interpretar en este módulo.</p>'}
    <p class="nota">La tendencia compara la primera y la última observación del indicador.
    El estado de atención utiliza las dos últimas. Una asociación curricular no equivale
    a una calificación del RA o CE.</p>

    <h2>Historial de valoraciones</h2>
    ${
        valoraciones.length
            ? `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Indicador</th>
                    <th>Nivel</th>
                    <th>Observación</th>
                    <th>Descriptor y evidencia</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
    `
            : '<p>No hay valoraciones registradas para este módulo.</p>'
    }

    <h2>Planes de refuerzo registrados en este módulo</h2>
    <p>Total: ${planesModulo.length}</p>
    ${planesModulo.length ? `<table><thead><tr><th>Indicador</th><th>Objetivo</th>
        <th>Estrategia</th><th>Estado</th><th>Revisión</th></tr></thead>
        <tbody>${filasPlanes}</tbody></table>`
        : '<p>No hay planes de refuerzo registrados para esta impartición.</p>'}
    <p class="nota">Las propuestas pendientes de aceptación no se incluyen como planes.</p>

    <h2>Consideraciones</h2>
    <p class="nota">
        Los niveles representan observaciones docentes sobre competencias
        transversales. No constituyen diagnósticos ni equivalen por sí solos
        a calificaciones curriculares.
    </p>

    <div class="acciones">
        <button onclick="window.print()">Imprimir / Guardar como PDF</button>
    </div>
</body>
</html>`;

            ventana.document.open();
            ventana.document.write(documento);
            ventana.document.close();
        } catch (error) {
            ventana.close();
            errorInforme = error.message ?? 'No se pudo generar el informe.';
        } finally {
            exportandoInforme = false;
        }
    }
</script>

<section class="seguimiento-compacto" id="seguimiento-individual">
    {#if grupo}
        <header class="cabecera-seguimiento">
            <div>
                <h2>Seguimiento individual</h2>
                <p>
                    {grupo.nombre} · Curso {grupo.curso} · {estudiantes.length} estudiantes
                </p>
            </div>
            <div class="acciones-informe">
                <div class="revision-periodo">
                    <label>Informe desde <input type="date" bind:value={desdeInforme} /></label>
                    <label>Informe hasta <input type="date" bind:value={hastaInforme} /></label>
                </div>
                <button
                    type="button"
                    class="accion-primaria"
                    onclick={exportarInforme}
                    disabled={!estudianteElegido ||
                        !imparticionElegida ||
                        exportandoInforme ||
                        cargandoHistorial ||
                        cargandoPlanes}
                >
                    {exportandoInforme
                        ? 'Preparando informe...'
                        : 'Exportar informe PDF'}
                </button>

                {#if errorInforme}
                    <p class="error" role="alert">{errorInforme}</p>
                {/if}
            </div>
        </header>

        <div class="contexto-evaluacion">
            <div class="campo">
                <label for="estudiante">Alumno</label>
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
            <div class="campo">
                <label for="configuracion-evaluacion"
                    >Configuración de seguimiento</label
                >
                <select
                    id="configuracion-evaluacion"
                    bind:value={configuracionEvaluacion}
                    onchange={recuperarConfiguracion}
                    disabled={!imparticionElegida ||
                        configuraciones.length === 0}
                >
                    <option value="">Selecciona una configuración</option>
                    {#each configuraciones as configuracion (configuracion.id)}
                        <option value={String(configuracion.id)}>
                            {configuracion.nombre} ({configuracion.indicadores
                                ?.length ?? 0} indicadores)
                        </option>
                    {/each}
                </select>
                {#if imparticionElegida && configuraciones.length === 0}
                    <small>Elige qué indicadores quieres observar en este módulo.</small>
                    <button type="button" class="secundario" onclick={abrirCatalogo}>
                        Configurar indicadores
                    </button>
                {/if}
            </div>

        </div>

        <div class="columnas-seguimiento">
            <section
                class="tarjeta-seguimiento"
                aria-labelledby="titulo-valoracion"
            >
                <h3 id="titulo-valoracion">Nueva valoración</h3>
                {#if evaluables.length === 0}
                    <p>
                        Selecciona una configuración de seguimiento con
                        indicadores para comenzar la valoración.
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
                    <details class="opciones-evidencia">
                        <summary
                            >Actividad y evidencia <span>(opcional)</span
                            ></summary
                        >
                        <div class="campos-opcionales">
                            <div class="campo">
                                <label for="actividad-valoracion"
                                    >Actividad (opcional)</label
                                >
                                <select
                                    id="actividad-valoracion"
                                    bind:value={actividadElegida}
                                    disabled={cargandoActividades ||
                                        !imparticionElegida}
                                >
                                    <option value=""
                                        >Sin actividad asociada</option
                                    >
                                    {#each actividades as actividad (actividad.id)}
                                        <option value={String(actividad.id)}
                                            >{actividad.titulo}</option
                                        >
                                    {/each}
                                </select>
                                {#if cargandoActividades}<small
                                        >Cargando actividades...</small
                                    >{/if}
                                {#if errorActividades}
                                    <p class="error" role="alert">
                                        Error al cargar actividades: {errorActividades}
                                    </p>
                                {/if}
                            </div>
                            <div class="campo">
                                <label for="evidencia-valoracion"
                                    >Evidencia (opcional)</label
                                >
                                <select
                                    id="evidencia-valoracion"
                                    bind:value={evidenciaIdSeleccionada}
                                    disabled={!actividadElegida ||
                                        cargandoEvidencias ||
                                        !estudianteElegido}
                                >
                                    <option value=""
                                        >Sin evidencia asociada</option
                                    >
                                    {#each evidencias as evidencia (evidencia.id)}
                                        <option value={String(evidencia.id)}>
                                            {evidencia.descripcion}
                                        </option>
                                    {/each}
                                </select>
                                {#if cargandoEvidencias}<small
                                        >Cargando evidencias...</small
                                    >{/if}
                                {#if errorEvidencias}
                                    <p class="error" role="alert">
                                        Error al cargar evidencias: {errorEvidencias}
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </details>
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
                            moduloId={imparticiones.find(
                                (i) =>
                                    String(i.id) === String(imparticionElegida),
                            )?.moduloId ?? null}
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
                        onclick={() => abrirPanel('historial')}>Ver todo</button
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
                        onclick={() => abrirPanel('planes')}>Gestionar</button
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
                <button
                    bind:this={botonCerrarPanel}
                    type="button"
                    onclick={cerrarPanel}>Cerrar</button
                >
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
                                        onclick={() =>
                                            alternarTrazabilidad(valoracion.id)}
                                        aria-expanded={valoracionExpandida ===
                                            valoracion.id}
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
                                                    {erroresTrazabilidad[
                                                        valoracion.id
                                                    ]}
                                                </p>
                                            {:else if trazabilidades[valoracion.id]}
                                                {@const detalle =
                                                    trazabilidades[
                                                        valoracion.id
                                                    ]}
                                                <p>
                                                    <strong
                                                        >Descriptor aplicado:</strong
                                                    >
                                                    {detalle.descriptorAplicado ??
                                                        'No registrado'}
                                                </p>
                                                {#if detalle.evidencia}
                                                    <p>
                                                        <strong
                                                            >Actividad:</strong
                                                        >
                                                        {detalle.evidencia
                                                            .actividad
                                                            ?.titulo ??
                                                            'No disponible'}
                                                    </p>
                                                    <p>
                                                        <strong
                                                            >Evidencia:</strong
                                                        >
                                                        {detalle.evidencia
                                                            .descripcion}
                                                    </p>
                                                    {#if detalle.evidencia.referencia}
                                                        <p>
                                                            <strong
                                                                >Referencia:</strong
                                                            >
                                                            {detalle.evidencia
                                                                .referencia}
                                                        </p>
                                                    {/if}
                                                {:else}
                                                    <p>
                                                        Esta valoración no tiene
                                                        una evidencia vinculada.
                                                    </p>
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
                        propuestas={propuestasRefuerzo}
                        {guardarPlan}
                        {cambiarEstadoPlan}
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
        grid-template-columns: repeat(3, minmax(0, 1fr));
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
    @media (max-width: 900px) {
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

    .detalle-trazabilidad p {
        margin: 0 0 8px;
    }
    .detalle-trazabilidad p:last-child {
        margin-bottom: 0;
    }
    .registro > .enlace-accion {
        margin-top: 10px;
    }
    .acciones-informe {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
    }

    /* Rediseño compacto terracota: únicamente esta vista */
    .seguimiento-compacto {
        container-type: inline-size;
    }
    .cabecera-seguimiento {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
    }
    .cabecera-seguimiento h2 {
        color: #302720;
        font-size: 1.35rem;
    }
    .cabecera-seguimiento p {
        margin: 0;
        color: #795f50;
        font-size: 0.85rem;
    }
    .acciones-informe {
        margin: 0;
        gap: 8px;
    }
    .acciones-informe .accion-primaria {
        padding: 8px 12px;
        font-size: 0.84rem;
    }
    .contexto-evaluacion {
        gap: 10px;
        margin-bottom: 12px;
        padding: 12px;
        border: 1px solid #f2d7c4;
        border-radius: 12px;
        background: #fff3e8;
    }
    .contexto-evaluacion .campo {
        margin-bottom: 0;
    }
    .columnas-seguimiento {
        gap: 12px;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    }
    .resumenes-inferiores {
        gap: 12px;
        margin-top: 12px;
    }
    .tarjeta-seguimiento {
        padding: 13px;
        border-color: #f2d7c4;
    }
    .tarjeta-seguimiento h3 {
        margin-bottom: 9px;
        color: #302720;
    }
    .campo {
        gap: 4px;
        margin-bottom: 9px;
    }
    .campo label {
        font-size: 0.83rem;
        color: #46372d;
    }
    .campo select,
    .campo textarea {
        padding: 7px 9px;
        border-color: #d9bda8;
        color: #302720;
    }
    .campo select:focus-visible,
    .campo textarea:focus-visible {
        outline: 2px solid #c95622;
        outline-offset: 1px;
    }
    .accion-primaria {
        background: #c95622;
        padding: 9px 12px;
        font-weight: 600;
    }
    .accion-primaria:hover:not(:disabled) {
        background: #a94317;
    }
    .enlace-accion {
        color: #a94317;
    }
    .rubrica-resumen,
    .descriptor-elegido {
        margin-bottom: 8px;
        color: #795f50;
    }
    .opciones-evidencia {
        margin: 2px 0 10px;
        border: 1px solid #f2d7c4;
        border-radius: 8px;
        background: #fffaf6;
    }
    .opciones-evidencia summary {
        cursor: pointer;
        padding: 9px 11px;
        color: #873e1c;
        font-weight: 600;
        font-size: 0.85rem;
    }
    .opciones-evidencia summary span {
        font-weight: 400;
        color: #795f50;
    }
    .campos-opcionales {
        padding: 3px 11px 1px;
    }
    .detalle-trazabilidad {
        background: #fff8f2;
        border-color: #f2d7c4;
    }
    @container (max-width: 760px) {
        .columnas-seguimiento,
        .resumenes-inferiores {
            grid-template-columns: minmax(0, 1fr);
        }
        .contexto-evaluacion {
            grid-template-columns: minmax(0, 1fr);
        }
    }
    @media (min-width: 801px) and (max-width: 1050px) {
        .columnas-seguimiento,
        .resumenes-inferiores {
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
        }
    }
</style>
