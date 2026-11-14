-- CreateTable
CREATE TABLE "Valoracion" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "imparticionId" INTEGER NOT NULL,
    "nivel" INTEGER NOT NULL,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Valoracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Valoracion_estudianteId_indicadorId_fecha_idx" ON "Valoracion"("estudianteId", "indicadorId", "fecha");

-- CreateIndex
CREATE INDEX "Valoracion_imparticionId_fecha_idx" ON "Valoracion"("imparticionId", "fecha");

-- AddForeignKey
ALTER TABLE "Valoracion" ADD CONSTRAINT "Valoracion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valoracion" ADD CONSTRAINT "Valoracion_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valoracion" ADD CONSTRAINT "Valoracion_imparticionId_fkey" FOREIGN KEY ("imparticionId") REFERENCES "ImparticionModulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
