const { FIELDS } = require('./fields');

function dateToInputValue(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Convierte un registro de la BD (o null) en el shape que esperan los
// inputs del formulario EJS: booleanos para checkboxes, fechas como
// 'YYYY-MM-DD', y el resto como texto (nunca null/undefined).
function toFormValues(record, documentoPrellenado) {
  const values = {};
  for (const f of FIELDS) {
    let v = record ? record[f.key] : undefined;
    if (f.type === 'bool') {
      values[f.key] = v === 'S';
    } else if (f.type === 'date') {
      values[f.key] = dateToInputValue(v);
    } else {
      values[f.key] = v === undefined || v === null ? '' : v;
    }
  }
  if (!record && documentoPrellenado) {
    values.documento_identidad = documentoPrellenado;
  }
  return values;
}

// Formatea una fecha/hora (timestamp) en horario de Bogota, para mostrar
// en tablas del panel admin. Devuelve '' si no hay valor.
function formatDateTime(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = { dateToInputValue, toFormValues, formatDateTime };
