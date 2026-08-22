# Registro de Beneficiarios (Jornadas de Apoyo)

## En producción

- **App:** https://fimlm-preinscripcion.onrender.com/preinscripcion (Render, free tier;
  Render no permite cambiar el subdominio `.onrender.com` de un servicio ya
  creado, así que por ahora se queda con este nombre)
- **Base de datos:** Neon (Postgres, free tier)
- **Punto de entrada recomendado:** https://yonatanlop.github.io/registro-beneficiarios/
  — pantalla de espera que aguanta el "cold start" de Render (el free tier
  duerme el servicio tras 15 min sin visitas y tarda ~30-60s en despertar)
  y redirige sola a `/preinscripcion` en cuanto la app responde. Compártela
  a los usuarios en vez del link directo a Render.
- **Importar los datos del PDF a producción:**
  `./scripts/importar_datos.sh https://fimlm-preinscripcion.onrender.com`
  (pide usuario/clave admin de forma interactiva, sube
  `data/transcripcion_junio_2025.xlsx` vía el panel admin).

Mini aplicación web con 3 páginas:

1. **Preinscripción** (`/preinscripcion`, pública): busca a una persona por
   documento de identidad. Si ya existe, precarga sus datos para
   actualizarlos; si no existe, permite registrarla. Reproduce todas las
   columnas de la planilla de registro de beneficiarios en papel, excepto
   la firma/huella.
2. **Ingreso administrativo** (`/login`): acceso con usuario y contraseña.
3. **Panel administrativo** (`/admin`): listado y búsqueda de todos los
   beneficiarios registrados, edición, exportación a Excel (con el mismo
   formato de columnas de la planilla) e importación masiva desde Excel.

## Cupo de registros

Desde `/admin/configuracion` se define el **Máximo de registros** (por
defecto 150): una vez que esa cantidad de personas queda marcada como
"registrado", el formulario de preinscripción deja de aceptar **registros
nuevos** (crear a alguien, o marcar por primera vez como registrado a
alguien ya existente en la base). Los registros que ya estaban registrados
**se pueden seguir editando sin límite**.

El formulario sigue teniendo el checkbox "Es externo" y el panel admin
sigue contando cuántos hay, pero **el límite del 30% de externos se
desactivó por decisión del negocio (de momento)** — marcar externos ya no
bloquea nuevos registros, solo se sigue registrando el dato.

## Horarios en los que se permite registrar

Desde `/admin/configuracion` hay una grilla de 7 días × 5 franjas horarias
fijas (hora de Colombia, sin importar en qué zona horaria corra el
servidor):

- 08:30–09:30, 09:30–10:30, 11:30–12:45, 18:30–19:30, 19:30–20:30

Cada casilla habilita o deshabilita esa franja para ese día específico —
no tienen que ser las mismas franjas todos los días. Hay además una fila
**"Todo el día"** por día: al marcarla, ese día queda abierto las 24 horas
(sin los huecos que quedan entre franjas), sin importar qué otras franjas
estén marcadas para ese mismo día. El botón "Registrar"
del formulario público (`/preinscripcion`) solo queda habilitado mientras
la hora actual de Colombia caiga dentro de alguna franja habilitada para
el día de hoy; el resto del tiempo se ve deshabilitado, con un aviso de
cuál es la próxima franja disponible. Esto se revisa en el navegador cada
15 segundos (sin recargar la página) y **también se valida en el
servidor**, así que aunque alguien manipule el botón desde las
herramientas de desarrollador, el guardado se rechaza igual si está fuera
de horario.

Esta restricción solo aplica a **guardar** desde el formulario público
(crear o actualizar). Buscar/consultar siempre está disponible, y la
edición desde el panel admin nunca se bloquea por horario.

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
- **Exportar registrados vs. pendientes (2 hojas)**: un solo archivo de
  Excel, sin modificar ningún dato, con dos pestañas — "Registrados" (con
  la cantidad en el título) y "No registrados". **Se limita exclusivamente
  a las 97 personas de la carga masiva original** (`transcripcion_junio_2025.xlsx`);
  alguien que se registre desde el formulario público sin haber estado en
  esa lista original no aparece en este reporte (sigue existiendo
  normalmente en el resto del sistema, solo no cuenta aquí). Esto se
  controla con la columna `origen_importado`, que se fija una sola vez al
  crear cada registro y no cambia después.
- El panel admin (`/admin`) muestra la **fecha y hora exacta** (hora de
  Bogotá) en la que cada persona pasó a estar "registrado" por primera vez.
  Volver a editarla después no cambia esa fecha; queda en blanco ("—") para
  quienes todavía no se han registrado.

## Datos de la jornada (lugar, departamento, actividad, etc.)

Departamento, Municipio, Lugar y dirección, Actividad desarrollada, Línea
estratégica, Programa, Proyecto y Nombre de los beneficios entregados
**ya no se piden por persona** en ningún formulario — son una configuración
global, editable solo desde `/admin/configuracion`, que se aplica sola a
todo registro que se cree o actualice desde el formulario de preinscripción
o su edición en el panel admin.

- `Lugar y dirección` viene fijo por defecto en
  `Calle 1 Sur # 6 - 44 Salón Comunal Florida Parque`; el resto se dejan en
  blanco hasta que alguien del equipo los complete en esa pantalla.
- Cambiar estos valores en el panel admin **no** modifica retroactivamente
  a quienes ya estaban registrados; solo aplica a registros nuevos o a los
  que se vuelvan a guardar desde ese momento en adelante.
- La importación masiva desde Excel (`/admin/importar`) **no** se ve
  afectada por esta configuración: sigue tomando estos valores de las
  columnas del archivo, para no alterar datos históricos ya cargados (por
  ejemplo, la transcripción del PDF de junio 2025 conserva "Tunja",
  "Boyacá", etc. tal como estaban en el documento original).

## Arquitectura

- **Backend:** Node.js + Express + EJS (sin frameworks de frontend, para
  mantenerlo simple de operar y desplegar).
- **Base de datos:** Postgres, vía el driver oficial `pg`. En producción,
  Neon (free tier, serverless, "scale-to-zero"). Ver `db/postgres/001_init.sql`.
- **Contenedores:** la app se empaqueta en Docker. Para desarrollo/pruebas
  locales, `docker-compose.yml` levanta un Postgres en contenedor para no
  depender de tener ya una base disponible.
- **Excel:** `exceljs`, tanto para exportar el listado como para leer los
  archivos de importación.
- **Pantalla de espera:** página estática en `docs/`, publicada gratis con
  GitHub Pages (no se duerme nunca, a diferencia del free tier de Render).

> Nota histórica: el plan original era desplegar sobre Oracle Cloud +
> Oracle Database (`db/ddl/`, `db/init/`), pero la capacidad gratuita de
> instancias ARM de Oracle no estuvo disponible a tiempo. La app se migró
> a Postgres para desplegar gratis sin depender de disponibilidad de
> capacidad. El código de Oracle se dejó como referencia por si se retoma
> esa ruta más adelante.

```
app/                    Aplicación Node.js
  src/
    server.js           Punto de entrada
    db.js                Pool de conexión a Postgres
    lib/                 Reglas de negocio (campos, beneficiarios, usuarios, cupo, excel)
    routes/               public.js (preinscripción), auth.js (login), admin.js
    views/                Plantillas EJS
    public/               CSS
  Dockerfile
db/
  postgres/001_init.sql   DDL activo (Postgres / Neon)
  ddl/, init/             DDL de referencia para Oracle (no usado actualmente)
data/
  transcripcion_junio_2025.xlsx   Datos de la planilla en PDF, transcritos para revisión (no versionado, contiene datos personales)
  build_transcripcion.py          Script que generó ese Excel (referencia)
docs/
  index.html             Pantalla de espera (GitHub Pages)
scripts/
  importar_datos.sh      Sube el Excel transcrito a la app ya desplegada
docker-compose.yml
.env.example
```

## Cómo probarlo localmente

Requiere Docker Desktop.

```bash
cp .env.example .env      # y cambia las claves si quieres
docker compose up --build
```

La app queda disponible en <http://localhost:3000> en cuanto el contenedor
`db` (Postgres) quede "healthy" — no toma más de unos segundos.

Usuario administrador inicial (se crea automáticamente si la tabla
`usuarios_admin` está vacía):

- Usuario: el valor de `ADMIN_USER` en `.env` (por defecto `admin`)
- Contraseña: el valor de `ADMIN_PASSWORD` en `.env`

**Cambia esta contraseña por defecto antes de usar la aplicación con datos
reales.**

## Cómo desplegar (Neon + Render, gratis)

1. **Neon:** crea una cuenta en neon.tech, crea un proyecto, copia el
   "Connection string" (`postgres://...`), y ejecuta en su SQL Editor, en
   orden, `db/postgres/001_init.sql` y luego cualquier migración posterior
   que exista en esa carpeta (por ejemplo `002_ajustes_jornada.sql`).
2. **Render:** crea una cuenta en render.com, conecta este repositorio,
   crea un **Web Service** con:
   - Root Directory: `app`
   - Environment: Docker
   - Instance Type: Free
   - Variables de entorno: `DATABASE_URL` (el connection string de Neon),
     `SESSION_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`.
3. Render construye la imagen y publica una URL `https://xxx.onrender.com`.
4. Actualiza `DESTINO` en `docs/index.html` con esa URL y vuelve a publicar
   (commit + push) para que la pantalla de espera apunte al lugar correcto.

El free tier de Render duerme el servicio tras 15 min sin tráfico; el
primer request tras eso tarda ~30-60s (por eso existe la pantalla de espera
en `docs/`).

## Variables de entorno de la app

| Variable          | Descripción                                                        |
|--------------------|---------------------------------------------------------------------|
| `DATABASE_URL`     | Connection string de Postgres (`postgres://usuario:clave@host/bd`) |
| `PGSSL`             | `false` para desactivar SSL (solo en local); en producción se deja SSL activo |
| `SESSION_SECRET`   | Secreto para firmar la cookie de sesión                             |
| `ADMIN_USER`       | Usuario administrador que se crea la primera vez                    |
| `ADMIN_PASSWORD`   | Contraseña del usuario administrador inicial                        |
| `PORT`              | Puerto HTTP de la app (Render lo define solo; por defecto 3000 en local) |

## Carga inicial de los datos del PDF (junio 2025)

El PDF fuente es un escaneo manuscrito de 11 páginas (~97 beneficiarios) de
una jornada de "Entrega de Mercados Básicos" en Tunja, Boyacá. Sus datos
fueron transcritos con asistencia de IA a
`data/transcripcion_junio_2025.xlsx`. **Ese PDF y ese Excel contienen datos
personales reales (nombres, cédulas, teléfonos) y por eso no están en este
repositorio** (están excluidos vía `.gitignore`); viven solo en el equipo
donde se generaron.

**Este archivo es un borrador y debe ser revisado por una persona antes de
importarlo**: la letra manuscrita puede generar errores de lectura,
especialmente en números de documento y teléfono. La columna
"Revisar (IA)" señala las filas donde hubo mayor incertidumbre al leer el
original; conviene también revisar el resto comparando contra el PDF.

Una vez revisado y corregido, dos formas de cargarlo:

- **Desde el panel admin:** inicia sesión → **Importar datos (Excel)**
  (`/admin/importar`) → sube el archivo.
- **Desde la terminal:** `./scripts/importar_datos.sh https://tu-app.onrender.com`

Cada fila crea un beneficiario nuevo si el documento de identidad no
existe, o actualiza sus datos si ya existe (mismo criterio que usa el
formulario de preinscripción). La importación **no** marca a nadie como
"registrado" (ver sección de cupo más arriba).

El campo "Fecha de diligenciamiento" quedó en blanco en el documento
original, por lo que también llegó vacío en la transcripción.

## Cómo funciona la búsqueda/actualización (preinscripción)

- El formulario de preinscripción primero pide el documento de identidad.
- Si existe un beneficiario con ese documento, se precargan todos sus datos
  para editarlos y guardarlos (`UPDATE`), y queda marcado como "registrado".
- Si no existe, el formulario queda vacío (con el documento ya escrito) para
  registrarlo por primera vez (`INSERT`), también marcado como "registrado".
- El documento de identidad es la clave única de cada beneficiario: no se
  pueden crear dos registros con el mismo documento.

## Eliminar un registro por error

Desde el panel admin, tanto en el listado (`/admin`) como en la edición
individual de una persona, hay un botón **"Eliminar"** (rojo) que borra el
registro definitivamente, con un cuadro de confirmación que muestra el
nombre y documento antes de proceder. Es una acción irreversible: no hay
"papelera" ni forma de deshacerla después. El cupo de registros y las
estadísticas del panel se actualizan solos al eliminar.

## Caracterización

`/caracterizacion` es una página pública (sin iniciar sesión), pensada para
un punto de atención aparte: se busca a la persona solo por documento de
identidad y, si existe, se muestra su nombre completo y documento con un
botón **"Registrar asistencia a la caracterización"**. Es una acción de una
sola vía — una vez registrada no hay botón para desmarcarla — y es
independiente de "registrado" (el flujo de /preinscripcion): no depende de
que la persona ya se haya preinscrito.

El resultado se guarda en `beneficiarios.caracterizacion` ('S'/'N'), visible
en el panel admin y en el export a Excel como **Sí/No**, y — igual que
`resultado_rui`/`resultado_sisben` — es una columna que no participa en
ningún formulario, así que guardar o editar un beneficiario nunca la borra.

## Consulta RUI / Sisbén (verificación de vulnerabilidad)

El panel admin (tabla y export a Excel) muestra dos columnas de solo
lectura, **RUI** y **Sisbén**, con el resultado de consultar a cada
beneficiario ya registrado contra la Consulta RUI pública de
`ventanillasocial.dnp.gov.co`. Esto permite verificar el nivel de
vulnerabilidad de cada persona antes de entregar las ayudas.

Esa consulta **no la hace la app** (no corre en Render): se ejecuta con un
script aparte, [`scripts/consultar_dnp`](scripts/consultar_dnp/README.md),
que se corre a mano apuntando a la base de datos. El resultado se guarda en
`beneficiarios.resultado_rui` / `resultado_sisben` / `consulta_dnp_en`, que
son columnas independientes de las que se editan desde los formularios: al
guardar o editar un beneficiario (formulario público o panel admin) nunca
se borra el resultado ya guardado.
