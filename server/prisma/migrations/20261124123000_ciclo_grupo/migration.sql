ALTER TABLE "Grupo" ADD COLUMN "ciclo" TEXT;

UPDATE "Grupo"
SET "ciclo" = CASE
  WHEN upper("nombre") ~ '[[:<:]]DAW[[:>:]]' THEN 'Desarrollo de Aplicaciones Web'
  WHEN upper("nombre") ~ '[[:<:]]DAM[[:>:]]' THEN 'Desarrollo de Aplicaciones Multiplataforma'
END
WHERE upper("nombre") ~ '[[:<:]](DAW|DAM)[[:>:]]';
