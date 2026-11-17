-- AlterTable
ALTER TABLE "ConfiguracionSeguimiento" ADD COLUMN     "imparticionId" INTEGER;

-- AddForeignKey
ALTER TABLE "ConfiguracionSeguimiento" ADD CONSTRAINT "ConfiguracionSeguimiento_imparticionId_fkey" FOREIGN KEY ("imparticionId") REFERENCES "ImparticionModulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
