/**
 * Backend de la plataforma Ruta Full Stack (Google Sheets + Apps Script).
 *
 * Despliegue: Web app, "Ejecutar como: yo", "Acceso: cualquier persona".
 * Aplicación de uso personal: las acciones del estudiante (leer/guardar progreso, enviar
 * entregas, ver calificaciones) NO exigen clave. Solo las del tutor (listar y calificar
 * entregas, restaurar copias) exigen ADMIN_KEY, que vive en Propiedades del script y
 * nunca en el repositorio.
 * Como la URL es pública, el servidor se protege con: tope de tamaño, rechazo de un
 * estado vacío sobre uno con progreso y COPIAS DE SEGURIDAD automáticas (hoja Respaldos).
 *
 * Hojas (se crean con setup()):
 *   Estado       clave | json | actualizado
 *   Entregas     id | semana | titulo | contenido | enviado | estado | nota | retroalimentacion | calificado
 *   Sesiones     fecha | semana | minutos | nota
 *   Intentos     fecha | semana | nivel | puntaje | aprobado | detalle
 *   Registro     fecha | accion | detalle
 */

var HOJAS = {
  Estado: ['clave', 'json', 'actualizado'],
  Entregas: ['id', 'semana', 'titulo', 'contenido', 'enviado', 'estado', 'nota', 'retroalimentacion', 'calificado'],
  Sesiones: ['fecha', 'semana', 'minutos', 'nota'],
  Intentos: ['fecha', 'semana', 'nivel', 'puntaje', 'aprobado', 'detalle'],
  Registro: ['fecha', 'accion', 'detalle'],
};

var CARPETA_ID = '1h4in9JTLb9mBGoiN4ltVXojHh2xh84qy'; // carpeta "App Full Stack" en Drive
var NOMBRE_LIBRO = 'Ruta Full Stack - Datos';
var MAX_JSON = 450000; // una celda admite ~50000 caracteres; el estado se parte en trozos

/* ------------------------------ configuración ------------------------------ */

/** Ejecutar UNA vez desde el editor. Crea el libro en la carpeta, las hojas y las claves. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss;
  var id = props.getProperty('SHEET_ID');
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create(NOMBRE_LIBRO);
    props.setProperty('SHEET_ID', ss.getId());
    try {
      DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(CARPETA_ID));
    } catch (e) {
      log_('setup', 'No se pudo mover a la carpeta: ' + e);
    }
  }
  Object.keys(HOJAS).forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]]).setFontWeight('bold');
      hoja.setFrozenRows(1);
    }
  });
  var inicial = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (inicial) ss.deleteSheet(inicial);

  var tmp = (typeof CLAVES_TMP !== 'undefined') ? CLAVES_TMP : null; // viene de Claves.gs (temporal)
  if (tmp) {
    props.setProperty('USER_KEY', tmp.user);
    props.setProperty('ADMIN_KEY', tmp.admin);
  } else {
    if (!props.getProperty('USER_KEY')) props.setProperty('USER_KEY', generarClave_());
    if (!props.getProperty('ADMIN_KEY')) props.setProperty('ADMIN_KEY', generarClave_());
  }
  Logger.log('Libro: ' + ss.getUrl());
  Logger.log('Las claves están en Propiedades del script (Configuración del proyecto). No las compartas.');
}

/** Muestra las claves en el registro de ejecución para copiarlas una vez. */
function mostrarClaves() {
  var p = PropertiesService.getScriptProperties();
  Logger.log('USER_KEY  = ' + p.getProperty('USER_KEY'));
  Logger.log('ADMIN_KEY = ' + p.getProperty('ADMIN_KEY'));
}

function generarClave_() {
  var s = '';
  while (s.length < 40) s += Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, 40);
}

/* --------------------------------- entrada --------------------------------- */

function doGet(e) {
  return responder_({ ok: true, servicio: 'ruta-full-stack', version: 1 });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var rol = autenticar_(req.key);
    var accion = String(req.accion || '');
    var manejadores = {
      ping: function () { return { rol: rol }; },
      leerEstado: leerEstado_,
      guardarEstado: function (r) { return guardarEstado_(r, rol); },
      enviarTrabajo: enviarTrabajo_,
      registrarIntento: registrarIntento_,
      registrarSesion: registrarSesion_,
      leerCalificaciones: leerCalificaciones_,
      // Solo tutor
      listarPendientes: soloAdmin_(rol, listarPendientes_),
      calificarTrabajo: soloAdmin_(rol, calificarTrabajo_),
      listarRespaldos: soloAdmin_(rol, listarRespaldos_),
      leerRespaldo: soloAdmin_(rol, leerRespaldo_),
    };
    if (!manejadores[accion]) return responder_({ ok: false, error: 'acción desconocida' });
    var resultado = manejadores[accion](req);
    return responder_({ ok: true, data: resultado });
  } catch (err) {
    return responder_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Sin clave (o con una vieja) se actúa como estudiante; solo la clave del tutor da rol 'admin'. */
function autenticar_(key) {
  if (key && key === PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')) return 'admin';
  return 'user';
}

function soloAdmin_(rol, fn) {
  return function (req) {
    if (rol !== 'admin') throw new Error('acción reservada al tutor');
    return fn(req);
  };
}

/* ---------------------------------- datos ---------------------------------- */

function libro_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('falta ejecutar setup()');
  return SpreadsheetApp.openById(id);
}

function hoja_(nombre) {
  return libro_().getSheetByName(nombre);
}

function log_(accion, detalle) {
  try { hoja_('Registro').appendRow([new Date(), accion, String(detalle).slice(0, 500)]); } catch (e) {}
}

/** El estado del estudiante se guarda en trozos de 40000 caracteres: Estado!estado.N */
function leerEstado_() {
  var hoja = hoja_('Estado');
  var filas = hoja.getDataRange().getValues().slice(1);
  var trozos = filas
    .filter(function (f) { return String(f[0]).indexOf('estado.') === 0; })
    .sort(function (a, b) { return Number(String(a[0]).split('.')[1]) - Number(String(b[0]).split('.')[1]); });
  if (!trozos.length) return { estado: null, actualizado: 0 };
  var json = trozos.map(function (f) { return f[1]; }).join('');
  var actualizado = Number(trozos[0][2]) || 0;
  return { estado: JSON.parse(json), actualizado: actualizado };
}

function guardarEstado_(req, rol) {
  var json = JSON.stringify(req.estado || {});
  if (json.length > MAX_JSON) throw new Error('estado demasiado grande');
  var actual = leerEstado_();
  var nuevo = Number(req.actualizado) || Date.now();
  // Defensa en profundidad: un estado sin progreso nunca sobrescribe uno que sí lo tiene.
  var conProgreso = function (e) { return !!e && ((e.topics && Object.keys(e.topics).length > 0) || Number(e.xp) > 0); };
  if (actual.estado && conProgreso(actual.estado) && !conProgreso(req.estado) && !(req.forzar && rol === 'admin')) {
    log_('guardarEstado', 'RECHAZADO: estado vacío sobre estado con progreso');
    return { guardado: false, estado: actual.estado, actualizado: actual.actualizado, motivo: 'vacio' };
  }
  // Gana el más reciente: si el servidor tiene datos más nuevos, se devuelven sin sobrescribir.
  if (actual.estado && actual.actualizado > nuevo) {
    return { guardado: false, estado: actual.estado, actualizado: actual.actualizado };
  }
  if (actual.estado && conProgreso(actual.estado)) respaldar_(actual);   // copia del estado que se va a reemplazar
  var hoja = hoja_('Estado');
  var ultima = hoja.getLastRow();
  if (ultima > 1) hoja.getRange(2, 1, ultima - 1, 3).clearContent();
  var TAM = 40000, filas = [];
  for (var i = 0, n = 0; i < json.length; i += TAM, n++) {
    filas.push(['estado.' + n, json.slice(i, i + TAM), nuevo]);
  }
  hoja.getRange(2, 1, filas.length, 3).setValues(filas);
  return { guardado: true, actualizado: nuevo };
}

function enviarTrabajo_(req) {
  var t = req.trabajo || {};
  var semana = Number(t.semana);
  if (!semana || !t.contenido) throw new Error('entrega incompleta');
  var hoja = hoja_('Entregas');
  var id = 'T' + semana + '-' + Date.now();
  hoja.appendRow([id, semana, String(t.titulo || '').slice(0, 200), String(t.contenido).slice(0, 45000), new Date(), 'pendiente', '', '', '']);
  log_('enviarTrabajo', id);
  return { id: id, estado: 'pendiente' };
}

function leerCalificaciones_() {
  var filas = hoja_('Entregas').getDataRange().getValues().slice(1);
  return filas
    .filter(function (f) { return f[5] === 'calificado'; })
    .map(function (f) { return { id: f[0], semana: f[1], nota: f[6], retroalimentacion: f[7], calificado: f[8] }; });
}

function registrarIntento_(req) {
  var i = req.intento || {};
  hoja_('Intentos').appendRow([new Date(), Number(i.semana), String(i.nivel), Number(i.puntaje), i.aprobado ? 'sí' : 'no', JSON.stringify(i.detalle || {}).slice(0, 4000)]);
  return { registrado: true };
}

function registrarSesion_(req) {
  var s = req.sesion || {};
  hoja_('Sesiones').appendRow([new Date(), Number(s.semana), Number(s.minutos), String(s.nota || '').slice(0, 500)]);
  return { registrado: true };
}

/* ---------------------------------- tutor ---------------------------------- */

function listarPendientes_() {
  var filas = hoja_('Entregas').getDataRange().getValues().slice(1);
  return filas
    .filter(function (f) { return f[5] === 'pendiente'; })
    .map(function (f) { return { id: f[0], semana: f[1], titulo: f[2], contenido: f[3], enviado: f[4] }; });
}

function calificarTrabajo_(req) {
  var nota = Number(req.nota);
  if (isNaN(nota) || nota < 0 || nota > 10) throw new Error('la nota debe estar entre 0 y 10');
  var hoja = hoja_('Entregas');
  var filas = hoja.getDataRange().getValues();
  for (var r = 1; r < filas.length; r++) {
    if (filas[r][0] === req.id) {
      hoja.getRange(r + 1, 6, 1, 4).setValues([['calificado', nota, String(req.retroalimentacion || '').slice(0, 45000), new Date()]]);
      log_('calificarTrabajo', req.id + ' -> ' + nota);
      return { id: req.id, nota: nota };
    }
  }
  throw new Error('entrega no encontrada');
}


/* ------------------------------ copias de seguridad ------------------------------ */
var RESPALDO_CADA_MIN = 30, RESPALDOS_MAX = 60;

function hojaRespaldos_() {
  var ss = libro_(), h = ss.getSheetByName('Respaldos');
  if (!h) { h = ss.insertSheet('Respaldos'); h.getRange(1, 1, 1, 3).setValues([['fecha', 'actualizado', 'estado_gz_base64']]).setFontWeight('bold'); h.setFrozenRows(1); }
  return h;
}

/** Guarda una copia comprimida del estado, como mucho una cada 30 minutos; conserva las últimas 60. */
function respaldar_(actual) {
  try {
    var h = hojaRespaldos_(), n = h.getLastRow();
    if (n > 1) {
      var ultimo = new Date(h.getRange(n, 1).getValue()).getTime();
      if (Date.now() - ultimo < RESPALDO_CADA_MIN * 60000) return;
    }
    var blob = Utilities.gzip(Utilities.newBlob(JSON.stringify(actual.estado), 'application/json', 'estado.json'));
    h.appendRow([new Date(), actual.actualizado, Utilities.base64Encode(blob.getBytes())]);
    var total = h.getLastRow() - 1;
    if (total > RESPALDOS_MAX) h.deleteRows(2, total - RESPALDOS_MAX);
  } catch (e) { log_('respaldar', e); }
}

function listarRespaldos_() {
  var h = hojaRespaldos_(), n = h.getLastRow();
  if (n < 2) return [];
  return h.getRange(2, 1, n - 1, 2).getValues().map(function (f, i) { return { i: i, fecha: f[0], actualizado: f[1] }; });
}

function leerRespaldo_(req) {
  var h = hojaRespaldos_(), fila = Number(req.i) + 2;
  if (!(fila >= 2 && fila <= h.getLastRow())) throw new Error('respaldo no encontrado');
  var b64 = h.getRange(fila, 3).getValue();
  var bytes = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip')).getDataAsString();
  return { estado: JSON.parse(bytes) };
}
