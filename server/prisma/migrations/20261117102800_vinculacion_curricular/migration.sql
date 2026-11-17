-- AlterTable
ALTER TABLE "ImparticionModulo" ADD COLUMN     "moduloId" INTEGER;

-- CreateTable
CREATE TABLE "ModuloProfesional" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "ModuloProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultadoAprendizaje" (
    "id" SERIAL NOT NULL,
    "moduloId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "ResultadoAprendizaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterioEvaluacion" (
    "id" SERIAL NOT NULL,
    "raId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "CriterioEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorCriterio" (
    "id" SERIAL NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "criterioId" INTEGER NOT NULL,

    CONSTRAINT "IndicadorCriterio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuloProfesional_codigo_key" ON "ModuloProfesional"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoAprendizaje_moduloId_codigo_key" ON "ResultadoAprendizaje"("moduloId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CriterioEvaluacion_raId_codigo_key" ON "CriterioEvaluacion"("raId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "IndicadorCriterio_indicadorId_criterioId_key" ON "IndicadorCriterio"("indicadorId", "criterioId");

-- AddForeignKey
ALTER TABLE "ImparticionModulo" ADD CONSTRAINT "ImparticionModulo_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloProfesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultadoAprendizaje" ADD CONSTRAINT "ResultadoAprendizaje_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloProfesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterioEvaluacion" ADD CONSTRAINT "CriterioEvaluacion_raId_fkey" FOREIGN KEY ("raId") REFERENCES "ResultadoAprendizaje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorCriterio" ADD CONSTRAINT "IndicadorCriterio_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorCriterio" ADD CONSTRAINT "IndicadorCriterio_criterioId_fkey" FOREIGN KEY ("criterioId") REFERENCES "CriterioEvaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
