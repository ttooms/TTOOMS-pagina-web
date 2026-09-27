/* ============================================================
   TTOMS — comprobante de compra y acta de compra (imprimibles)
   Se leen con la sesión del sitio: el comprobante solo lo ve
   el comprador y los administradores; el acta, solo administradores.
   ============================================================ */
(function () {
  'use strict';
  var CFG = window.TTOMS_CONFIG || {}, L = CFG.legal || {};
  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var money = function (n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var fechaLarga = function (d, hora) {
    if (!d) return '—';
    var x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
    return x.toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/El_Salvador' }) +
      (hora ? ', ' + x.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', timeZone: 'America/El_Salvador' }) : '');
  };
  var wa = [].concat(CFG.whatsapp || []).map(function (n) { var d = String(n).replace(/\D/g, '').slice(-8); return d.slice(0, 4) + '-' + d.slice(4); });
  var MARK = '<svg class="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true" style="width:34px;height:34px"><rect x="1" y="1" width="30" height="30" rx="9" fill="#0F1A17"/><path d="M8 11h11M13.5 11v11" stroke="#8FE3C8" stroke-width="2.6" stroke-linecap="round"/><circle cx="22.5" cy="20" r="2.6" fill="#E8A765"/></svg>';

  // Monto en letras (para el acta): "ciento setenta y cinco 00/100 dólares"
  function letras(n) {
    var U = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    var D = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    var C = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    function menos1000(x) {
      if (x === 0) return '';
      if (x === 100) return 'cien';
      var c = Math.floor(x / 100), r = x % 100, s = C[c];
      if (r) s += (s ? ' ' : '') + (r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' y ' + U[r % 10] : ''));
      return s;
    }
    var ent = Math.floor(n), cent = Math.round((n - ent) * 100), txt;
    if (ent === 0) txt = 'cero';
    else {
      var miles = Math.floor(ent / 1000), resto = ent % 1000;
      txt = (miles ? (miles === 1 ? 'mil' : menos1000(miles) + ' mil') : '') + (resto ? (miles ? ' ' : '') + menos1000(resto) : '');
    }
    return txt + ' ' + String(cent).padStart(2, '0') + '/100 dólares de los Estados Unidos de América';
  }

  function vendedorTtoms() {
    return '<p><b>' + esc(CFG.marca || 'Ttoms') + '</b>' + (L.titular ? '<br>' + esc(L.titular) : '') +
      (L.documento ? '<br>NIT/DUI ' + esc(L.documento) : '') + (L.direccion ? '<br>' + esc(L.direccion) : '<br>' + esc(CFG.ciudad || '')) +
      (wa.length ? '<br>WhatsApp ' + esc(wa.join(' · ')) : '') + (L.correo ? '<br>' + esc(L.correo) : '') + '</p>';
  }
  function barra(volver) {
    return '<div class="print-bar no-print"><a class="btn ghost sm" href="' + volver + '">← Volver</a>' +
      '<button class="btn sm" type="button" onclick="window.print()">Imprimir o guardar PDF</button></div>';
  }
  function aviso(titulo, texto, boton) {
    $('#doc').innerHTML = '<div class="paper" style="text-align:center"><h1>' + esc(titulo) + '</h1><p style="margin-top:12px; color:#56685F">' + texto + '</p>' +
      (boton ? '<p style="margin-top:20px">' + boton + '</p>' : '') + '</div>';
  }

  async function comprobante() {
    var codigo = new URLSearchParams(location.search).get('o');
    var s = await sb.auth.getSession();
    if (!s.data.session) {
      aviso('Ingresá para ver tu comprobante', 'El comprobante solo lo puede ver la persona que hizo la compra.',
        '<a class="btn" href="/?cuenta=compras">Ingresar a mi cuenta</a>');
      return;
    }
    var r = await sb.from('ordenes').select('*').eq('codigo', codigo).maybeSingle();
    var o = r.data;
    if (!o) { aviso('No encontramos ese comprobante', 'Revisá que hayas ingresado con la cuenta con la que compraste.', '<a class="btn" href="/?cuenta=compras">Ver mis compras</a>'); return; }
    document.title = 'Comprobante ' + o.codigo + ' · Ttoms';
    var estado = { pendiente: ['Pedido confirmado', 'warn'], pagada: ['Pagado · por entregar', 'warn'], entregada: ['Entregado', ''], cancelada: ['Cancelado', 'warn'] }[o.estado] || [o.estado, 'warn'];
    var definitivo = o.estado === 'entregada';
    var dias = Number(CFG.garantiaDias || 15);
    $('#doc').innerHTML = barra('/?cuenta=compras') +
      '<div class="paper">' +
      '<div class="p-head"><div><span class="brand">' + MARK + '<b style="font-size:24px">' + esc(CFG.marca || 'Ttoms') + '</b></span>' +
      '<h1 style="margin-top:14px">Comprobante de compraventa</h1>' +
      '<p style="margin-top:6px; color:#56685F; font-size:14px">Artículo usado · ' + esc(CFG.ciudad || 'San Salvador') + '</p></div>' +
      '<div class="p-meta">N.º <b style="font-size:16px">' + esc(o.codigo) + '</b><br>Pedido: ' + esc(fechaLarga(o.creado_en)) +
      (o.entregada_en ? '<br>Entrega: ' + esc(fechaLarga(o.entregada_en, true)) : '') +
      '<br><span class="stamp ' + estado[1] + '" style="margin-top:8px">' + esc(estado[0]) + '</span></div></div>' +
      '<div class="p-grid"><div class="p-box"><h4>Vendedor</h4>' + vendedorTtoms() + '</div>' +
      '<div class="p-box"><h4>Comprador</h4><p><b>' + esc(o.nombre_cliente || '') + '</b><br>' + esc(o.correo || '') + (o.telefono ? '<br>WhatsApp ' + esc(o.telefono.slice(0, 4) + '-' + o.telefono.slice(4)) : '') + '</p></div></div>' +
      '<table><thead><tr><th>Artículo</th><th>Número de serie</th><th style="text-align:right">Precio</th></tr></thead><tbody>' +
      '<tr><td>' + esc(o.titulo_producto) + '</td><td class="mono">' + esc(o.serie || (definitivo ? 'Sin serie (accesorio)' : 'Se anota al entregar')) + '</td><td style="text-align:right" class="mono">' + money(o.monto) + '</td></tr>' +
      '<tr class="tot"><td colspan="2">Total' + (o.metodo_entrega === 'fuera' ? ' (sin incluir envío)' : '') + '</td><td style="text-align:right" class="mono">' + money(o.monto) + '</td></tr></tbody></table>' +
      '<div class="p-grid">' +
      '<div class="p-box"><h4>Pago y entrega</h4><p>Forma de pago: ' + (o.metodo_pago === 'transferencia' ? 'transferencia bancaria' : 'efectivo') + '<br>Entrega: ' + esc(o.punto_entrega || '—') + '</p></div>' +
      '<div class="p-box"><h4>Garantía</h4><p>' + (o.garantia_hasta ? '<b>Válida hasta el ' + esc(fechaLarga(o.garantia_hasta)) + '</b>' : dias + ' días desde la entrega') +
      '<br>Cubre fallas de encendido, lectora, puertos y controles incluidos. No cubre golpes, líquidos ni apertura. Detalles en ' + esc(String(CFG.sitio || '').replace(/^https?:\/\//, '')) + '/terminos.html</p></div></div>' +
      '<p class="legal-txt"><b>Procedencia del artículo.</b> ' + esc(CFG.marca || 'Ttoms') + ' declara que adquirió este artículo de forma lícita a su anterior propietario, a quien identificó con documento de identidad' +
      (o.acta_numero ? ', según el acta de compra <b>' + esc(o.acta_numero) + '</b>, que conserva en sus registros' : ', y que conserva el respaldo de su procedencia') +
      '. Este comprobante acredita que el comprador lo adquirió de buena fe, en un comercio identificado y a precio de mercado.</p>' +
      '<p class="legal-txt">' + esc(L.notaFiscal || '') + ' Tus derechos como consumidor: Ley de Protección al Consumidor · Defensoría del Consumidor, teléfono 910.</p>' +
      (definitivo ? '<div class="firmas"><div class="firma">Entrega · ' + esc(CFG.marca || 'Ttoms') + '</div><div class="firma">Recibe conforme · ' + esc(o.nombre_cliente || 'Comprador') + '</div></div>' : '') +
      '</div>';
  }

  async function acta() {
    var id = new URLSearchParams(location.search).get('id');
    var s = await sb.auth.getSession();
    if (!s.data.session) { aviso('Solo para administradores', 'Ingresá con la cuenta de administrador.', '<a class="btn" href="/?panel=actas">Ingresar</a>'); return; }
    var r = await sb.from('actas_compra').select('*').eq('id', id).maybeSingle();
    var a = r.data;
    if (!a) { aviso('Acta no encontrada', 'Solo los administradores pueden ver las actas de compra.', '<a class="btn" href="/?panel=actas">Ir al panel</a>'); return; }
    document.title = 'Acta ' + a.numero + ' · Ttoms';
    var v = a.verificaciones || {};
    var VER = [['documento', 'Documento original revisado; la foto coincide con el vendedor'], ['serie', 'La serie coincide con la declarada y con la caja o factura presentada'],
      ['serie_intacta', 'Etiqueta de serie sin raspaduras ni alteraciones'], ['desvinculada', 'Consola desvinculada de la cuenta del vendedor y restaurada'],
      ['precio', 'Precio acorde al valor de mercado'], ['conducta', 'Sin señales sospechosas en la conducta del vendedor']];
    var comprador = esc(CFG.marca || 'Ttoms') + (L.titular ? ', representado por ' + esc(L.titular) : '') + (L.documento ? ', NIT/DUI ' + esc(L.documento) : '');
    $('#doc').innerHTML = barra('/?panel=actas') +
      '<div class="paper">' +
      '<div class="p-head"><div><span class="brand">' + MARK + '<b style="font-size:24px">' + esc(CFG.marca || 'Ttoms') + '</b></span>' +
      '<h1 style="margin-top:14px">Acta de compra de artículo usado</h1>' +
      '<p style="margin-top:6px; color:#56685F; font-size:14px">Declaración de propiedad y procedencia lícita</p></div>' +
      '<div class="p-meta">N.º <b style="font-size:16px">' + esc(a.numero) + '</b><br>' + esc(fechaLarga(a.fecha, true)) + '<br>' + esc(a.lugar || CFG.ciudad || '') + '</div></div>' +
      '<div class="p-grid"><div class="p-box"><h4>Vendedor</h4><p><b>' + esc(a.vendedor_nombre) + '</b><br>' + esc(a.documento_tipo) + ' ' + esc(a.documento_numero) +
      (a.vendedor_telefono ? '<br>Tel. ' + esc(/^\d{8}$/.test(a.vendedor_telefono) ? a.vendedor_telefono.slice(0, 4) + '-' + a.vendedor_telefono.slice(4) : a.vendedor_telefono) : '') + (a.vendedor_domicilio ? '<br>' + esc(a.vendedor_domicilio) : '') + '</p></div>' +
      '<div class="p-box"><h4>Comprador</h4>' + vendedorTtoms() + '</div></div>' +
      '<table><thead><tr><th>Artículo</th><th>Número de serie</th><th style="text-align:right">Precio</th></tr></thead><tbody>' +
      '<tr><td>' + esc(a.articulo) + (a.accesorios ? '<br><span style="color:#56685F; font-size:13px">Incluye: ' + esc(a.accesorios) + '</span>' : '') +
      (a.estado_fisico ? '<br><span style="color:#56685F; font-size:13px">Estado: ' + esc(a.estado_fisico) + '</span>' : '') + '</td>' +
      '<td class="mono"><b>' + esc(a.serie) + '</b><br><span style="font-family:var(--body); color:#56685F; font-size:13px">Respaldo: ' + esc(a.comprobante_origen || '—') + '</span></td>' +
      '<td style="text-align:right" class="mono">' + money(a.monto) + '<br><span style="font-family:var(--body); color:#56685F; font-size:12px">' + esc(a.metodo_pago || '') + '</span></td></tr></tbody></table>' +
      '<div class="p-box" style="margin-top:18px"><h4>Verificaciones realizadas por el comprador</h4><p style="font-size:13.5px">' +
      VER.map(function (x) { return (v[x[0]] ? '☑ ' : '☐ ') + esc(x[1]); }).join('<br>') + '</p></div>' +
      '<p class="decl">Yo, <b>' + esc(a.vendedor_nombre) + '</b>, mayor de edad, portador del ' + esc(a.documento_tipo) + ' número <b>' + esc(a.documento_numero) + '</b>' +
      (a.vendedor_domicilio ? ', del domicilio de ' + esc(a.vendedor_domicilio) : '') + ', <b>DECLARO BAJO JURAMENTO</b> que: ' +
      '<b>(1)</b> soy el legítimo propietario del artículo descrito en esta acta, el cual adquirí de forma lícita; ' +
      '<b>(2)</b> el artículo no proviene de ningún delito ni falta, no tiene reporte de robo o extravío, y no está empeñado, embargado ni sujeto a financiamiento pendiente; ' +
      '<b>(3)</b> su número de serie <b>' + esc(a.serie) + '</b> no ha sido alterado; ' +
      '<b>(4)</b> lo vendo libre y voluntariamente a ' + comprador + ', por el precio de <b>' + money(a.monto) + '</b> (' + esc(letras(Number(a.monto))) + '), que recibo en este acto a mi entera satisfacción' + (a.metodo_pago ? ', por medio de ' + esc(String(a.metodo_pago).toLowerCase()) : '') + '; ' +
      '<b>(5)</b> si lo aquí declarado resultare falso, asumo toda la responsabilidad civil y penal que corresponda, y libero al comprador de cualquier responsabilidad derivada del origen del artículo; y ' +
      '<b>(6)</b> autorizo que mis datos personales se conserven por diez años con el único fin de acreditar la procedencia del artículo, y que se compartan con la Policía Nacional Civil, la Fiscalía General de la República o la autoridad judicial que los requiera, conforme a la Ley para la Protección de Datos Personales.</p>' +
      (a.notas ? '<p class="legal-txt"><b>Notas:</b> ' + esc(a.notas) + '</p>' : '') +
      '<div class="firmas"><div><div class="huella">Huella del<br>pulgar derecho<br>del vendedor</div><div class="firma" style="margin-top:28px">Firma del vendedor<br>' + esc(a.vendedor_nombre) + '</div></div>' +
      '<div style="display:flex; flex-direction:column; justify-content:flex-end"><div class="firma">Por el comprador<br>' + esc(CFG.marca || 'Ttoms') + (L.titular ? ' · ' + esc(L.titular) : '') + '</div></div></div>' +
      '<p class="legal-txt" style="margin-top:28px">Se firma en dos ejemplares: uno para el vendedor y otro que conserva ' + esc(CFG.marca || 'Ttoms') + ' durante diez años.</p>' +
      '</div>';
  }

  var tipo = document.body.getAttribute('data-doc');
  (tipo === 'acta' ? acta() : comprobante()).catch(function (e) { aviso('No se pudo cargar', esc(e.message || e)); });
})();
