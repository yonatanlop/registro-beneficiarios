const express = require('express');
const router = express.Router();

const beneficiarios = require('../lib/beneficiarios');

// Buscar por documento (formulario en blanco, o con resultado si viene
// ?documento=...). No requiere sesion: pensada para usarse en un punto de
// atencion, igual que /preinscripcion.
router.get('/caracterizacion', async (req, res, next) => {
  try {
    const documento = (req.query.documento || '').trim();
    let record = null;
    let notFound = false;

    if (documento) {
      record = await beneficiarios.findByDocumento(documento);
      if (!record) notFound = true;
    }

    res.render('caracterizacion', {
      documentoBuscado: documento,
      record,
      notFound,
      marcado: req.query.marcado === '1'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/caracterizacion/buscar', (req, res) => {
  const documento = (req.body.documento || '').trim();
  if (!documento) return res.redirect('/caracterizacion');
  res.redirect(`/caracterizacion?documento=${encodeURIComponent(documento)}`);
});

// Marca la asistencia a la caracterizacion para el documento indicado.
// Renderiza el resultado directamente (en vez de redirigir a /caracterizacion
// con el documento en la URL) para que la confirmacion no dependa de que el
// navegador conserve el query string en la redireccion.
router.post('/caracterizacion/registrar', async (req, res, next) => {
  try {
    const documento = (req.body.documento || '').trim();
    if (!documento) return res.redirect('/caracterizacion');

    const record = await beneficiarios.marcarCaracterizacion(documento);
    if (!record) return res.status(404).render('404');

    res.render('caracterizacion', {
      documentoBuscado: documento,
      record,
      notFound: false,
      marcado: true
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
