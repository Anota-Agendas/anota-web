/*
 * Anotá dentro de anota.ar.
 * Muestra la app (Apps Script) adentro de esta página, así la barra del navegador dice anota.ar.
 * La app avisa "listo" cuando cargó (scriptMarco_ en Codigo.gs). Si no avisa (iPhone, Google pide iniciar sesión,
 * el navegador no deja), se abre de la forma común, con la dirección de Google, y nadie se queda trabado.
 */
(function () {
  var GU = /^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/;
  var ESPERA_TRAS_CARGAR = 6000;   // después de que el marco cargó, cuánto se espera el "listo"
  var ESPERA_MAXIMA = 40000;       // tope, por si el marco nunca termina de cargar
  var RECORDAR = 24 * 3600 * 1000; // si en este aparato no anduvo, se abre directo por un día

  function idDe(url) { var m = /\/macros\/s\/([^\/]+)\/exec/.exec(url); return m ? m[1] : ''; }
  function leer(k) { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } }
  function guardar(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }

  /**
   * o.exec: dirección /exec de la app. o.buscar: "?p=pagos" o "?r=nombre".
   * o.nombre: para recordar por separado la agenda y las reservas.
   * o.sinMarco: abrir directo (por ejemplo en iPhone, donde Google no deja iniciar sesión adentro).
   * o.ruta(buscar): qué dirección de anota.ar mostrar en la barra para cada pantalla (solo la agenda).
   * o.texto: lo que dice mientras carga.
   */
  window.abrirAnota = function (o) {
    var destino = o.exec + (o.buscar || '');
    var clave = 'anota-directo:' + o.nombre;
    if (o.sinMarco || leer(clave) > Date.now() || window.top !== window) { location.replace(destino); return; }

    var cubre = document.getElementById('cargando');
    var masTarde = document.getElementById('tarda');
    var linkDirecto = document.getElementById('directo');
    if (linkDirecto) linkDirecto.href = destino;
    var marco = document.createElement('iframe');
    marco.className = 'marco';
    marco.title = 'Anotá';
    marco.setAttribute('allow', 'clipboard-write; clipboard-read; camera');

    var primera = true, listo = false, relojes = [], actual = destino;
    function limpiar() { relojes.forEach(clearTimeout); relojes = []; }
    function cargando(si) {
      if (cubre) cubre.hidden = !si;
      if (masTarde) masTarde.hidden = true;
      document.documentElement.classList.toggle('con-marco', !si);
    }
    function directo() {
      limpiar();
      if (primera) guardar(clave, Date.now() + RECORDAR);
      location.replace(actual);
    }
    function esperar() {
      listo = false;
      limpiar();
      relojes.push(setTimeout(function () { if (!listo && masTarde) masTarde.hidden = false; }, 9000));
      // La primera vez, si no avisa, se abre de la forma común. Después (cambiando de pantalla) se ofrece el botón.
      if (primera) relojes.push(setTimeout(function () { if (!listo) directo(); }, ESPERA_MAXIMA));
    }
    marco.addEventListener('load', function () {
      if (primera && !listo) relojes.push(setTimeout(function () { if (!listo) directo(); }, ESPERA_TRAS_CARGAR));
    });
    function ir(buscar, conHistoria) {
      cargando(true);
      if (linkDirecto) linkDirecto.href = o.exec + buscar;
      if (conHistoria && o.ruta) { try { history.pushState({ buscar: buscar }, '', o.ruta(buscar)); } catch (e) {} }
      esperar();
      actual = o.exec + buscar;
      // Con replace el marco no suma pasos al historial: así Atrás va a la pantalla anterior y la barra acompaña.
      try { marco.contentWindow.location.replace(actual); } catch (e) { marco.src = actual; }
    }

    window.addEventListener('message', function (e) {
      if (!GU.test(e.origin) || !e.data || typeof e.data !== 'object') return;
      if (e.data.anota === 'listo') {
        try { e.source.postMessage({ anota: 'ok' }, e.origin); } catch (err) {}
        if (listo) return;
        listo = true; primera = false;
        limpiar();
        guardar(clave, 0);
        var t = String(e.data.titulo || '').trim();
        if (t) document.title = t.indexOf('Anotá') < 0 ? t + ' · Anotá' : t;
        cargando(false);
      } else if (e.data.anota === 'ir' && o.ruta) {
        var u = String(e.data.url || '');
        if (!/^https:\/\/script\.google\.com\//.test(u)) return;
        if (idDe(u) !== idDe(o.exec)) { location.href = u; return; }
        var m = /\/exec(\?[^#]*)?/.exec(u);
        ir(m && m[1] ? m[1] : '', true);
      }
    });
    window.addEventListener('popstate', function (e) {
      ir(e.state && typeof e.state.buscar === 'string' ? e.state.buscar : location.search, false);
    });
    try { history.replaceState({ buscar: o.buscar || '' }, ''); } catch (e) {}
    cargando(true);
    esperar();
    marco.src = destino;
    document.body.appendChild(marco);
  };

  /** En iPhone, iPad, Safari de Mac, Firefox y los navegadores de adentro de otras apps, Google no deja iniciar sesión adentro de otra página. */
  window.sinSesionEnMarco = function () {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return true;
    if (/Firefox|FxiOS/.test(ua)) return true;
    if (/; wv\)|FBAN|FBAV|Instagram|Line\//.test(ua)) return true;
    if (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser|Android/.test(ua)) return true;
    return false;
  };
})();
