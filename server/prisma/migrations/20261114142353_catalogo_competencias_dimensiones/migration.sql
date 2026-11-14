/*
  Warnings:

  - You are about to drop the column `creadoEn` on the `Indicador` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Competencia" ADD COLUMN     "fuenteId" INTEGER;

-- AlterTable
ALTER TABLE "Indicador" DROP COLUMN "creadoEn",
ADD COLUMN     "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dimensionId" INTEGER;

-- CreateTable
CREATE TABLE "FuenteCompetencial" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "organismo" TEXT,
    "referencia" TEXT,
    "descripcion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuenteCompetencial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dimension" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competenciaId" INTEGER NOT NULL,

    CONSTRAINT "Dimension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dimension_competenciaId_nombre_key" ON "Dimension"("competenciaId", "nombre");

-- AddForeignKey
ALTER TABLE "Competencia" ADD CONSTRAINT "Competencia_fuenteId_fkey" FOREIGN KEY ("fuenteId") REFERENCES "FuenteCompetencial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dimension" ADD CONSTRAINT "Dimension_competenciaId_fkey" FOREIGN KEY ("competenciaId") REFERENCES "Competencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicador" ADD CONSTRAINT "Indicador_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "Dimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
