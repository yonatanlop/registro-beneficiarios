const express = require('express');
const router = express.Router();

const beneficiarios = require('../lib/beneficiarios');
const { checkCupo, aplicarDatosJornada, checkHorarioPermitido, getConfiguracion } = require('../lib/configuracion');
const { FIELDS } = require('../lib/fields');
const { toFormValues, dateToInputValue } = require('../lib/viewHelpers');
const horarios = require('../lib/horarios');

// Arma los datos que necesita la vista para mostrar el banner de horario y
// dejar que el JS del navegador reevalue el estado del boton en vivo.
function estadoHorario(config) {
  const ventanaActiva = horarios.ventanaActivaAhora(config.horariosHabilitados);
  const proxima = ventanaActiva ? null : horarios.proximaVentana(config.horariosHabilitados);
  return {
    permitido: !!ventanaActiva,
    ventanaActiva,
    proxima,
    horariosHabilitados: config.horariosHabilitados,
    VENTANAS: horarios.VENTANAS,
    DIAS: horarios.DIAS
  };
}

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
    const config = await getConfiguracion();

    res.render('preinscripcion', {
      FIELDS,
      values,
      isUpdate: !!record,
      notFound,
      documentoBuscado: documento,
      saved: false,
      horario: estadoHorario(config)
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

    // Verificacion del lado del servidor: el boton se deshabilita en el
    // navegador fuera de horario, pero nunca hay que confiar solo en eso.
    try {
      await checkHorarioPermitido();
    } catch (horarioErr) {
      if (!horarioErr.horarioCerrado) throw horarioErr;
      const record = data.documento_identidad
        ? await beneficiarios.findByDocumento(data.documento_identidad)
        : null;
      const config = await getConfiguracion();
      return res.status(403).render('preinscripcion', {
        FIELDS,
        values: req.body,
        isUpdate: !!record,
        notFound: false,
        documentoBuscado: data.documento_identidad,
        saved: false,
        errorMessage: horarioErr.message,
        horario: estadoHorario(config)
      });
    }

    if (!data.documento_identidad || !data.nombres_apellidos) {
      const record = data.documento_identidad
        ? await beneficiarios.findByDocumento(data.documento_identidad)
        : null;
      const config = await getConfiguracion();
      return res.status(400).render('preinscripcion', {
        FIELDS,
        values: req.body,
        isUpdate: !!record,
        notFound: false,
        documentoBuscado: data.documento_identidad,
        saved: false,
        errorMessage: 'El documento de identidad y los nombres y apellidos son obligatorios.',
        horario: estadoHorario(config)
      });
    }
    await aplicarDatosJornada(data);

    const existing = await beneficiarios.findByDocumento(data.documento_identidad);
    // Marca la fecha/hora exacta del registro solo la primera vez que
    // pasa a estar registrado; si ya lo estaba, no se vuelve a tocar.
    if (!existing || existing.registrado !== 'S') {
      data.registrado_en = new Date();
    }

    try {
      await checkCupo(existing, data);
    } catch (cupoErr) {
      if (!cupoErr.cupoExceeded) throw cupoErr;
      const config = await getConfiguracion();
      return res.status(400).render('preinscripcion', {
        FIELDS,
        values: req.body,
        isUpdate: !!existing,
        notFound: false,
        documentoBuscado: data.documento_identidad,
        saved: false,
        errorMessage: cupoErr.message,
        horario: estadoHorario(config)
      });
    }

    const { row, created } = await beneficiarios.upsert(data);
    const config = await getConfiguracion();

    res.render('preinscripcion', {
      FIELDS,
      values: toFormValues(row, row.documento_identidad),
      isUpdate: true,
      notFound: false,
      documentoBuscado: row.documento_identidad,
      saved: true,
      created,
      horario: estadoHorario(config)
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
