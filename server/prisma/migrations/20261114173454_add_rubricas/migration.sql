-- CreateTable
CREATE TABLE "Rubrica" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelDesempeno" (
    "id" SERIAL NOT NULL,
    "rubricaId" INTEGER NOT NULL,
    "valor" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "NivelDesempeno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricaIndicador" (
    "id" SERIAL NOT NULL,
    "rubricaId" INTEGER NOT NULL,
    "indicadorId" INTEGER NOT NULL,

    CONSTRAINT "RubricaIndicador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NivelDesempeno_rubricaId_valor_key" ON "NivelDesempeno"("rubricaId", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "RubricaIndicador_rubricaId_indicadorId_key" ON "RubricaIndicador"("rubricaId", "indicadorId");

-- AddForeignKey
ALTER TABLE "NivelDesempeno" ADD CONSTRAINT "NivelDesempeno_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "Rubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricaIndicador" ADD CONSTRAINT "RubricaIndicador_rubricaId_fkey" FOREIGN KEY ("rubricaId") REFERENCES "Rubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricaIndicador" ADD CONSTRAINT "RubricaIndicador_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
