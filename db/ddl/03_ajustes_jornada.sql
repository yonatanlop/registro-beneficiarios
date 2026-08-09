-- Referencia Oracle (no usado actualmente; ver db/postgres/002_ajustes_jornada.sql
-- para la version activa en Postgres/Neon). Convierte los datos de la
-- jornada/evento en una configuracion global unica.
ALTER TABLE configuracion ADD (
    departamento            VARCHAR2(100) DEFAULT '' NOT NULL,
    municipio               VARCHAR2(100) DEFAULT '' NOT NULL,
    lugar_direccion         VARCHAR2(200) DEFAULT 'Calle 1 Sur # 6 - 44 Salon Comunal Florida Parque' NOT NULL,
    actividad_desarrollada  VARCHAR2(200) DEFAULT '' NOT NULL,
    linea_estrategica       VARCHAR2(200) DEFAULT '' NOT NULL,
    programa                VARCHAR2(200) DEFAULT '' NOT NULL,
    proyecto                VARCHAR2(200) DEFAULT '' NOT NULL,
    beneficios_entregados   VARCHAR2(200) DEFAULT '' NOT NULL
);
