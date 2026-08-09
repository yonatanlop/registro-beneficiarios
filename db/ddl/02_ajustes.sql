-- =====================================================================
-- FIMLM - Ajustes: cupo de registros, % de externos, marca de registrado
-- =====================================================================

-- Columna 14b (nueva): indica si el beneficiario se marco como externo
-- en el formulario de preinscripcion.
ALTER TABLE beneficiarios ADD (
    es_externo   CHAR(1) DEFAULT 'N' NOT NULL,
    registrado   CHAR(1) DEFAULT 'N' NOT NULL
);
ALTER TABLE beneficiarios ADD CONSTRAINT ck_beneficiarios_externo CHECK (es_externo IN ('S','N'));
ALTER TABLE beneficiarios ADD CONSTRAINT ck_beneficiarios_registrado CHECK (registrado IN ('S','N'));

CREATE INDEX ix_beneficiarios_registrado ON beneficiarios (registrado);

-- ---------------------------------------------------------------------
-- Tabla: configuracion
-- Fila unica (id = 1) con los parametros de cupo del programa.
-- max_registros: total de beneficiarios que se pueden marcar "registrado".
-- pct_externos: porcentaje (0-100) de ese cupo reservado para externos.
-- ---------------------------------------------------------------------
CREATE TABLE configuracion (
    id              NUMBER DEFAULT 1 NOT NULL,
    max_registros   NUMBER DEFAULT 150 NOT NULL,
    pct_externos    NUMBER DEFAULT 30 NOT NULL,
    actualizado_en  TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT pk_configuracion PRIMARY KEY (id),
    CONSTRAINT ck_configuracion_id CHECK (id = 1),
    CONSTRAINT ck_configuracion_max CHECK (max_registros > 0),
    CONSTRAINT ck_configuracion_pct CHECK (pct_externos BETWEEN 0 AND 100)
);

INSERT INTO configuracion (id, max_registros, pct_externos) VALUES (1, 150, 30);
