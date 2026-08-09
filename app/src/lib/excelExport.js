const ExcelJS = require('exceljs');
const { FIELDS } = require('./fields');
const { dateToInputValue } = require('./viewHelpers');

function cellValue(field, row) {
  const v = row[field.key];
  if (field.type === 'bool') return v === 'S' ? 'X' : '';
  if (field.type === 'date') return dateToInputValue(v);
  return v === null || v === undefined ? '' : v;
}

async function buildBeneficiariosWorkbook(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FIMLM';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Beneficiarios', {
    views: [{ state: 'frozen', ySplit: 2 }]
  });

  sheet.mergeCells(1, 1, 1, FIELDS.length + 1);
  const title = sheet.getCell(1, 1);
  title.value = 'PLANILLA DE REGISTRO DE BENEFICIARIOS - FIMLM';
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: 'center' };

  const headerRow = sheet.getRow(2);
  headerRow.getCell(1).value = 'N°';
  FIELDS.forEach((f, i) => {
    headerRow.getCell(i + 2).value = f.label;
  });
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
    cell.border = { bottom: { style: 'thin' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  sheet.getColumn(1).width = 6;
  FIELDS.forEach((f, i) => {
    sheet.getColumn(i + 2).width = f.type === 'bool' ? 10 : 22;
  });

  rows.forEach((row, idx) => {
    const r = sheet.getRow(idx + 3);
    r.getCell(1).value = idx + 1;
    FIELDS.forEach((f, i) => {
      r.getCell(i + 2).value = cellValue(f, row);
    });
  });

  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: FIELDS.length + 1 }
  };

  return wb;
}

module.exports = { buildBeneficiariosWorkbook };
