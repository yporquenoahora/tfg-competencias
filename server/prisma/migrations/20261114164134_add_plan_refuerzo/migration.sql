-- CreateTable
CREATE TABLE "PlanRefuerzo" (
    "id" SERIAL NOT NULL,
    "estudianteId" INTEGER NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "imparticionId" INTEGER NOT NULL,
    "objetivo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRevision" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanRefuerzo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanRefuerzo_estudianteId_indicadorId_idx" ON "PlanRefuerzo"("estudianteId", "indicadorId");

-- CreateIndex
CREATE INDEX "PlanRefuerzo_imparticionId_estado_idx" ON "PlanRefuerzo"("imparticionId", "estado");

-- AddForeignKey
ALTER TABLE "PlanRefuerzo" ADD CONSTRAINT "PlanRefuerzo_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRefuerzo" ADD CONSTRAINT "PlanRefuerzo_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRefuerzo" ADD CONSTRAINT "PlanRefuerzo_imparticionId_fkey" FOREIGN KEY ("imparticionId") REFERENCES "ImparticionModulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
