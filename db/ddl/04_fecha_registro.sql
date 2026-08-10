-- Referencia Oracle (no usado actualmente; ver db/postgres/003_fecha_registro.sql
-- para la version activa en Postgres/Neon).
ALTER TABLE beneficiarios ADD (registrado_en TIMESTAMP);
