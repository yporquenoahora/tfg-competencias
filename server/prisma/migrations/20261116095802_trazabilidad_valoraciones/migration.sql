-- AlterTable
ALTER TABLE "Valoracion" ADD COLUMN     "descriptorAplicado" TEXT,
ADD COLUMN     "rubricaId" INTEGER;

-- CreateIndex
CREATE INDEX "Valoracion_rubricaId_idx" ON "Valoracion"("rubricaId");

-- AddForeignKey
ALTER TABLE "Valoracion" ADD CONSTRAINT "Valoracion_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "Rubrica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
