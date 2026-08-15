-- Referencia Oracle (no usado actualmente; ver db/postgres/005_origen_importado.sql
-- para la version activa en Postgres/Neon, que incluye el backfill de los
-- 97 documentos originales).
ALTER TABLE beneficiarios ADD (origen_importado CHAR(1) DEFAULT 'N' NOT NULL);
ALTER TABLE beneficiarios ADD CONSTRAINT ck_beneficiarios_origen CHECK (origen_importado IN ('S','N'));
