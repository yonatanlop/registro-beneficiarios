require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { initPool, closePool } = require('./db');
const { seedAdminIfEmpty } = require('./lib/usuarios');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const caracterizacionRoutes = require('./routes/caracterizacion');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambia-este-secreto-en-produccion',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
      httpOnly: true
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', caracterizacionRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { message: err.message });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initPool();
  await seedAdminIfEmpty();
  app.listen(PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[server] Error iniciando la aplicacion', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
