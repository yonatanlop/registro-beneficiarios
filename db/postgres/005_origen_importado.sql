-- Marca cual fue el ORIGEN de cada beneficiario: 'S' = vino de la carga
-- masiva inicial (data/transcripcion_junio_2025.xlsx, las 97 personas del
-- PDF de junio 2025), 'N' = se creo directamente desde el formulario
-- publico (alguien nuevo que no estaba en esa lista original).
--
-- Se fija una sola vez, al crear el registro, y no cambia despues aunque
-- la persona se actualice o se vuelva a re-importar. Se usa para que el
-- reporte "Registrados vs. pendientes" del panel admin compare
-- exclusivamente contra la lista original de 97 personas, sin mezclar
-- registros nuevos que nunca estuvieron en esa carga inicial.
ALTER TABLE beneficiarios ADD COLUMN IF NOT EXISTS origen_importado CHAR(1) NOT NULL DEFAULT 'N';
ALTER TABLE beneficiarios ADD CONSTRAINT ck_beneficiarios_origen CHECK (origen_importado IN ('S','N'));

-- Backfill: marca como 'S' a los 97 documentos que vinieron de la carga
-- inicial (si ya existen en la base). No toca a nadie mas.
UPDATE beneficiarios
   SET origen_importado = 'S'
 WHERE documento_identidad IN (
'41108004','68302897','24017660','1049641146','24156924','51782895','52491130','1049629514','23315701','52008392','23268924','6762951','41773165','4149779','41732576','51928796','2398330','24070997','1057588487','30206205','1002565451','46385207','52497537','1049658900','85406102','40024334','34564450','71180131','17023454','40015016','40034591','1049605329','40014244','41744871','7188305','40045812','40040080','40031965','1050602853','40037093','40022804','20340683','40011846','17056069','46680739','24196981','29897401','40013339','23490091','39403708','1002392949','32272262','40037454','23157411','46668200','1049628231','1057606134','24178941','4046379','23399844','28680293','23636509','1055186226','45540192','1002709687','40018647','1030566809','41618018','40036364','40023457','23266302','28476751','6757234','1049618117','41732526','6746054','40028978','40034853','40045586','40012619','52073832','40026258','40032930','28313516','28892572','6771995','23756003','1050603009','1049656336','40049010','1053282379','51956255','40011117','1051066181','1050090134','74341892','1020823471'
);
