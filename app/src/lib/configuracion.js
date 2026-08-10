const { withConnection } = require('../db');
const { CONFIG_ONLY_FIELDS } = require('./fields');

async function getConfiguracion() {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT max_registros, pct_externos, ${CONFIG_ONLY_FIELDS.join(', ')}
         FROM configuracion WHERE id = 1`
    );
    const row = result.rows[0];
    const config = { maxRegistros: row.max_registros, pctExternos: row.pct_externos };
    for (const key of CONFIG_ONLY_FIELDS) {
      config[key] = row[key];
    }
    return config;
  });
}

async function updateConfiguracion({ maxRegistros, pctExternos, jornada }) {
  return withConnection(async (client) => {
    const setJornada = CONFIG_ONLY_FIELDS.map((k, i) => `${k} = $${i + 3}`).join(', ');
    const jornadaValues = CONFIG_ONLY_FIELDS.map((k) => (jornada[k] === undefined || jornada[k] === '' ? '' : String(jornada[k]).trim()));
    await client.query(
      `UPDATE configuracion
          SET max_registros = $1,
              pct_externos = $2,
              ${setJornada},
              actualizado_en = now()
        WHERE id = 1`,
      [maxRegistros, pctExternos, ...jornadaValues]
    );
  });
}

// Cuenta cuantos beneficiarios estan "registrado" y cuantos de esos son
// "externo", para comparar contra el cupo configurado.
async function getCupoStats() {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN es_externo = 'S' THEN 1 ELSE 0 END) AS externos
         FROM beneficiarios
        WHERE registrado = 'S'`
    );
    const row = result.rows[0];
    return { registrados: Number(row.total) || 0, externos: Number(row.externos) || 0 };
  });
}

// Valida que crear/actualizar un beneficiario con el estado destino
// (data.registrado) no exceda el cupo total configurado. `existing` es el
// registro previo (o null si es un beneficiario nuevo). Solo bloquea
// cuando la operacion consume un cupo NUEVO: pasar de registrado='N' a
// 'S'. Editar datos de alguien que ya estaba registrado nunca se bloquea.
//
// NOTA: el cupo de externos (% del total) se desactivo por decision del
// negocio (de momento) — el checkbox "Es externo" se sigue guardando y
// mostrando, pero ya no bloquea nuevos registros al llenarse.
async function checkCupo(existing, data) {
  const wasRegistered = existing ? existing.registrado === 'S' : false;
  const willBeRegistered = data.registrado === 'S';
  const newlyRegistering = willBeRegistered && !wasRegistered;

  if (!newlyRegistering) return;

  const [config, stats] = await Promise.all([getConfiguracion(), getCupoStats()]);

  if (stats.registrados >= config.maxRegistros) {
    const err = new Error(
      `Se alcanzó el cupo máximo de ${config.maxRegistros} registros. Ya no se pueden crear nuevos registros, pero los registros existentes se pueden seguir editando.`
    );
    err.cupoExceeded = true;
    throw err;
  }
}

// Aplica los valores de la jornada configurada globalmente sobre `data`
// (sobreescribe departamento, municipio, lugar_direccion, etc.). Se usa al
// crear/actualizar desde el formulario de preinscripcion o la edicion en
// el panel admin; NO se usa en la importacion masiva desde Excel, que debe
// conservar los valores historicos del archivo importado.
async function aplicarDatosJornada(data) {
  const config = await getConfiguracion();
  for (const key of CONFIG_ONLY_FIELDS) {
    data[key] = config[key];
  }
  return data;
}

module.exports = {
  getConfiguracion,
  updateConfiguracion,
  getCupoStats,
  checkCupo,
  aplicarDatosJornada
};
