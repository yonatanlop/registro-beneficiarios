const bcrypt = require('bcryptjs');
const { withConnection } = require('../db');

async function findByUsuario(usuario) {
  return withConnection(async (client) => {
    const result = await client.query(
      `SELECT id, usuario, password_hash, nombre_completo, activo
         FROM usuarios_admin
        WHERE usuario = $1`,
      [usuario.trim()]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      usuario: row.usuario,
      passwordHash: row.password_hash,
      nombreCompleto: row.nombre_completo,
      activo: row.activo
    };
  });
}

async function verifyLogin(usuario, password) {
  const user = await findByUsuario(usuario);
  if (!user || user.activo !== 'S') return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

// Crea el usuario administrador inicial si la tabla esta vacia.
// Controlado por variables de entorno ADMIN_USER / ADMIN_PASSWORD.
async function seedAdminIfEmpty() {
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'CambiarEstaClave123';

  await withConnection(async (client) => {
    const result = await client.query(`SELECT COUNT(*) AS total FROM usuarios_admin`);
    const total = Number(result.rows[0].total);
    if (total > 0) return;

    const hash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO usuarios_admin (usuario, password_hash, nombre_completo, activo)
       VALUES ($1, $2, $3, 'S')`,
      [adminUser, hash, 'Administrador FIMLM']
    );
    console.log(`[usuarios] Usuario administrador inicial creado: ${adminUser}`);
    console.log('[usuarios] Cambia la clave por defecto lo antes posible.');
  });
}

module.exports = { findByUsuario, verifyLogin, seedAdminIfEmpty };
