-- Asistencia a la caracterizacion, marcada desde la pagina publica
-- /caracterizacion (buscar por documento + boton "Registrar asistencia a
-- la caracterizacion"). Es independiente de "registrado": no participa en
-- ningun formulario (publico ni de edicion), asi que guardar un
-- beneficiario nunca la borra.
ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS caracterizacion CHAR(1) NOT NULL DEFAULT 'N';
ALTER TABLE beneficiarios ADD CONSTRAINT ck_beneficiarios_caracterizacion CHECK (caracterizacion IN ('S','N'));
