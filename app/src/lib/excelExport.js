const ExcelJS = require('exceljs');
const { FIELDS } = require('./fields');
const { dateToInputValue, formatDateTime } = require('./viewHelpers');

// Resultado de la consulta RUI/Sisben (ver scripts/consultar_dnp): no son
// FIELDS porque no se diligencian desde ningun formulario, se agregan aqui
// como columnas extra al final del export.
const EXTRA_EXPORT_FIELDS = [
  { key: 'caracterizacion', label: 'Caracterización', type: 'boolSiNo' },
  { key: 'resultado_rui', label: 'Resultado RUI', type: 'text' },
  { key: 'resultado_sisben', label: 'Resultado Sisbén', type: 'text' },
  { key: 'consulta_dnp_en', label: 'Fecha consulta RUI/Sisbén', type: 'datetime' }
];
const EXPORT_COLUMNS = [...FIELDS, ...EXTRA_EXPORT_FIELDS];

function cellValue(field, row) {
  const v = row[field.key];
  if (field.type === 'bool') return v === 'S' ? 'X' : '';
  if (field.type === 'boolSiNo') return v === 'S' ? 'Sí' : 'No';
  if (field.type === 'date') return dateToInputValue(v);
  if (field.type === 'datetime') return v ? formatDateTime(v) : '';
  return v === null || v === undefined ? '' : v;
}

function addBeneficiariosSheet(wb, nombreHoja, titulo, rows) {
  const sheet = wb.addWorksheet(nombreHoja, {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  sheet.mergeCells(1, 1, 1, EXPORT_COLUMNS.length + 1);
  const title = sheet.getCell(1, 1);
  title.value = titulo;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: 'center' };

  const headerRow = sheet.getRow(2);
  headerRow.getCell(1).value = 'N°';
  EXPORT_COLUMNS.forEach((f, i) => {
    headerRow.getCell(i + 2).value = f.label;
  });
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    cell.border = { bottom: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.getColumn(1).width = 6;
  EXPORT_COLUMNS.forEach((f, i) => {
    sheet.getColumn(i + 2).width = f.type === 'bool' || f.type === 'boolSiNo' ? 10 : 22;
  });

  rows.forEach((row, idx) => {
    const r = sheet.getRow(idx + 3);
    r.getCell(1).value = idx + 1;
    EXPORT_COLUMNS.forEach((f, i) => {
      r.getCell(i + 2).value = cellValue(f, row);
    });
  });

  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: EXPORT_COLUMNS.length + 1 }
  };

  return sheet;
}

async function buildBeneficiariosWorkbook(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Registro de Beneficiarios';
  wb.created = new Date();
  addBeneficiariosSheet(wb, 'Beneficiarios', 'PLANILLA DE REGISTRO DE BENEFICIARIOS', rows);
  return wb;
}

// Un solo archivo, de solo lectura (no modifica ningun dato), con dos
// hojas: quienes ya se registraron (registrado = 'S') y quienes todavia
// no (candidatos importados que aun no han pasado por el formulario).
async function buildBeneficiariosWorkbookSeparado(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Registro de Beneficiarios';
  wb.created = new Date();

  const registrados = rows.filter((r) => r.registrado === 'S');
  const noRegistrados = rows.filter((r) => r.registrado !== 'S');

  addBeneficiariosSheet(
    wb,
    'Registrados',
    `DE LA LISTA ORIGINAL: YA SE REGISTRARON (${registrados.length})`,
    registrados
  );
  addBeneficiariosSheet(
    wb,
    'No registrados',
    `DE LA LISTA ORIGINAL: AÚN NO SE HAN REGISTRADO (${noRegistrados.length})`,
    noRegistrados
  );

  return wb;
}

module.exports = { buildBeneficiariosWorkbook, buildBeneficiariosWorkbookSeparado };
