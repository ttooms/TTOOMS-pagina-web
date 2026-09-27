/* ============================================================
   TTOMS — datos compartidos de las páginas legales
   Llena la identificación del comercio desde config.js
   (Ley de Protección al Consumidor, art. 21-A).
   ============================================================ */
(function () {
  'use strict';
  var CFG = window.TTOMS_CONFIG || {};
  var L = CFG.legal || {};
  var wa = [].concat(CFG.whatsapp || []).map(function (n) { var d = String(n).replace(/\D/g, '').slice(-8); return d.slice(0, 4) + '-' + d.slice(4); });
  var datos = {
    marca: CFG.marca || 'Ttoms',
    titular: L.titular,
    documento: L.documento,
    direccion: L.direccion,
    correo: L.correo,
    registro: L.registroDefensoria,
    whatsapp: wa.join(' y '),
    instagram: CFG.instagramUsuario,
    ciudad: CFG.ciudad,
    sitio: String(CFG.sitio || location.origin).replace(/^https?:\/\//, '').replace(/\/$/, ''),
    garantia: String(CFG.garantiaDias || 15),
    puntos: (CFG.puntos || []).join(', ')
  };
  function llenar() {
    document.querySelectorAll('[data-dato]').forEach(function (el) {
      var v = datos[el.getAttribute('data-dato')];
      if (v) el.textContent = v;
      var fila = el.closest('[data-fila]');
      if (fila && !v) { fila.hidden = true; if (fila.previousElementSibling && fila.previousElementSibling.tagName === 'DT') fila.previousElementSibling.hidden = true; }
    });
    var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  }
  window.TTOMS_DATOS = datos;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', llenar); else llenar();
})();
