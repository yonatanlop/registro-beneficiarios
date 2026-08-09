-- Convierte los datos de la jornada/evento (antes editables por persona
-- en el formulario) en una configuracion global unica, editable solo
-- desde /admin/configuracion. Se aplican automaticamente a cada
-- beneficiario al crear/actualizar desde el formulario o desde la
-- edicion en el panel admin. La importacion masiva desde Excel NO se ve
-- afectada: sigue tomando estos valores de las columnas del archivo,
-- para no alterar datos historicos ya cargados.
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS departamento VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS municipio VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS lugar_direccion VARCHAR(200) NOT NULL DEFAULT 'Calle 1 Sur # 6 - 44 Salón Comunal Florida Parque';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS actividad_desarrollada VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS linea_estrategica VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS programa VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS proyecto VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS beneficios_entregados VARCHAR(200) NOT NULL DEFAULT '';
