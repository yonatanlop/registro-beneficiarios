const express = require('express');
const router = express.Router();

const beneficiarios = require('../lib/beneficiarios');
const { checkCupo, aplicarDatosJornada } = require('../lib/configuracion');
const { FIELDS } = require('../lib/fields');
const { toFormValues, dateToInputValue } = require('../lib/viewHelpers');

router.get('/', (req, res) => res.redirect('/preinscripcion'));

// Formulario en blanco, o precargado si viene ?documento=... (tras una busqueda)
router.get('/preinscripcion', async (req, res, next) => {
  try {
    const documento = (req.query.documento || '').trim();
    let record = null;
    let notFound = false;

    if (documento) {
      record = await beneficiarios.findByDocumento(documento);
      if (!record) notFound = true;
    }

    const values = toFormValues(record, documento);
    await aplicarDatosJornada(values);

    res.render('preinscripcion', {
      FIELDS,
      values,
      isUpdate: !!record,
      notFound,
      documentoBuscado: documento,
      saved: false
    });
  } catch (err) {
    next(err);
  }
});

// Buscar por documento y redirigir al formulario precargado (o vacio si no existe)
router.post('/preinscripcion/buscar', (req, res) => {
  const documento = (req.body.documento || '').trim();
  if (!documento) return res.redirect('/preinscripcion');
  res.redirect(`/preinscripcion?documento=${encodeURIComponent(documento)}`);
});

// Crear o actualizar (upsert por documento_identidad)
router.post('/preinscripcion', async (req, res, next) => {
  try {
    const data = beneficiarios.normalizeInput(req.body);
    // Pasar por este formulario (crear o actualizar) siempre marca a la
    // persona como registrada; los datos importados del PDF no lo estan
    // hasta que la persona se registre por aqui.
    data.registrado = 'S';

    if (!data.documento_identidad || !data.nombres_apellidos) {
      const record = data.documento_identidad
        ? await beneficiarios.findByDocumento(data.documento_identidad)
        : null;
      return res.status(400).render('preinscripcion', {
        FIELDS,
        values: req.body,
        isUpdate: !!record,
        notFound: false,
        documentoBuscado: data.documento_identidad,
        saved: false,
        errorMessage: 'El documento de identidad y los nombres y apellidos son obligatorios.'
      });
    }
    await aplicarDatosJornada(data);

    const existing = await beneficiarios.findByDocumento(data.documento_identidad);

    try {
      await checkCupo(existing, data);
    } catch (cupoErr) {
      if (!cupoErr.cupoExceeded) throw cupoErr;
      return res.status(400).render('preinscripcion', {
        FIELDS,
        values: req.body,
        isUpdate: !!existing,
        notFound: false,
        documentoBuscado: data.documento_identidad,
        saved: false,
        errorMessage: cupoErr.message
      });
    }

    const { row, created } = await beneficiarios.upsert(data);

    res.render('preinscripcion', {
      FIELDS,
      values: toFormValues(row, row.documento_identidad),
      isUpdate: true,
      notFound: false,
      documentoBuscado: row.documento_identidad,
      saved: true,
      created
    });
  } catch (err) {
    if (err && err.errorNum === 1) {
      // ORA-00001: unique constraint violated (carrera entre buscar y guardar)
      return res.redirect(`/preinscripcion?documento=${encodeURIComponent(req.body.documento_identidad || '')}`);
    }
    next(err);
  }
});

module.exports = router;
