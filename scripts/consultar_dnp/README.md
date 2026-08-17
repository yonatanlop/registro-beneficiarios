# Consulta RUI / Sisbén (DNP)

Script para consultar, uno por uno, a cada beneficiario ya registrado en la
plataforma (`registrado = 'S'`) contra la **Consulta RUI** pública de
`ventanillasocial.dnp.gov.co`, y guardar el resultado (clasificación RUI y
grupo Sisbén IV) en la base de datos. Esto permite verificar el nivel de
vulnerabilidad antes de entregar las ayudas.

No hace parte de la app desplegada (no corre en Render): se ejecuta a mano,
una vez o cada tanto, apuntando a la base de datos que quieras (local o la
de producción en Neon).

## Cómo correrlo

```bash
cd scripts/consultar_dnp
npm install
DATABASE_URL="postgres://usuario:clave@host/basededatos" node index.js
```

En Windows (PowerShell):

```powershell
cd scripts/consultar_dnp
npm install
$env:DATABASE_URL = "postgres://usuario:clave@host/basededatos"
node index.js
```

La cadena de conexión de producción (Neon) la encuentras en el dashboard de
Neon → tu proyecto → "Connection string".

## Opciones

- `--force` — vuelve a consultar a **todos** los registrados, incluso a
  quienes ya tienen un resultado guardado. Sin esta opción, el script solo
  consulta a quienes todavía no tienen resultado (así se puede correr varias
  veces sin repetir trabajo, por ejemplo para ir completando a los que se
  vayan registrando).
- `--limite N` — procesa como máximo N personas. Útil para probar antes de
  correrlo contra todos.
- `--headful` — abre una ventana de Chrome visible en vez de headless, para
  ver en vivo qué está pasando si algo falla.

## Qué hace

Por cada beneficiario:

1. Abre el popup "Consulta RUI" en la página del DNP (igual que lo haría una
   persona).
2. Selecciona "Cédula de ciudadanía" y escribe el número de documento.
3. Hace clic en "Consultar" y lee el resultado (clasificación RUI y, si
   aplica, grupo Sisbén IV) o "Documento no encontrado".
4. Guarda el resultado en `beneficiarios.resultado_rui`,
   `resultado_sisben` y la fecha/hora de la consulta en
   `consulta_dnp_en` — sin tocar ninguna otra columna del beneficiario.
5. Espera unos segundos (aleatorio, 3–6s) antes de seguir con el siguiente,
   para no saturar el servidor del DNP.

Si una consulta falla (error de red, tiempo agotado, etc.) queda pendiente
y el script la vuelve a intentar la próxima vez que lo corras (sin
`--force`).

## Supuestos

- Se asume que todos los beneficiarios tienen **cédula de ciudadanía** (la
  planilla no registra un tipo de documento distinto por persona). Si
  alguno tiene tarjeta de identidad, registro civil, etc., su consulta
  quedará como "no encontrado" y debe verificarse manualmente en el sitio
  del DNP.
- Por defecto solo se consulta a quienes ya están marcados como
  **registrados** (`registrado = 'S'`), no a los candidatos importados que
  aún no se han registrado.

## Requisitos

- Node.js 18+.
- Esta consulta usa datos personales (documento de identidad) de los
  beneficiarios contra un sistema del Estado; solo debe correrse cuando esa
  consulta esté autorizada por las personas registradas.
