// Consulta RUI / Sisben (ventanillasocial.dnp.gov.co) para cada
// beneficiario ya registrado (registrado = 'S') y guarda el resultado en
// las columnas resultado_rui / resultado_sisben / consulta_dnp_en.
//
// Se corre a mano, apuntando DATABASE_URL a la base de datos (local o la
// de produccion en Neon) — no hace parte de la app desplegada. Usa un
// navegador real (Puppeteer) contra la pagina publica de Consulta RUI, tal
// como la usaria una persona: no llama ninguna API interna directamente.
//
// Uso:
//   cd scripts/consultar_dnp
//   npm install
//   DATABASE_URL="postgres://..." node index.js [--force] [--limite N] [--headful]
//
// --force     vuelve a consultar a todos, incluso a quienes ya tienen
//             resultado guardado (por defecto solo se consulta a quienes
//             todavia no tienen consulta_dnp_en).
// --limite N  procesa como maximo N personas (util para probar).
// --headful   abre una ventana de Chrome visible en vez de headless
//             (util para ver que esta pasando si algo falla).
//
// Se asume que todos los beneficiarios tienen "Cedula de ciudadania"
// (tipo de documento = 3 en el formulario del DNP); la planilla no guarda
// un tipo de documento distinto por persona.

const { Pool } = require('pg');
const puppeteer = require('puppeteer');

const URL_CONSULTA = 'https://ventanillasocial.dnp.gov.co/home/index/#servicios';
const TIPO_DOC_CEDULA = '3';
const DELAY_MIN_MS = 3000;
const DELAY_MAX_MS = 6000;

function parseArgs(argv) {
  const force = argv.includes('--force');
  const headful = argv.includes('--headful');
  const limiteIdx = argv.findIndex((a) => a === '--limite');
  const limite = limiteIdx >= 0 ? Number(argv[limiteIdx + 1]) : null;
  return { force, headful, limite };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayAleatorio() {
  const ms = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
  return sleep(ms);
}

async function fetchPendientes(pool, { force }) {
  const where = force
    ? `WHERE registrado = 'S'`
    : `WHERE registrado = 'S' AND consulta_dnp_en IS NULL`;
  const result = await pool.query(
    `SELECT documento_identidad, nombres_apellidos
       FROM beneficiarios
       ${where}
      ORDER BY nombres_apellidos`
  );
  return result.rows;
}

async function guardarResultado(pool, documento, { resultadoRui, resultadoSisben }) {
  await pool.query(
    `UPDATE beneficiarios
        SET resultado_rui = $1, resultado_sisben = $2, consulta_dnp_en = now()
      WHERE documento_identidad = $3`,
    [resultadoRui, resultadoSisben, documento]
  );
}

// Abre el popup "Consulta RUI", diligencia el documento y devuelve el
// resultado ya interpretado, leyendo el texto tal como lo vería una
// persona (no se depende de clases CSS, que la pagina no usa de forma
// estable en el panel de resultado).
async function consultarUno(page, documento) {
  await page.evaluate(() => {
    if (typeof AbrirModalRUI === 'function') AbrirModalRUI();
  });
  await page.waitForSelector('#ruiNumDoc', { visible: true, timeout: 15000 });

  // Limpia cualquier resultado/valor de una consulta anterior.
  await page.evaluate(() => {
    document.getElementById('ruiResultado').innerHTML = '';
    document.getElementById('ruiNumDoc').value = '';
  });
  await page.select('#ruiTipoDoc', TIPO_DOC_CEDULA);
  await page.type('#ruiNumDoc', documento, { delay: 20 });
  await page.click('#btnConsultarRUI');

  // El panel primero muestra "Consultando bases de datos..." mientras
  // espera la respuesta; hay que esperar a que ese texto sea reemplazado
  // por el resultado final (encontrado o no encontrado).
  await page.waitForFunction(
    () => {
      const el = document.getElementById('ruiResultado');
      const texto = el && el.innerText ? el.innerText.trim() : '';
      return texto.length > 0 && !/consultando/i.test(texto);
    },
    { timeout: 20000, polling: 300 }
  );

  const texto = await page.evaluate(() => document.getElementById('ruiResultado').innerText);
  const lineas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lineas.length === 0 || /no encontrado/i.test(lineas[0])) {
    return { encontrado: false };
  }

  const idxRui = lineas.findIndex((l) => /clasificaci[oó]n rui/i.test(l));
  const idxSisben = lineas.findIndex((l) => /grupo sisb[eé]n/i.test(l));

  const ruiCodigo = idxRui >= 0 ? lineas[idxRui + 1] || null : null;
  const ruiLabel = idxRui >= 0 ? lineas[idxRui + 2] || null : null;
  const sisbenCodigo = idxSisben >= 0 ? lineas[idxSisben + 1] || null : null;
  const sisbenLabel = idxSisben >= 0 ? lineas[idxSisben + 2] || null : null;

  return {
    encontrado: true,
    resultadoRui: ruiCodigo ? `${ruiCodigo}${ruiLabel ? ' - ' + ruiLabel : ''}` : null,
    resultadoSisben: sisbenCodigo ? `${sisbenCodigo}${sisbenLabel ? ' - ' + sisbenLabel : ''}` : null
  };
}

async function main() {
  const { force, headful, limite } = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    console.error('Falta la variable de entorno DATABASE_URL.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
  });

  let personas = await fetchPendientes(pool, { force });
  if (limite) personas = personas.slice(0, limite);

  if (personas.length === 0) {
    console.log('No hay beneficiarios pendientes de consultar (usa --force para volver a consultar a todos).');
    await pool.end();
    return;
  }

  console.log(`Se van a consultar ${personas.length} beneficiario(s) en ventanillasocial.dnp.gov.co ...`);

  const browser = await puppeteer.launch({ headless: !headful });
  let encontrados = 0;
  let noEncontrados = 0;
  let errores = 0;

  try {
    const page = await browser.newPage();
    await page.goto(URL_CONSULTA, { waitUntil: 'networkidle2', timeout: 60000 });

    for (let i = 0; i < personas.length; i++) {
      const { documento_identidad: documento, nombres_apellidos: nombre } = personas[i];
      const prefijo = `[${i + 1}/${personas.length}] ${documento} (${nombre})`;
      try {
        const resultado = await consultarUno(page, documento);
        if (resultado.encontrado) {
          await guardarResultado(pool, documento, resultado);
          encontrados += 1;
          console.log(`${prefijo}: RUI="${resultado.resultadoRui || '—'}" SISBEN="${resultado.resultadoSisben || '—'}"`);
        } else {
          await guardarResultado(pool, documento, { resultadoRui: 'No encontrado', resultadoSisben: 'No encontrado' });
          noEncontrados += 1;
          console.log(`${prefijo}: no encontrado en RUI.`);
        }
      } catch (err) {
        errores += 1;
        console.error(`${prefijo}: ERROR — ${err.message} (queda pendiente para reintentar despues)`);
      }

      if (i < personas.length - 1) await delayAleatorio();
    }
  } finally {
    await browser.close();
    await pool.end();
  }

  console.log('---');
  console.log(`Listo. Encontrados: ${encontrados} · No encontrados: ${noEncontrados} · Errores: ${errores}`);
  if (errores > 0) {
    console.log('Vuelve a correr el script (sin --force) para reintentar solo los que quedaron pendientes.');
  }
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
