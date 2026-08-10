-- Este script solo se usa para el contenedor local de Oracle Free
-- (docker-compose). Crea los objetos dentro del esquema de la
-- aplicacion (APP_USER) y luego ejecuta el DDL compartido con produccion.
ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = REGISTRO;
@/opt/ddl/01_tables.sql
@/opt/ddl/02_ajustes.sql
@/opt/ddl/03_ajustes_jornada.sql
@/opt/ddl/04_fecha_registro.sql
