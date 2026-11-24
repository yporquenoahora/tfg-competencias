export function leerCsvEstudiantes(texto) {
    const limpio = texto.replace(/^\uFEFF/, '');
    const lineas = limpio.split(/\r?\n/).filter((linea) => linea.trim());

    if (lineas.length < 2) {
        throw new Error('El CSV debe contener cabecera y estudiantes.');
    }

    const separador = lineas[0].includes(';') ? ';' : ',';
    const cabecera = lineas[0]
        .split(separador)
        .map((valor) => valor.trim().toLowerCase());

    const indiceCodigo = cabecera.indexOf('codigo');
    const indiceNombre = cabecera.indexOf('nombre');

    if (indiceCodigo === -1 || indiceNombre === -1) {
        throw new Error(
            'El CSV debe incluir las columnas codigo y nombre.',
        );
    }

    return lineas.slice(1).map((linea, indice) => {
        const columnas = linea
            .split(separador)
            .map((valor) => valor.trim());

        if (columnas.length !== cabecera.length) {
            throw new Error(
                `Número de columnas incorrecto en la fila ${indice + 2}.`,
            );
        }

        return {
            codigo: columnas[indiceCodigo],
            nombre: columnas[indiceNombre],
        };
    });
}
