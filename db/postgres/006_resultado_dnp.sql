-- Resultado de la consulta RUI/Sisben (ventanillasocial.dnp.gov.co) para
-- cada beneficiario, usada para verificar el nivel de vulnerabilidad antes
-- de entregar las ayudas. Esta consulta se hace por fuera de la app (ver
-- scripts/consultar_dnp) y solo escribe estas 3 columnas: no participan en
-- el formulario publico ni en el de edicion del panel admin, para que un
-- guardado normal de un beneficiario nunca las borre.
ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS resultado_rui TEXT;
ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS resultado_sisben TEXT;
ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS consulta_dnp_en TIMESTAMPTZ;
