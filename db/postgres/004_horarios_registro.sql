-- Franjas horarias (hora de Colombia) en las que se permite guardar
-- (crear/actualizar) una preinscripcion. Por dia de la semana, cuales de
-- las 5 franjas fijas (ver app/src/lib/horarios.js) estan habilitadas.
-- Por defecto quedan todas habilitadas los 7 dias (equivalente a no
-- restringir nada) hasta que se ajuste desde /admin/configuracion.
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS horarios_habilitados JSONB NOT NULL DEFAULT '{
  "lunes":     {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
  "martes":    {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
  "miercoles": {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
  "jueves":    {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
  "viernes":   {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
  "sabado":    {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
  "domingo":   {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true}
}'::jsonb;
