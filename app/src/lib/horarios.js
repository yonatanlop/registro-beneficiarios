// Catalogo fijo de franjas horarias en las que se permite guardar
// (crear/actualizar) una preinscripcion. Los horarios son de Colombia
// (America/Bogota, UTC-05:00 todo el año, sin horario de verano).
const VENTANAS = [
  { id: 'v1', inicio: '08:30', fin: '09:30' },
  { id: 'v2', inicio: '09:30', fin: '10:30' },
  { id: 'v3', inicio: '11:30', fin: '12:45' },
  { id: 'v4', inicio: '18:30', fin: '19:30' },
  { id: 'v5', inicio: '19:30', fin: '20:30' }
];

// No es una franja mas del catalogo (no aparece en VENTANAS ni se puede
// deshabilitar individualmente): es un interruptor aparte por dia,
// "todoElDia", que cuando esta activo deja el registro abierto las 24
// horas de ese dia sin importar las franjas de arriba (cubre los huecos
// entre franjas). Se guarda como una clave mas dentro de cada dia en
// horarios_habilitados, junto a v1..v5.
const TODO_EL_DIA = { id: 'todoElDia', inicio: '00:00', fin: '23:59' };

const DIAS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
];

const DIA_EN_A_KEY = {
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miercoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sabado',
  Sunday: 'domingo'
};

const ORDEN_DIAS = DIAS.map((d) => d.key);

function ventanaLabel(v) {
  return `${v.inicio} - ${v.fin}`;
}

function diaLabel(key) {
  const d = DIAS.find((x) => x.key === key);
  return d ? d.label : key;
}

// Todas las franjas habilitadas, los 7 dias (estado inicial por defecto).
function defaultHorariosHabilitados() {
  const out = {};
  for (const dia of ORDEN_DIAS) {
    out[dia] = { todoElDia: false };
    for (const v of VENTANAS) out[dia][v.id] = true;
  }
  return out;
}

function parseHora(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Dia (clave en español) y minutos-desde-medianoche actuales, en hora de
// Bogota, sin depender de la zona horaria del servidor.
function nowBogota(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const minute = Number(map.minute);
  return { dia: DIA_EN_A_KEY[map.weekday], minutos: hour * 60 + minute };
}

// Devuelve la ventana activa ahora mismo (o null si el registro esta
// cerrado), segun las franjas habilitadas por dia.
function ventanaActivaAhora(horariosHabilitados, date = new Date()) {
  const { dia, minutos } = nowBogota(date);
  const habilitadasHoy = (horariosHabilitados && horariosHabilitados[dia]) || {};
  if (habilitadasHoy.todoElDia) return TODO_EL_DIA;
  for (const v of VENTANAS) {
    if (!habilitadasHoy[v.id]) continue;
    if (minutos >= parseHora(v.inicio) && minutos < parseHora(v.fin)) {
      return v;
    }
  }
  return null;
}

function estaPermitidoAhora(horariosHabilitados, date = new Date()) {
  return ventanaActivaAhora(horariosHabilitados, date) !== null;
}

// Busca la proxima franja habilitada (hoy mas tarde, o en los proximos
// dias). Devuelve { dia, ventana } o null si no hay ninguna habilitada
// en los proximos 7 dias.
function proximaVentana(horariosHabilitados, date = new Date()) {
  const { dia, minutos } = nowBogota(date);
  const idxHoy = ORDEN_DIAS.indexOf(dia);

  for (let offset = 0; offset <= 7; offset++) {
    const idx = (idxHoy + offset) % 7;
    const diaKey = ORDEN_DIAS[idx];
    const habilitadasEseDia = (horariosHabilitados && horariosHabilitados[diaKey]) || {};
    if (habilitadasEseDia.todoElDia) {
      // "Todo el dia" cubre desde las 00:00, asi que salvo que ya estemos
      // dentro de ese mismo dia (en cuyo caso ya estaria activo y no
      // llegariamos aqui), siempre es la proxima franja disponible.
      if (offset === 0) continue;
      return { dia: diaKey, ventana: TODO_EL_DIA, esHoy: false };
    }
    for (const v of VENTANAS) {
      if (!habilitadasEseDia[v.id]) continue;
      const inicio = parseHora(v.inicio);
      if (offset === 0 && inicio <= minutos) continue; // ya paso hoy
      return { dia: diaKey, ventana: v, esHoy: offset === 0 };
    }
  }
  return null;
}

module.exports = {
  VENTANAS,
  TODO_EL_DIA,
  DIAS,
  ventanaLabel,
  diaLabel,
  defaultHorariosHabilitados,
  nowBogota,
  ventanaActivaAhora,
  estaPermitidoAhora,
  proximaVentana
};
