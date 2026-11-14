-- CreateTable
CREATE TABLE "ConfiguracionSeguimiento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionSeguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorSeleccionado" (
    "id" SERIAL NOT NULL,
    "configuracionId" INTEGER NOT NULL,
    "indicadorId" INTEGER NOT NULL,

    CONSTRAINT "IndicadorSeleccionado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndicadorSeleccionado_configuracionId_indicadorId_key" ON "IndicadorSeleccionado"("configuracionId", "indicadorId");

-- AddForeignKey
ALTER TABLE "IndicadorSeleccionado" ADD CONSTRAINT "IndicadorSeleccionado_configuracionId_fkey" FOREIGN KEY ("configuracionId") REFERENCES "ConfiguracionSeguimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorSeleccionado" ADD CONSTRAINT "IndicadorSeleccionado_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
