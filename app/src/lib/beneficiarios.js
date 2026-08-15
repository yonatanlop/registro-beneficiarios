const { withConnection } = require('../db');
const { FIELDS } = require('./fields');

const ALL_KEYS = FIELDS.map((f) => f.key);

// Convierte lo que llega de un <form> (checkboxes 'on'/undefined, campos
// vacios) al shape que espera la base de datos ('S'/'N', null, numero...).
function normalizeInput(body) {
  const data = {};
  for (const f of FIELDS) {
    let val = body[f.key];
    if (f.type === 'bool') {
      data[f.key] = val ? 'S' : 'N';
    } else if (f.type === 'number') {
      data[f.key] = val === '' || val === undefined || val === null ? null : Number(val);
    } else if (f.type === 'date') {
      data[f.key] = val ? new Date(`${val}T00:00:00`) : null;
    } else {
      data[f.key] = val === '' || val === undefined ? null : String(val).trim();
    }
  }
  return data;
}

async function findByDocumento(documento) {
  if (!documento) return null;
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT id, ${ALL_KEYS.join(', ')}, registrado_en, origen_importado, creado_en, actualizado_en
         FROM beneficiarios
        WHERE documento_identidad = $1`,
      [documento.trim()]
    );
    return result.rows[0] || null;
  });
}

async function findById(id) {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT id, ${ALL_KEYS.join(', ')}, registrado_en, origen_importado, creado_en, actualizado_en
         FROM beneficiarios
        WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  });
}

// Crea el registro si el documento no existe; si existe, lo actualiza.
// Devuelve { row, created }.
//
// `data.registrado_en`, si viene presente (Date), se guarda como la fecha
// y hora exacta en la que la persona paso a estar "registrado" — se
// establece una sola vez desde las rutas (ver aplicarFechaRegistro), la
// primera vez que registrado pasa de 'N' a 'S'. Si no viene, no se toca
// esa columna (se conserva lo que ya hubiera en un UPDATE, o queda NULL
// en un INSERT nuevo).
//
// `data.origen_importado` ('S'/'N') solo se usa al CREAR un registro
// nuevo (marca si vino de una carga masiva por Excel o de alguien
// registrandose por su cuenta). En un UPDATE nunca se toca esa columna,
// aunque venga en `data` — el origen de un registro no cambia despues de
// creado.
async function upsert(data) {
  return withConnection(async (client) => {
    const existing = await client.query(
      `SELECT id FROM beneficiarios WHERE documento_identidad = $1`,
      [data.documento_identidad]
    );

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      const setParts = ALL_KEYS.map((k, i) => `${k} = $${i + 1}`);
      const values = ALL_KEYS.map((k) => data[k]);
      if (data.registrado_en) {
        setParts.push(`registrado_en = $${values.length + 1}`);
        values.push(data.registrado_en);
      }
      values.push(id);
      await client.query(
        `UPDATE beneficiarios SET ${setParts.join(', ')} WHERE id = $${values.length}`,
        values
      );
      const row = await findById(id);
      return { row, created: false };
    }

    const cols = [...ALL_KEYS, 'registrado_en', 'origen_importado'];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = [...ALL_KEYS.map((k) => data[k]), data.registrado_en || null, data.origen_importado || 'N'];
    const result = await client.query(
      `INSERT INTO beneficiarios (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    const id = result.rows[0].id;
    const row = await findById(id);
    return { row, created: true };
  });
}

const PAGE_SIZE = 20;

async function search({ q, page = 1 } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const offset = (p - 1) * PAGE_SIZE;

  return withConnection(async (client) => {
    let where = '';
    const binds = [];
    if (q && q.trim()) {
      where = `WHERE UPPER(nombres_apellidos) LIKE UPPER($1) OR documento_identidad LIKE $2`;
      binds.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    const countResult = await client.query(
      `SELECT COUNT(*) AS total FROM beneficiarios ${where}`,
      binds
    );
    const total = Number(countResult.rows[0].total);

    const limitIdx = binds.length + 1;
    const offsetIdx = binds.length + 2;
    const result = await client.query(
      `SELECT id, ${ALL_KEYS.join(', ')}, registrado_en
         FROM beneficiarios
         ${where}
        ORDER BY nombres_apellidos
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...binds, PAGE_SIZE, offset]
    );

    return {
      rows: result.rows,
      total,
      page: p,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    };
  });
}

async function listAll({ soloRegistrados = false } = {}) {
  return withConnection(async (client) => {
    const where = soloRegistrados ? `WHERE registrado = 'S'` : '';
    const result = await client.query(
      `SELECT id, ${ALL_KEYS.join(', ')}
         FROM beneficiarios
         ${where}
        ORDER BY municipio, nombres_apellidos`
    );
    return result.rows;
  });
}

// Solo las personas que vinieron de la carga masiva original (Excel/PDF),
// sin importar si ya se registraron o no. Se usa para el reporte
// "registrados vs. pendientes" del panel admin, que compara
// exclusivamente contra esa lista original — sin mezclar a alguien nuevo
// que se registro por su cuenta desde el formulario publico.
async function listOriginalesImportados() {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT id, ${ALL_KEYS.join(', ')}
         FROM beneficiarios
        WHERE origen_importado = 'S'
        ORDER BY municipio, nombres_apellidos`
    );
    return result.rows;
  });
}

// Elimina un beneficiario definitivamente. Devuelve el registro borrado
// (o null si no existia), para poder confirmar/mostrar a quien se borro.
async function deleteById(id) {
  return withConnection(async (client) => {
    const result = await client.query(
      `DELETE FROM beneficiarios WHERE id = $1 RETURNING id, nombres_apellidos, documento_identidad`,
      [id]
    );
    return result.rows[0] || null;
  });
}

module.exports = {
  ALL_KEYS,
  normalizeInput,
  findByDocumento,
  findById,
  upsert,
  search,
  listAll,
  listOriginalesImportados,
  deleteById,
  PAGE_SIZE
};
