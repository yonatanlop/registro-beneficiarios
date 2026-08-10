-- Referencia Oracle (no usado actualmente; ver db/postgres/004_horarios_registro.sql
-- para la version activa en Postgres/Neon). Oracle 21c+ soporta JSON
-- nativo; en versiones anteriores basta VARCHAR2/CLOB con el mismo texto.
ALTER TABLE configuracion ADD (
    horarios_habilitados CLOB DEFAULT '{
      "lunes":     {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
      "martes":    {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
      "miercoles": {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
      "jueves":    {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
      "viernes":   {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
      "sabado":    {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true},
      "domingo":   {"v1": true, "v2": true, "v3": true, "v4": true, "v5": true}
    }' NOT NULL
);
