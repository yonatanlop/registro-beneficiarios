# FIMLM · Registro de Beneficiarios (Jornadas de Apoyo)

## En producción

- **App:** https://fimlm-preinscripcion.onrender.com/preinscripcion (Render, free tier)
- **Base de datos:** Neon (Postgres, free tier)
- **Punto de entrada recomendado:** https://yonatanlop.github.io/fimlm-preinscripcion/
  — pantalla de espera que aguanta el "cold start" de Render (el free tier
  duerme el servicio tras 15 min sin visitas y tarda ~30-60s en despertar)
  y redirige sola a `/preinscripcion` en cuanto la app responde. Compártela
  a los usuarios en vez del link directo a Render.
- **Importar los datos del PDF a producción:** `./scripts/importar_datos.sh`
  (pide usuario/clave admin de forma interactiva, sube
  `data/transcripcion_junio_2025.xlsx` vía el panel admin).

Mini aplicación web con 3 páginas:

1. **Preinscripción** (`/preinscripcion`, pública): busca a una persona por
   documento de identidad. Si ya existe, precarga sus datos para
   actualizarlos; si no existe, permite registrarla. Reproduce todas las
   columnas de la "Planilla de Registro de Beneficiarios" de FIMLM, excepto
   la firma/huella.
2. **Ingreso administrativo** (`/login`): acceso con usuario y contraseña
   para el equipo de FIMLM.
3. **Panel administrativo** (`/admin`): listado y búsqueda de todos los
   beneficiarios registrados, edición, exportación a Excel (con el mismo
   formato de columnas de la planilla) e importación masiva desde Excel.

## Cupo de registros y % de externos

Desde `/admin/configuracion` se define:

- **Máximo de registros** (por defecto 150): una vez que esa cantidad de
  personas queda marcada como "registrado", el formulario de preinscripción
  deja de aceptar **registros nuevos** (crear a alguien, o marcar por
  primera vez como registrado a alguien ya existente en la base). Los
  registros que ya estaban registrados **se pueden seguir editando sin
  límite**.
- **% de externos** (por defecto 30%): del cupo anterior, ese porcentaje
  queda reservado para personas marcadas como "Es externo" en el
  formulario. Al llenarse, deja de aceptar nuevos externos, pero sigue
  aceptando registros no-externos si aún hay cupo total disponible.

### Qué significa "registrado"

- Los datos que se cargan por `/admin/importar` (por ejemplo, la
  transcripción del PDF de junio 2025) **no** quedan marcados como
  "registrado" automáticamente — son solo candidatos ya conocidos en el
  sistema, útiles para que la búsqueda por documento los encuentre.
- Una persona queda marcada como "registrado" recién cuando pasa por el
  formulario de preinscripción (`/preinscripcion`), sea para crearse por
  primera vez o para actualizar sus datos si ya existía.
- Desde el panel admin también se puede ver y forzar manualmente el estado
  "Registrado" y "Es externo" de cualquier persona (sección "Estado del
  registro" en el formulario de edición).
- **Exportar solo registrados**, en el panel admin, descarga únicamente las
  personas que efectivamente se registraron — útil para el reporte final,
  en vez de exportar también los candidatos importados que nunca se
  presentaron.

## Arquitectura

> **Nota:** el plan original era desplegar sobre Oracle Cloud + Oracle
> Database (ver `db/ddl/`, `db/init/`), pero la capacidad gratuita de
> instancias ARM (Ampere A1) de Oracle no estuvo disponible a tiempo. La
> app se migró a **Postgres** (`db/postgres/`) para desplegar gratis y sin
> depender de disponibilidad de nadie, en **Neon + Render**. El código de
> Oracle se dejó documentado por si se retoma esa ruta más adelante.

- **Backend:** Node.js + Express + EJS (sin frameworks de frontend, para
  mantenerlo simple de operar y desplegar).
- **Base de datos:** Postgres, vía el driver oficial `pg`. En producción,
  Neon (free tier, serverless, "scale-to-zero"). Ver `db/postgres/001_init.sql`.
- **Contenedores:** la app se empaqueta en Docker. Para desarrollo/pruebas
  locales, `docker-compose.yml` levanta un Postgres en contenedor para no
  depender de tener ya una base disponible.
- **Excel:** `exceljs`, tanto para exportar el listado como para leer los
  archivos de importación.

```
app/                    Aplicación Node.js
  src/
    server.js           Punto de entrada
    db.js                Pool de conexión a Oracle
    lib/                 Reglas de negocio (campos, beneficiarios, usuarios, excel)
    routes/               public.js (preinscripción), auth.js (login), admin.js
    views/                Plantillas EJS
    public/               CSS
  Dockerfile
db/
  ddl/01_tables.sql      DDL para producción (tablas beneficiarios y usuarios_admin)
  ddl/02_ajustes.sql     DDL para producción (cupo/externos/registrado, tabla configuracion)
  init/01_init.sql       Sólo para el contenedor local de Oracle Free (ejecuta 01 y 02 en orden)
data/
  transcripcion_junio_2025.xlsx   Datos de la planilla en PDF, transcritos para revisión
  build_transcripcion.py          Script que generó ese Excel (referencia)
docker-compose.yml
.env.example
```

## Cómo probarlo localmente (con Oracle Free en un contenedor)

Requiere Docker Desktop.

```bash
cp .env.example .env      # y cambia las claves si quieres
docker compose up --build
```

La primera vez, Oracle Free tarda unos minutos en inicializar la base de
datos y ejecutar `db/init/01_init.sql` (que crea las tablas). Cuando el
contenedor `db` quede "healthy", la app queda disponible en
<http://localhost:3000>.

Usuario administrador inicial (se crea automáticamente si la tabla
`usuarios_admin` está vacía):

- Usuario: el valor de `ADMIN_USER` en `.env` (por defecto `admin`)
- Contraseña: el valor de `ADMIN_PASSWORD` en `.env`

**Cambia esta contraseña por defecto antes de usar la aplicación con datos
reales.**

## Cómo desplegar contra un Oracle real (producción)

1. Pide al DBA que ejecute `db/ddl/01_tables.sql` y luego `db/ddl/02_ajustes.sql`
   (en ese orden) en el esquema/usuario que usará la aplicación (o
   ejecútalos tú mismo conectado como ese usuario).
2. Construye y publica la imagen de la app:
   ```bash
   docker build -t fimlm-app ./app
   ```
3. Ejecuta el contenedor apuntando a la base de datos real, por ejemplo:
   ```bash
   docker run -d -p 3000:3000 \
     -e DB_USER=fimlm \
     -e DB_PASSWORD=*** \
     -e DB_CONNECT_STRING=mi-servidor-oracle:1521/MIPDB \
     -e SESSION_SECRET=*** \
     -e ADMIN_USER=admin \
     -e ADMIN_PASSWORD=*** \
     fimlm-app
   ```
   `DB_CONNECT_STRING` acepta cualquier "easy connect string" de Oracle
   (`host:puerto/servicio`), incluida una base Oracle Autonomous o un RAC.
4. Si vas a correr más de una réplica del contenedor de la app, ten en
   cuenta que las sesiones de login (`express-session`) se guardan en
   memoria de cada instancia; con una sola réplica no hay problema. Para
   múltiples réplicas, habría que mover las sesiones a un almacén
   compartido (por ejemplo, una tabla en la misma base Oracle) antes de
   escalar horizontalmente.

## Variables de entorno de la app

| Variable            | Descripción                                              |
|---------------------|-----------------------------------------------------------|
| `DB_USER`           | Usuario de la base de datos Oracle                        |
| `DB_PASSWORD`       | Contraseña de ese usuario                                  |
| `DB_CONNECT_STRING` | `host:puerto/servicio` de Oracle                           |
| `SESSION_SECRET`    | Secreto para firmar la cookie de sesión                    |
| `ADMIN_USER`        | Usuario administrador que se crea la primera vez           |
| `ADMIN_PASSWORD`    | Contraseña del usuario administrador inicial                |
| `PORT`               | Puerto HTTP de la app (por defecto 3000)                    |

## Carga inicial de los datos del PDF (junio 2025)

El archivo `Planillas Jornada de apoyo junio 2025.pdf` es un escaneo
manuscrito de 11 páginas (~97 beneficiarios) de una jornada de "Entrega de
Mercados Básicos" en Tunja, Boyacá. Sus datos fueron transcritos con
asistencia de IA a `data/transcripcion_junio_2025.xlsx`.

**Este archivo es un borrador y debe ser revisado por una persona antes de
importarlo**: la letra manuscrita puede generar errores de lectura,
especialmente en números de documento y teléfono. La columna
"Revisar (IA)" señala las filas donde hubo mayor incertidumbre al leer el
original; conviene también revisar el resto comparando contra el PDF.

Una vez revisado y corregido:

1. Inicia sesión en el panel administrativo.
2. Ve a **Importar datos (Excel)** (`/admin/importar`).
3. Sube el archivo `.xlsx` revisado. Cada fila crea un beneficiario nuevo si
   el documento de identidad no existe, o actualiza sus datos si ya existe
   (mismo criterio que usa el formulario de preinscripción).

El campo "3. Fecha de diligenciamiento" quedó en blanco en el documento
original (no fue diligenciado por quienes llenaron la planilla), por lo que
también llegó vacío en la transcripción.

## Cómo funciona la búsqueda/actualización (preinscripción)

- El formulario de preinscripción primero pide el documento de identidad.
- Si existe un beneficiario con ese documento, se precargan todos sus datos
  para editarlos y guardarlos (`UPDATE`).
- Si no existe, el formulario queda vacío (con el documento ya escrito) para
  registrarlo por primera vez (`INSERT`).
- El documento de identidad es la clave única de cada beneficiario: no se
  pueden crear dos registros con el mismo documento.
