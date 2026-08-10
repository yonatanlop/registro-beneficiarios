const express = require('express');
const multer = require('multer');
const router = express.Router();

const beneficiarios = require('../lib/beneficiarios');
const { FIELDS, CONFIG_ONLY_FIELDS } = require('../lib/fields');
const { toFormValues, formatDateTime } = require('../lib/viewHelpers');
const { buildBeneficiariosWorkbook } = require('../lib/excelExport');
const { importWorkbookBuffer } = require('../lib/excelImport');
const {
  getConfiguracion,
  updateConfiguracion,
  getCupoStats,
  checkCupo,
  aplicarDatosJornada
} = require('../lib/configuracion');
const horarios = require('../lib/horarios');

const CONFIG_ONLY_FIELDS_INFO = FIELDS.filter((f) => f.configOnly).map((f) => ({ key: f.key, label: f.label }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [result, config, cupo] = await Promise.all([
      beneficiarios.search({ q: req.query.q, page: req.query.page }),
      getConfiguracion(),
      getCupoStats()
    ]);
    res.render('admin', { ...result, q: req.query.q || '', config, cupo, formatDateTime });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const soloRegistrados = req.query.solo_registrados === '1';
    const rows = await beneficiarios.listAll({ soloRegistrados });
    const wb = await buildBeneficiariosWorkbook(rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const filename = soloRegistrados ? 'beneficiarios_registrados.xlsx' : 'beneficiarios_todos.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

router.get('/configuracion', async (req, res, next) => {
  try {
    const [config, cupo] = await Promise.all([getConfiguracion(), getCupoStats()]);
    res.render('admin_configuracion', {
      config,
      cupo,
      CONFIG_ONLY_FIELDS_INFO,
      DIAS: horarios.DIAS,
      VENTANAS: horarios.VENTANAS,
      ventanaLabel: horarios.ventanaLabel,
      saved: false,
      errorMessage: null
    });
  } catch (err) {
    next(err);
  }
});

// Reconstruye el objeto { dia: { ventanaId: bool } } a partir de los
// checkboxes marcados que llegaron en el body (name="horario[dia][id]").
// Los checkboxes sin marcar simplemente no llegan en el body.
function parseHorariosBody(body) {
  const marcados = body.horario || {};
  const out = {};
  for (const dia of horarios.DIAS) {
    out[dia.key] = {};
    for (const v of horarios.VENTANAS) {
      out[dia.key][v.id] = !!(marcados[dia.key] && marcados[dia.key][v.id]);
    }
  }
  return out;
}

router.post('/configuracion', async (req, res, next) => {
  try {
    const maxRegistros = Number(req.body.max_registros);
    // El % de externos ya no se pide en este formulario (validacion
    // desactivada de momento); se conserva el valor que ya estaba guardado.
    const actual = await getConfiguracion();
    const pctExternos = actual.pctExternos;
    const jornada = {};
    for (const key of CONFIG_ONLY_FIELDS) {
      jornada[key] = req.body[key] || '';
    }
    const horariosHabilitados = parseHorariosBody(req.body);

    if (!Number.isFinite(maxRegistros) || maxRegistros <= 0) {
      const cupo = await getCupoStats();
      return res.status(400).render('admin_configuracion', {
        config: { maxRegistros, pctExternos, horariosHabilitados, ...jornada },
        cupo,
        CONFIG_ONLY_FIELDS_INFO,
        DIAS: horarios.DIAS,
        VENTANAS: horarios.VENTANAS,
        ventanaLabel: horarios.ventanaLabel,
        saved: false,
        errorMessage: 'El máximo de registros debe ser mayor a 0.'
      });
    }

    await updateConfiguracion({ maxRegistros, pctExternos, jornada, horariosHabilitados });
    const [config, cupo] = await Promise.all([getConfiguracion(), getCupoStats()]);
    res.render('admin_configuracion', {
      config,
      cupo,
      CONFIG_ONLY_FIELDS_INFO,
      DIAS: horarios.DIAS,
      VENTANAS: horarios.VENTANAS,
      ventanaLabel: horarios.ventanaLabel,
      saved: true,
      errorMessage: null
    });
  } catch (err) {
    next(err);
  }
});

router.get('/beneficiarios/:id/editar', async (req, res, next) => {
  try {
    const record = await beneficiarios.findById(req.params.id);
    if (!record) return res.status(404).render('404');
    const values = toFormValues(record);
    await aplicarDatosJornada(values);
    res.render('admin_editar', {
      FIELDS,
      values,
      id: record.id,
      saved: false
    });
  } catch (err) {
    next(err);
  }
});

router.post('/beneficiarios/:id', async (req, res, next) => {
  try {
    const record = await beneficiarios.findById(req.params.id);
    if (!record) return res.status(404).render('404');

    const data = beneficiarios.normalizeInput(req.body);
    if (!data.documento_identidad || !data.nombres_apellidos) {
      return res.status(400).render('admin_editar', {
        FIELDS,
        values: req.body,
        id: record.id,
        saved: false,
        errorMessage: 'El documento de identidad y los nombres y apellidos son obligatorios.'
      });
    }
    await aplicarDatosJornada(data);
    // Marca la fecha/hora exacta del registro solo la primera vez que
    // pasa a estar registrado; si ya lo estaba, no se vuelve a tocar.
    if (record.registrado !== 'S' && data.registrado === 'S') {
      data.registrado_en = new Date();
    }

    try {
      await checkCupo(record, data);
    } catch (cupoErr) {
      if (!cupoErr.cupoExceeded) throw cupoErr;
      return res.status(400).render('admin_editar', {
        FIELDS,
        values: req.body,
        id: record.id,
        saved: false,
        errorMessage: cupoErr.message
      });
    }

    const { row } = await beneficiarios.upsert(data);
    res.render('admin_editar', {
      FIELDS,
      values: toFormValues(row),
      id: row.id,
      saved: true
    });
  } catch (err) {
    next(err);
  }
});

router.get('/importar', (req, res) => {
  res.render('admin_importar', { resultado: null, errorMessage: null });
});

router.post('/importar', upload.single('archivo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).render('admin_importar', {
        resultado: null,
        errorMessage: 'Selecciona un archivo Excel (.xlsx) para importar.'
      });
    }
    const resultado = await importWorkbookBuffer(req.file.buffer);
    res.render('admin_importar', { resultado, errorMessage: null });
  } catch (err) {
    res.status(400).render('admin_importar', { resultado: null, errorMessage: err.message });
  }
});

module.exports = router;
