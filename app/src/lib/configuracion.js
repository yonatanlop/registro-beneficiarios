const { withConnection } = require('../db');

async function getConfiguracion() {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT max_registros, pct_externos FROM configuracion WHERE id = 1`
    );
    const row = result.rows[0];
    return { maxRegistros: row.max_registros, pctExternos: row.pct_externos };
  });
}

async function updateConfiguracion({ maxRegistros, pctExternos }) {
  return withConnection(async (client) => {
    await client.query(
      `UPDATE configuracion
          SET max_registros = $1,
              pct_externos = $2,
              actualizado_en = now()
        WHERE id = 1`,
      [maxRegistros, pctExternos]
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
// (data.registrado / data.es_externo) no exceda el cupo configurado.
// `existing` es el registro previo (o null si es un beneficiario nuevo).
// Solo bloquea cuando la operacion consume un cupo NUEVO: pasar de
// registrado='N' a 'S', o de externo='N' a 'S' estando registrado.
// Editar datos de alguien que ya estaba registrado/externo nunca se bloquea.
async function checkCupo(existing, data) {
  const wasRegistered = existing ? existing.registrado === 'S' : false;
  const willBeRegistered = data.registrado === 'S';
  const wasExterno = existing ? existing.es_externo === 'S' : false;
  const willBeExterno = data.es_externo === 'S';

  const newlyRegistering = willBeRegistered && !wasRegistered;
  const newlyExterno = willBeRegistered && willBeExterno && !(wasRegistered && wasExterno);

  if (!newlyRegistering && !newlyExterno) return;

  const [config, stats] = await Promise.all([getConfiguracion(), getCupoStats()]);

  if (newlyRegistering && stats.registrados >= config.maxRegistros) {
    const err = new Error(
      `Se alcanzó el cupo máximo de ${config.maxRegistros} registros. Ya no se pueden crear nuevos registros, pero los registros existentes se pueden seguir editando.`
    );
    err.cupoExceeded = true;
    throw err;
  }

  if (newlyExterno) {
    const cupoExternos = Math.floor((config.maxRegistros * config.pctExternos) / 100);
    if (stats.externos >= cupoExternos) {
      const err = new Error(
        `Se alcanzó el cupo máximo de personas externas (${cupoExternos} de ${config.maxRegistros}, ${config.pctExternos}%).`
      );
      err.cupoExceeded = true;
      throw err;
    }
  }
}

module.exports = { getConfiguracion, updateConfiguracion, getCupoStats, checkCupo };
