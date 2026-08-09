// Definicion unica de los campos de "beneficiarios".
// Se usa para generar el formulario, las consultas SQL y el export a Excel,
// de modo que agregar/quitar un campo se haga en un solo lugar.

const FIELDS = [
  // --- Datos de la jornada / evento (columnas 3-12 de la planilla) ---
  // fecha_diligenciamiento se sigue diligenciando por persona/registro.
  // El resto (departamento...beneficios_entregados) son configOnly: se
  // definen una sola vez desde /admin/configuracion y se aplican solos a
  // cada registro; no aparecen como campos editables en ningun formulario
  // por-persona (ni publico ni de edicion en el panel admin).
  { key: 'fecha_diligenciamiento', label: 'Fecha de diligenciamiento', type: 'date', group: 'jornada' },
  { key: 'departamento', label: 'Departamento', type: 'text', group: 'jornada', configOnly: true },
  { key: 'municipio', label: 'Municipio', type: 'text', group: 'jornada', configOnly: true },
  { key: 'lugar_direccion', label: 'Lugar y dirección', type: 'text', group: 'jornada', configOnly: true },
  { key: 'actividad_desarrollada', label: 'Actividad desarrollada', type: 'text', group: 'jornada', configOnly: true },
  { key: 'linea_estrategica', label: 'Línea estratégica', type: 'text', group: 'jornada', configOnly: true },
  { key: 'programa', label: 'Programa', type: 'text', group: 'jornada', configOnly: true },
  { key: 'proyecto', label: 'Proyecto', type: 'text', group: 'jornada', configOnly: true },
  { key: 'beneficios_entregados', label: 'Nombre de los beneficios entregados', type: 'text', group: 'jornada', configOnly: true },
  { key: 'poblacion_familias', label: 'Familias', type: 'bool', group: 'poblacion' },
  { key: 'poblacion_adulto_mayor', label: 'Adulto mayor', type: 'bool', group: 'poblacion' },
  { key: 'poblacion_ninez', label: 'Niñez', type: 'bool', group: 'poblacion' },
  { key: 'poblacion_etnias', label: 'Etnias', type: 'bool', group: 'poblacion' },

  // --- Datos del beneficiario (columnas 14-21 de la planilla) ---
  { key: 'nombres_apellidos', label: 'Nombres y apellidos completos', type: 'text', group: 'persona', required: true },
  { key: 'documento_identidad', label: 'Documento de identidad', type: 'text', group: 'persona', required: true },
  { key: 'sexo', label: 'Sexo', type: 'select', options: ['F', 'M'], group: 'persona' },
  { key: 'edad', label: 'Edad', type: 'number', group: 'persona' },
  { key: 'disc_auditiva', label: 'Auditiva', type: 'bool', group: 'discapacidad' },
  { key: 'disc_visual', label: 'Visual', type: 'bool', group: 'discapacidad' },
  { key: 'disc_cognitiva', label: 'Cognitiva', type: 'bool', group: 'discapacidad' },
  { key: 'disc_mental', label: 'Mental', type: 'bool', group: 'discapacidad' },
  { key: 'disc_fisica', label: 'Física', type: 'bool', group: 'discapacidad' },
  { key: 'direccion_residencia', label: 'Dirección de residencia', type: 'text', group: 'persona' },
  { key: 'zona_barrio', label: 'Zona o barrio', type: 'text', group: 'persona' },
  { key: 'telefono', label: 'Teléfono', type: 'text', group: 'persona' },
  { key: 'representado', label: 'Representado', type: 'bool', group: 'persona' },
  { key: 'es_externo', label: 'Es externo', type: 'bool', group: 'persona' },

  // --- Campos de sistema (solo panel admin; no se muestran ni se editan
  // desde el formulario publico de preinscripcion) ---
  { key: 'registrado', label: 'Registrado', type: 'bool', group: 'sistema', adminOnly: true }
];

const BOOL_FIELDS = FIELDS.filter((f) => f.type === 'bool').map((f) => f.key);
const DATE_FIELDS = FIELDS.filter((f) => f.type === 'date').map((f) => f.key);
const CONFIG_ONLY_FIELDS = FIELDS.filter((f) => f.configOnly).map((f) => f.key);

module.exports = { FIELDS, BOOL_FIELDS, DATE_FIELDS, CONFIG_ONLY_FIELDS };
