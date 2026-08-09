const express = require('express');
const router = express.Router();

const { verifyLogin } = require('../lib/usuarios');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('login', { errorMessage: null, usuario: '' });
});

router.post('/login', async (req, res, next) => {
  try {
    const { usuario, password } = req.body;
    const user = await verifyLogin(usuario || '', password || '');
    if (!user) {
      return res.status(401).render('login', {
        errorMessage: 'Usuario o contraseña incorrectos.',
        usuario: usuario || ''
      });
    }
    req.session.user = { id: user.id, usuario: user.usuario, nombreCompleto: user.nombreCompleto };
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
