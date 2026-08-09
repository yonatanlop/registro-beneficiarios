const ExcelJS = require('exceljs');
const { FIELDS } = require('./fields');
const beneficiarios = require('./beneficiarios');

const LABEL_TO_KEY = new Map(FIELDS.map((f) => [f.label.trim().toLowerCase(), f.key]));
// Tambien acepta el nombre de la columna de BD directamente (documento_identidad, etc.)
const DBNAME_TO_KEY = new Map(FIELDS.map((f) => [f.key, f.key]));

function resolveKey(headerText) {
  if (!headerText) return null;
  const norm = String(headerText).trim().toLowerCase();
  return LABEL_TO_KEY.get(norm) || DBNAME_TO_KEY.get(norm) || null;
}

function cellToPlainValue(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'object' && v.text) return v.text; // rich text
  if (typeof v === 'object' && v.result !== undefined) return v.result; // formula
  return v;
}

function boolFromCell(raw) {
  const s = String(raw).trim().toUpperCase();
  return ['X', 'S', 'SI', 'SÍ', 'Y', 'YES', '1', 'TRUE'].includes(s);
}

// Lee un workbook (buffer) y devuelve { importados, creados, actualizados, errores }
// errores: [{ fila, mensaje }]
async function importWorkbookBuffer(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error('El archivo no tiene hojas.');

  // Busca la fila de encabezados: la primera fila con al menos 2 columnas reconocidas
  let headerRowNumber = null;
  let keyByColumn = null;
  for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const mapping = {};
    let matches = 0;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = resolveKey(cellToPlainValue(cell));
      if (key) {
        mapping[colNumber] = key;
        matches += 1;
      }
    });
    if (matches >= 2) {
      headerRowNumber = r;
      keyByColumn = mapping;
      break;
    }
  }

  if (!headerRowNumber) {
    throw new Error(
      'No se encontraron encabezados reconocibles. Usa el archivo exportado desde el panel admin como plantilla.'
    );
  }

  let importados = 0;
  let creados = 0;
  let actualizados = 0;
  const errores = [];

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw = {};
    let hasData = false;
    for (const [colNumber, key] of Object.entries(keyByColumn)) {
      const cell = row.getCell(Number(colNumber));
      const val = cellToPlainValue(cell);
      if (val !== '' && val !== null && val !== undefined) hasData = true;
      raw[key] = val;
    }
    if (!hasData) continue;

    try {
      const body = {};
      for (const f of FIELDS) {
        if (f.type === 'bool') {
          body[f.key] = boolFromCell(raw[f.key] || '') ? 'on' : '';
        } else {
          body[f.key] = raw[f.key] === undefined ? '' : String(raw[f.key]);
        }
      }

      const data = beneficiarios.normalizeInput(body);
      if (!data.documento_identidad || !data.nombres_apellidos) {
        errores.push({ fila: r, mensaje: 'Falta documento de identidad o nombres y apellidos.' });
        continue;
      }

      const { created } = await beneficiarios.upsert(data);
      importados += 1;
      if (created) creados += 1;
      else actualizados += 1;
    } catch (err) {
      errores.push({ fila: r, mensaje: err.message });
    }
  }

  return { importados, creados, actualizados, errores };
}

module.exports = { importWorkbookBuffer };
