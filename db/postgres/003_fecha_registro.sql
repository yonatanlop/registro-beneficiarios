-- Fecha y hora exacta en la que un beneficiario paso a estar "registrado"
-- (registrado: 'N' -> 'S'), para poder ver en el panel admin en que
-- momento se hizo cada registro. Queda en NULL para quienes todavia no se
-- han registrado (por ejemplo, los cargados solo por importacion masiva).
ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS registrado_en TIMESTAMPTZ;
