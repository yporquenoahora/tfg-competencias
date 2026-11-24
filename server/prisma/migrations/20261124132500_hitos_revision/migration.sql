CREATE TABLE "HitoRevision" (
    "id" SERIAL NOT NULL,
    "imparticionId" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "revisado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "HitoRevision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HitoRevision_imparticionId_fkey" FOREIGN KEY ("imparticionId")
      REFERENCES "ImparticionModulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "HitoRevision_imparticionId_fecha_idx" ON "HitoRevision"("imparticionId", "fecha");
