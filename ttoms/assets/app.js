/* ============================================================
   TTOMS — lógica del sitio
   Funciona de dos maneras:
   · CON Supabase configurado en config.js → usuarios, productos,
     órdenes, ofertas y chat reales, compartidos por todos.
   · SIN Supabase → modo demostración con datos locales, para
     ver el sitio antes de conectarlo.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.TTOMS_CONFIG || {};
  var HAS_DB = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase);
  var sb = HAS_DB ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;

  /* ---------------- utilidades ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var initials = function (n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); };
  var hora = function (d) { var x = d ? new Date(d) : new Date(); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
  var fecha = function (d) { return (d ? new Date(d) : new Date()).toISOString().slice(0, 10); };
  var validEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v).trim()); };
  var passOk = function (p) { return String(p).length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p); };
  var PUNTOS = Array.isArray(CFG.puntos) ? CFG.puntos : ['San Salvador'];
  var DEPTOS = Array.isArray(CFG.departamentos) ? CFG.departamentos : ['San Salvador'];
  var WHATS = [].concat(CFG.whatsapp || []).map(function (n) { return String(n).replace(/\D/g, ''); }).filter(Boolean)
    .map(function (n) { return n.length === 8 ? '503' + n : n; });
  var waLink = function (n, texto) { return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : ''); };
  var waBonito = function (n) { var l = n.slice(-8); return l.slice(0, 4) + '-' + l.slice(4); };
  var WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.9a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8.1 8.1 0 1 1 12 20.1Zm4.5-6c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
  var FUERA = CFG.fueraDeSanSalvador || 'Fuera de San Salvador coordinamos la entrega por chat.';
  var SITIO = String(CFG.sitio || location.origin).replace(/\/$/, '');
  var LEGAL = CFG.legal || {};
  var GARANTIA = Number(CFG.garantiaDias || 15);
  var TITULO = document.title;
  function fotosDe(p) {
    var f = (p && Array.isArray(p.imagenes) ? p.imagenes : []).filter(Boolean);
    if (!f.length && p && p.imagen_url) f = [p.imagen_url];
    return f;
  }
  function linkDe(p) { return SITIO + (p && p.slug ? '/c/' + p.slug : '/?c=' + encodeURIComponent(p.id)); }
  var soloDigitos = function (v) { return String(v || '').replace(/\D/g, ''); };
  // Teléfono salvadoreño: 8 dígitos que empiezan con 2, 6 o 7.
  function telOk(v) { var d = soloDigitos(v); if (d.length === 11 && d.indexOf('503') === 0) d = d.slice(3); return d.length === 8 && /^[267]/.test(d) ? d : ''; }
  var telBonito = function (d) { d = soloDigitos(d).slice(-8); return d.length === 8 ? d.slice(0, 4) + '-' + d.slice(4) : d; };
  // DUI: 8 dígitos + dígito verificador (pesos 9…2, módulo 10).
  function duiNormal(v) { var m = /^(\d{8})-?(\d)$/.exec(String(v || '').replace(/\s/g, '')); return m ? m[1] + '-' + m[2] : ''; }
  function duiOk(v) {
    var n = duiNormal(v); if (!n) return false;
    var s = 0; for (var i = 0; i < 8; i++) s += Number(n[i]) * (9 - i);
    return (10 - (s % 10)) % 10 === Number(n[9]);
  }
  function serieNormal(v) { return String(v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }
  function ultimos4(v) { return serieNormal(v).slice(-4); }
  function copiar(t, msg) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast(msg || 'Copiado.'); }, function () { window.prompt('Copiá:', t); });
  }
  var ESTADO_ORDEN = { pendiente: 'confirmado', pagada: 'pagado', entregada: 'entregado', cancelada: 'cancelado' };
  var deptoOpts = function (sel) {
    return DEPTOS.map(function (d) { return '<option' + (d === sel ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('');
  };
  var estrellas = function (n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += '<svg class="' + (i <= n ? '' : 'off') + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
    return '<span class="stars" role="img" aria-label="' + n + ' de 5 estrellas">' + s + '</span>';
  };

  var ART = {
    consola: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="16" y="10" width="34" height="62" rx="6"/><path d="M33 10v62" stroke-width="1.4" opacity=".5"/><rect x="62" y="34" width="44" height="26" rx="12"/><circle cx="74" cy="47" r="3.2"/><circle cx="94" cy="47" r="3.2"/><path d="M62 60c-4 8-2 14 3 14M106 60c4 8 2 14-3 14" stroke-width="1.6" opacity=".6"/></svg>',
    portatil: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="14" y="24" width="92" height="44" rx="10"/><rect x="36" y="32" width="48" height="28" rx="4"/><circle cx="25" cy="46" r="4.6"/><circle cx="95" cy="46" r="4.6"/><path d="M14 40h-4a4 4 0 0 0-4 4v4a4 4 0 0 0 4 4h4M106 40h4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-4" stroke-width="1.8" opacity=".7"/></svg>',
    control: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M38 28h44c9 0 16 7 18 16l4 18c2 8-6 13-11 7l-9-11H36l-9 11c-5 6-13 1-11-7l4-18c2-9 9-16 18-16Z"/><path d="M40 46h12M46 40v12" stroke-linecap="round"/><circle cx="76" cy="43" r="2.6" fill="currentColor" stroke="none"/><circle cx="86" cy="50" r="2.6" fill="currentColor" stroke="none"/></svg>',
    retro: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M30 14h60v50l-10 12H30V14Z"/><rect x="40" y="24" width="40" height="20" rx="3" opacity=".8"/><path d="M40 56h22M40 64h14" stroke-linecap="round" opacity=".7"/></svg>',
    accesorio: '<svg viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="28" y="30" width="64" height="34" rx="8"/><path d="M44 30V22a16 16 0 0 1 32 0v8" stroke-width="2"/><path d="M42 47h36" stroke-linecap="round" opacity=".7"/></svg>'
  };
  var ART_CAT = { 'PlayStation': 'consola', 'Xbox': 'consola', 'Nintendo': 'portatil', 'Portátil': 'portatil', 'Retro': 'retro', 'Accesorios': 'accesorio' };
  var GRADO = { S: 'S · como nueva', A: 'A · muy buena', B: 'B · buena', C: 'C · con marcas de uso' };
  var ALERTAS_DEF = { nuevas: true, bajadas: true, ofertas: true, resumen: false, frecuencia: 'inmediato' };

  function media(p, opts) {
    opts = opts || {};
    var art = ART[ART_CAT[p.categoria] || 'consola'];
    var f = fotosDe(p);
    var out = f.length ? '<img src="' + esc(f[0]) + '" alt="' + esc(p.titulo) + '" loading="lazy">' : art;
    if (p.video_url && opts.video !== false) {
      out += '<video src="' + esc(p.video_url) + '" muted loop playsinline preload="none"' + (opts.auto ? ' autoplay' : '') + '></video>';
    }
    return out;
  }

  var toastEl = null, toastT = null;
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.textContent = msg;
    document.body.appendChild(toastEl);
    clearTimeout(toastT);
    toastT = setTimeout(function () { if (toastEl) { toastEl.remove(); toastEl = null; } }, 3600);
  }
  function busy(btn, on, txt) {
    if (!btn) return;
    if (on) { if (!btn.disabled) btn.dataset.html = btn.innerHTML; btn.textContent = txt || 'Un momento…'; btn.disabled = true; }
    else { if (btn.dataset.html) btn.innerHTML = btn.dataset.html; btn.disabled = false; }
  }

  /* ============================================================
     CAPA DE DATOS
     ============================================================ */
  var SEED = [
    { id: 's1', titulo: 'PlayStation 5 Slim Digital', categoria: 'PlayStation', precio: 430, grado: 'A', ubicacion: 'San Salvador', envio: true, activo: true, incluye: ['1 control DualSense', 'Cable HDMI 2.1', 'Caja original'], descripcion: 'Recibida en compra directa e higienizada por dentro. Sin rayones en el chasis y consola restaurada de fábrica.', serie: 'Serie registrada · termina en 4471', creado_en: '2026-09-18' },
    { id: 's2', titulo: 'Nintendo Switch OLED Blanca', categoria: 'Nintendo', precio: 290, grado: 'S', ubicacion: 'La Libertad', envio: true, activo: true, incluye: ['Dock original', '2 Joy-Con', 'Micro SD 128 GB'], descripcion: 'Menos de 10 horas de uso. Pantalla sin pixeles muertos y Joy-Con sin drift comprobado en prueba de calibración.', serie: 'Serie registrada · termina en 9023', creado_en: '2026-09-17' },
    { id: 's3', titulo: 'Xbox Series X 1 TB', categoria: 'Xbox', precio: 395, grado: 'A', ubicacion: 'San Salvador', envio: true, activo: true, incluye: ['1 control inalámbrico', 'Cable de poder', 'Caja original'], descripcion: 'Dos años de uso con regulador de voltaje. Lectora funcionando perfecto y disipador sin ruido.', serie: 'Serie registrada · termina en 1180', creado_en: '2026-09-15' },
    { id: 's4', titulo: 'Steam Deck OLED 512 GB', categoria: 'Portátil', precio: 410, grado: 'A', ubicacion: 'San Salvador', envio: true, activo: true, incluye: ['Estuche rígido', 'Cargador original'], descripcion: 'Batería con 96% de salud y protector de pantalla desde el primer día, sin una sola marca.', serie: 'Serie registrada · termina en 6612', creado_en: '2026-09-14' },
    { id: 's5', titulo: 'PlayStation 4 Pro 1 TB', categoria: 'PlayStation', precio: 215, grado: 'B', ubicacion: 'Santa Ana', envio: true, activo: true, incluye: ['2 controles DualShock 4', 'Cables', '3 juegos físicos'], descripcion: 'Enciende y corre sin problema. Rayones leves en la tapa superior y ventilador audible en juegos pesados.', serie: 'Serie registrada · termina en 3390', creado_en: '2026-09-12' },
    { id: 's6', titulo: 'Xbox Series S 512 GB', categoria: 'Xbox', precio: 245, grado: 'A', ubicacion: 'La Libertad', envio: true, activo: true, incluye: ['1 control blanco', 'Caja original'], descripcion: 'Estética impecable, sin marcas. Se entrega con la cuenta desvinculada y lista para el nuevo dueño.', serie: 'Serie registrada · termina en 7754', creado_en: '2026-09-11' },
    { id: 's7', titulo: 'Nintendo 3DS XL Roja', categoria: 'Retro', precio: 115, grado: 'B', ubicacion: 'Sonsonate', envio: true, activo: true, incluye: ['Cargador', 'Micro SD 32 GB', 'Estuche'], descripcion: 'Revisada y limpia por dentro, bisagras firmes y pantallas sin rayones profundos.', serie: 'Serie registrada · termina en 8846', creado_en: '2026-09-09' },
    { id: 's8', titulo: 'Control DualSense Blanco', categoria: 'Accesorios', precio: 48, grado: 'A', ubicacion: 'San Salvador', envio: true, activo: true, incluye: ['Cable USB-C'], descripcion: 'Gatillos adaptativos intactos y sin drift. Sin marcas de uñas en el touchpad.', serie: 'Accesorio sin registro de serie', creado_en: '2026-09-08' }
  ];

  /* ---------- modo demostración (localStorage) ---------- */
  var DEMO_KEY = 'ttoms.demo.v2';
  var demo = {
    perfiles: [
      { id: 'u-admin', nombre: 'Admin', nombre_completo: 'Administración', departamento: 'San Salvador', correo: 'admin@ttoms.com', pass: 'ttoms2026', rol: 'admin', alertas: { nuevas: false, bajadas: false, ofertas: true, resumen: true, frecuencia: 'inmediato' }, creado_en: '2025-11-02' },
      { id: 'u-demo', nombre: 'Carlos', nombre_completo: '', departamento: 'La Libertad', correo: 'comprador@ttoms.com', pass: 'comprar2026', rol: 'comprador', alertas: Object.assign({}, ALERTAS_DEF), creado_en: '2026-03-14' }
    ],
    productos: SEED.slice(),
    ordenes: [], ofertas: [], mensajes: [], resenas: [], correos: [], sesion: null
  };
  function demoSave() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)); } catch (e) { } }
  function demoLoad() {
    try {
      var raw = localStorage.getItem('ttoms.demo.v2'); if (!raw) return;
      var d = JSON.parse(raw);
      if (d && Array.isArray(d.perfiles) && d.perfiles.length) { demo = d; demo.resenas = demo.resenas || []; }
    } catch (e) { }
  }
  if (!HAS_DB) demoLoad();

  var perfil = null;   // perfil del usuario con sesión iniciada

  var api = HAS_DB ? {
    /* ---------- Supabase ---------- */
    async sesion() {
      var s = await sb.auth.getSession();
      var user = s.data.session && s.data.session.user;
      if (!user) { perfil = null; return null; }
      var r = await sb.from('perfiles').select('*').eq('id', user.id).maybeSingle();
      perfil = r.data || { id: user.id, correo: user.email, nombre: user.email, rol: 'comprador', alertas: ALERTAS_DEF };
      return perfil;
    },
    async registrar(d) {
      var r = await sb.auth.signUp({
        email: d.correo, password: d.pass,
        options: {
          emailRedirectTo: location.origin + location.pathname,
          data: { nombre: d.nombre, nombre_completo: d.nombre_completo, departamento: d.departamento, alertas: d.alertas }
        }
      });
      if (r.error) throw r.error;
      if (!r.data.session) return { pendiente: true };
      await this.sesion();
      return { pendiente: false };
    },
    async ingresar(correo, pass) {
      var r = await sb.auth.signInWithPassword({ email: correo, password: pass });
      if (r.error) throw r.error;
      return await this.sesion();
    },
    async salir() { await sb.auth.signOut(); perfil = null; },
    async recuperar(correo) {
      var r = await sb.auth.resetPasswordForEmail(correo, { redirectTo: location.origin + location.pathname });
      if (r.error) throw r.error;
    },
    async cambiarClave(nueva) {
      var r = await sb.auth.updateUser({ password: nueva });
      if (r.error) throw r.error;
    },
    async guardarPerfil(patch) {
      var r = await sb.from('perfiles').update(patch).eq('id', perfil.id).select().maybeSingle();
      if (r.error) throw r.error;
      perfil = r.data || perfil; return perfil;
    },
    async productos() {
      var r = await sb.from('productos').select('*').order('creado_en', { ascending: false });
      if (r.error) throw r.error;
      return r.data || [];
    },
    async crearProducto(p) {
      var r = await sb.from('productos').insert(p).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async editarProducto(id, patch) {
      var r = await sb.from('productos').update(patch).eq('id', id).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async borrarProducto(id) {
      var r = await sb.from('productos').delete().eq('id', id);
      if (r.error) throw r.error;
    },
    async subirArchivo(file, carpeta, bucket) {
      bucket = bucket || 'productos';
      var ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
      var ruta = carpeta + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      var up = await sb.storage.from(bucket).upload(ruta, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (up.error) throw up.error;
      return sb.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
    },
    escucharTabla(tabla, cb) {
      sb.channel(tabla + '-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tabla }, function (p) { cb(p.new); })
        .subscribe();
    },
    async ordenes() {
      var r = await sb.from('ordenes').select('*').order('creado_en', { ascending: false });
      if (r.error) throw r.error; return r.data || [];
    },
    async crearOrden(o) {
      var r = await sb.from('ordenes').insert(o).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async editarOrden(id, patch) {
      var r = await sb.from('ordenes').update(patch).eq('id', id).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async resenas() {
      var r = await sb.from('resenas').select('*').order('creado_en', { ascending: false });
      if (r.error) throw r.error; return r.data || [];
    },
    async guardarResena(x) {
      var r = await sb.from('resenas').upsert(x, { onConflict: 'user_id' }).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async editarResena(id, patch) {
      var r = await sb.from('resenas').update(patch).eq('id', id);
      if (r.error) throw r.error;
    },
    async borrarResena(id) {
      var r = await sb.from('resenas').delete().eq('id', id);
      if (r.error) throw r.error;
    },
    async ofertas() {
      var r = await sb.from('ofertas').select('*').order('creado_en', { ascending: false });
      if (r.error) throw r.error; return r.data || [];
    },
    async crearOferta(o) {
      var r = await sb.from('ofertas').insert(o).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async editarOferta(id, patch) {
      var r = await sb.from('ofertas').update(patch).eq('id', id).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async banco() {
      var r = await sb.from('ajustes').select('valor').eq('clave', 'banco').maybeSingle();
      if (r.error) throw r.error; return r.data ? r.data.valor : null;
    },
    desconectarVivo() { sb.removeAllChannels(); },
    async perfiles() {
      var r = await sb.from('perfiles').select('*').order('creado_en', { ascending: false });
      if (r.error) throw r.error; return r.data || [];
    },
    async mensajes() {
      var r = await sb.from('mensajes').select('*').order('creado_en', { ascending: true });
      if (r.error) throw r.error; return r.data || [];
    },
    async enviarMensaje(m) {
      var r = await sb.from('mensajes').insert(m).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    escucharMensajes(cb) {
      sb.channel('mensajes-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, function (p) { cb(p.new); })
        .subscribe();
    },
    async estadisticas() {
      var r = await sb.rpc('estadisticas_publicas');
      if (r.error) throw r.error; return r.data || {};
    },
    // Pide a la función del servidor que mande un correo (confirmación, aviso, etc.).
    async notificar(tipo, datos) {
      if (!CFG.funcionCorreo) return { ok: false, motivo: 'sin-funcion' };
      var s = await sb.auth.getSession();
      if (!s.data.session) return { ok: false, motivo: 'sin-sesion' };
      var res = await fetch(CFG.funcionCorreo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.data.session.access_token, 'apikey': CFG.supabaseKey },
        body: JSON.stringify(Object.assign({ tipo: tipo }, datos || {}))
      });
      var j = {}; try { j = await res.json(); } catch (e) { }
      if (!res.ok) throw new Error(j.error || ('La función de correo respondió ' + res.status));
      return j;
    },
    async origen(pid) {
      var r = await sb.from('productos_origen').select('*').eq('producto_id', pid).maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async guardarOrigen(row) {
      var r = await sb.from('productos_origen').upsert(Object.assign({ editado_en: new Date().toISOString() }, row));
      if (r.error) throw r.error;
    },
    async actas() {
      var r = await sb.from('actas_compra').select('*').order('creado_en', { ascending: false });
      if (r.error) throw r.error; return r.data || [];
    },
    async crearActa(a) {
      var r = await sb.from('actas_compra').insert(a).select().maybeSingle();
      if (r.error) throw r.error; return r.data;
    },
    async estadoCorreo() {
      var r = await sb.rpc('estado_correo');
      if (r.error) throw r.error; return r.data || { configurado: false };
    },
    async guardarCorreo(usuario, clave, nombre) {
      var r = await sb.rpc('guardar_correo_envio', { usuario: usuario, clave_app: clave, nombre: nombre });
      if (r.error) throw r.error;
    },
    async correosLog() {
      var r = await sb.from('correos_log').select('*').order('enviado_en', { ascending: false }).limit(25);
      if (r.error) throw r.error; return r.data || [];
    }
  } : {
    /* ---------- modo demostración ---------- */
    async sesion() { perfil = demo.sesion ? demo.perfiles.filter(function (p) { return p.id === demo.sesion; })[0] || null : null; return perfil; },
    async registrar(d) {
      if (demo.perfiles.some(function (p) { return p.correo.toLowerCase() === d.correo.toLowerCase(); })) { var e = new Error('Ya existe una cuenta con ese correo.'); throw e; }
      var u = { id: 'u' + Date.now(), nombre: d.nombre, nombre_completo: d.nombre_completo, departamento: d.departamento, correo: d.correo, pass: d.pass, rol: 'comprador', alertas: d.alertas, creado_en: fecha() };
      demo.perfiles.push(u); demo.sesion = u.id; perfil = u; demoSave(); return { pendiente: false };
    },
    async ingresar(correo, pass) {
      var u = demo.perfiles.filter(function (p) { return p.correo.toLowerCase() === String(correo).toLowerCase() && p.pass === pass; })[0];
      if (!u) throw new Error('Correo o contraseña incorrectos.');
      demo.sesion = u.id; perfil = u; demoSave(); return u;
    },
    async salir() { demo.sesion = null; perfil = null; demoSave(); },
    async recuperar(correo) { demo.correos.unshift({ para: [correo], asunto: 'Restablecé tu contraseña', cuerpo: 'Enlace de recuperación (demostración).', fecha: fecha() }); demoSave(); },
    async cambiarClave(nueva) { perfil.pass = nueva; demoSave(); },
    async guardarPerfil(patch) { Object.assign(perfil, patch); demoSave(); return perfil; },
    async productos() { return demo.productos.slice(); },
    async crearProducto(p) {
      p.id = 'p' + Date.now(); p.creado_en = new Date().toISOString();
      p.slug = String(p.titulo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + p.id.slice(-5);
      demo.productos.unshift(p); demoSave(); return p;
    },
    async editarProducto(id, patch) { var p = demo.productos.filter(function (x) { return x.id === id; })[0]; Object.assign(p, patch); demoSave(); return p; },
    async borrarProducto(id) { demo.productos = demo.productos.filter(function (x) { return x.id !== id; }); demoSave(); },
    async subirArchivo(file) {
      return await new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(file); });
    },
    escucharTabla() { },
    async ordenes() { return demo.ordenes.slice(); },
    async crearOrden(o) {
      var p = demo.productos.filter(function (x) { return x.id === o.producto_id; })[0];
      if (!p || !p.activo) throw new Error('Esta consola ya se vendió o no está disponible.');
      o.monto = p.precio; o.titulo_producto = p.titulo;
      o.id = 'o' + Date.now(); o.creado_en = new Date().toISOString(); demo.ordenes.unshift(o); demoSave(); return o;
    },
    async editarOrden(id, patch) {
      var o = demo.ordenes.filter(function (x) { return x.id === id; })[0]; Object.assign(o, patch);
      if (patch.estado === 'entregada') {
        demo.resenas.forEach(function (r) { if (r.user_id === o.user_id) r.verificada = true; });
        var d = new Date(); d.setDate(d.getDate() + GARANTIA); o.garantia_hasta = d.toISOString().slice(0, 10);
        o.serie = o.serie || ((demo.origen || {})[o.producto_id] || {}).serie || null;
      }
      if (patch.estado === 'entregada' || patch.estado === 'pagada') demo.productos.forEach(function (p) { if (p.id === o.producto_id) p.activo = false; });
      demoSave(); return o;
    },
    async resenas() { return demo.resenas.slice(); },
    async guardarResena(x) {
      var previa = demo.resenas.filter(function (r) { return r.user_id === x.user_id; })[0];
      var verif = demo.ordenes.some(function (o) { return o.user_id === x.user_id && o.estado === 'entregada'; });
      if (previa) { Object.assign(previa, x, { verificada: verif }); demoSave(); return previa; }
      var n = Object.assign({ id: 'r' + Date.now(), creado_en: new Date().toISOString(), visible: true, verificada: verif }, x);
      demo.resenas.unshift(n); demoSave(); return n;
    },
    async editarResena(id, patch) { var r = demo.resenas.filter(function (x) { return x.id === id; })[0]; Object.assign(r, patch); demoSave(); },
    async borrarResena(id) { demo.resenas = demo.resenas.filter(function (x) { return x.id !== id; }); demoSave(); },
    async ofertas() { return demo.ofertas.slice(); },
    async crearOferta(o) {
      if (!o.declaracion_en) throw new Error('Falta aceptar la declaración de procedencia lícita.');
      o.id = 'of' + Date.now(); o.creado_en = new Date().toISOString(); demo.ofertas.unshift(o); demoSave(); return o;
    },
    async editarOferta(id, patch) { var o = demo.ofertas.filter(function (x) { return x.id === id; })[0]; Object.assign(o, patch); demoSave(); return o; },
    async perfiles() { return demo.perfiles.slice(); },
    async banco() { return { banco: 'Banco Agrícola', tipo: 'Cuenta de ahorro', numero: '0000000000', titular: 'Cuenta de ejemplo' }; },
    desconectarVivo() { },
    async mensajes() { return demo.mensajes.slice(); },
    async enviarMensaje(m) { m.id = 'm' + Date.now(); m.creado_en = new Date().toISOString(); demo.mensajes.push(m); demoSave(); return m; },
    escucharMensajes() { },
    async estadisticas() {
      return { entregadas: demo.ordenes.filter(function (o) { return o.estado === 'entregada'; }).length,
        vendidas: demo.productos.filter(function (p) { return !p.activo; }).length };
    },
    async notificar(tipo, datos) { demo.correos.unshift({ tipo: tipo, asunto: 'Aviso: ' + tipo, datos: datos, fecha: new Date().toISOString() }); demoSave(); return { ok: true, enviados: 1 }; },
    async origen(pid) { return (demo.origen || {})[pid] || null; },
    async guardarOrigen(row) { demo.origen = demo.origen || {}; demo.origen[row.producto_id] = row; demoSave(); },
    async actas() { return (demo.actas || []).slice(); },
    async crearActa(a) {
      demo.actas = demo.actas || [];
      a.id = 'a' + Date.now(); a.numero = 'AC-' + new Date().getFullYear() + '-' + String(demo.actas.length + 1).padStart(4, '0');
      a.creado_en = a.fecha = new Date().toISOString(); demo.actas.unshift(a); demoSave(); return a;
    },
    async estadoCorreo() { return demo.smtp ? { configurado: true, usuario: demo.smtp } : { configurado: false }; },
    async guardarCorreo(u) { demo.smtp = u; demoSave(); },
    async correosLog() {
      return (demo.correos || []).slice(0, 25).map(function (c, i) {
        return { id: i, tipo: c.tipo || 'correo', para: Array.isArray(c.para) ? c.para.join(', ') : (c.para || ''), asunto: c.asunto || c.tipo, ok: true, enviado_en: c.fecha };
      });
    }
  };

  var esAdmin = function () { return !!perfil && perfil.rol === 'admin'; };

  /* ============================================================
     ARRANQUE
     ============================================================ */
  var productos = [], mensajes = [], resenas = [];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    $('#demoBar').hidden = HAS_DB;
    $('#year').textContent = new Date().getFullYear();
    $('#ciudad').textContent = CFG.ciudad || '';
    pintarRedes();
    pintarLegal();
    montarWhatsFlotante();
    pintarHeroVideo();
    pintarEntregas();
    montarTabs();
    pintarCintas();
    conectarEventos();
    window.addEventListener('scroll', function () { if (!spy.t) spy.t = requestAnimationFrame(function () { spy.t = 0; spy(); }); }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { spy(); glide($('#catTabs'), $('#catGlide')); glide($('#howTabs'), $('#howGlide')); });
    glide($('#howTabs'), $('#howGlide'));
    $$('select[data-deptos]').forEach(function (s) { s.innerHTML = deptoOpts('San Salvador'); });
    cargarResenas();

    try { await api.sesion(); } catch (e) { }
    refrescarCuenta();

    try { productos = await api.productos(); }
    catch (e) { productos = []; toast('No pudimos cargar el catálogo: ' + (e.message || e)); }
    render();
    pintarContador();
    abrirDesdeUrl();
    window.addEventListener('popstate', alNavegar);

    try { mensajes = await api.mensajes(); } catch (e) { mensajes = []; }
    refrescarBadge();
    conectarVivo();

    if (HAS_DB) {
      sb.auth.onAuthStateChange(function (evt) {
        if (evt === 'PASSWORD_RECOVERY') abrirNuevaClave();
        if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') api.sesion().then(refrescarCuenta);
      });
    }
  }

  function pintarRedes() {
    var redes = [
      { url: CFG.facebook, nombre: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9V7.2c0-.8.2-1.2 1.4-1.2H17V3.1C16.6 3 15.6 3 14.5 3 12 3 10.4 4.5 10.4 7v2H8v3.2h2.4V21H14v-8.8h2.5l.4-3.2H14Z"/></svg>' },
      { url: CFG.instagram, nombre: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/></svg>' },
      { url: CFG.tiktok, nombre: 'TikTok', svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.3 2 1.5 3.3 3.5 3.5V9c-1.3 0-2.5-.4-3.5-1.1v6.4c0 3.2-2.4 5.7-5.5 5.7S5.5 17.5 5.5 14.3c0-3 2.2-5.4 5.2-5.6v2.6c-1.5.2-2.6 1.4-2.6 3 0 1.7 1.3 3 2.9 3s2.9-1.3 2.9-3V3h2.6Z"/></svg>' }
    ].filter(function (r) { return r.url; });
    $('#socials').innerHTML = redes.map(function (r) {
      return '<a class="icon-btn sq" href="' + esc(r.url) + '" target="_blank" rel="noopener" aria-label="Ttoms en ' + r.nombre + '">' + r.svg + '</a>';
    }).join('') + WHATS.map(function (n) {
      return '<a class="icon-btn" href="' + waLink(n) + '" target="_blank" rel="noopener">' + WA_ICON + esc(waBonito(n)) + '</a>';
    }).join('');
    if (CFG.facebook) $('#fbTop').href = CFG.facebook; else $('#fbTop').hidden = true;
    if (CFG.instagram) $('#igTop').href = CFG.instagram; else $('#igTop').hidden = true;
  }

  // Identificación del proveedor en el pie (LPC art. 21-A).
  function pintarLegal() {
    var partes = [LEGAL.titular, LEGAL.documento ? 'NIT/DUI ' + LEGAL.documento : '', LEGAL.direccion, LEGAL.correo,
      LEGAL.registroDefensoria ? 'Registro DC ' + LEGAL.registroDefensoria : ''].filter(Boolean);
    var el = $('#idLegal'); if (el) el.textContent = partes.join(' · ');
  }

  /* ---------------- WhatsApp flotante ---------------- */
  function montarWhatsFlotante() {
    if (!WHATS.length) return;
    var box = $('#waFloat'), menu = $('#waMenu'), btn = $('#waBtn');
    var etiquetas = CFG.whatsappEtiquetas || [];
    box.hidden = false;
    var msg = function () { return 'Hola Ttoms, vengo de la página web. '; };
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (WHATS.length === 1) { window.open(waLink(WHATS[0], msg()), '_blank', 'noopener'); return; }
      menu.innerHTML = '<p>Escribinos por WhatsApp. Respondemos rápido.</p>' + WHATS.map(function (n, i) {
        return '<a href="' + waLink(n, msg()) + '" target="_blank" rel="noopener">' + WA_ICON +
          '<span>' + esc(waBonito(n)) + '<small>' + esc(etiquetas[i] || 'WhatsApp') + '</small></span></a>';
      }).join('');
      var abrir = menu.hidden; menu.hidden = !abrir; btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !box.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------------- contador de ventas ---------------- */
  async function pintarContador() {
    var sp = $('#statPuntos'); if (sp) sp.textContent = PUNTOS.length;
    var st = {}; try { st = await api.estadisticas(); } catch (e) { }
    var n = Math.max(Number(st.entregadas || 0), Number(st.vendidas || 0)) + Number(CFG.ventasPrevias || 0);
    var li = $('#statVentas'); if (!li) return;
    li.innerHTML = n > 0
      ? '<b>' + n + '</b><span>' + (n === 1 ? 'consola entregada' : 'consolas entregadas') + '</span>'
      : '<b>' + GARANTIA + ' días</b><span>de garantía</span>';
  }

  /* ---------------- enlaces directos ----------------
     /c/<consola>      abre la ficha de esa consola
     ?cuenta=correos   abre Mi cuenta en esa pestaña
     ?panel=ordenes    abre el panel de administrador
     ?chat=1 · ?resena=1 */
  var fichaDesdeCarga = false;
  function slugDeUrl() {
    var m = /^\/c\/([^\/?#]+)/.exec(location.pathname);
    if (m) return decodeURIComponent(m[1]);
    return new URLSearchParams(location.search).get('c');
  }
  function porSlug(x) { return productos.filter(function (p) { return p.slug === x || String(p.id) === x; })[0]; }
  function abrirDesdeUrl() {
    var s = slugDeUrl(), qs = new URLSearchParams(location.search);
    if (s) {
      var p = porSlug(s);
      if (p && (p.activo || esAdmin())) { fichaDesdeCarga = true; abrirFicha(p.id, { sinHistorial: true }); }
      else {
        history.replaceState(null, '', '/');
        toast('Esa consola ya se vendió. Mirá las que están disponibles.');
        setTimeout(function () { document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); }, 500);
      }
      return;
    }
    var cuenta = qs.get('cuenta'), pnl = qs.get('panel');
    if (cuenta) { if (perfil) abrirCuenta(cuenta); else abrirAuth('login', function () { abrirCuenta(cuenta); }, 'Ingresá para ver tu cuenta.'); }
    else if (pnl) abrirAdmin(pnl);
    else if (qs.get('chat')) { hiloActivo = null; abrirDock(); }
    else if (qs.get('resena')) abrirResena();
    else return;
    history.replaceState(null, '', '/');
  }
  function alNavegar(e) {
    var st = e.state || {};
    if (st.ficha) abrirFicha(st.ficha, { desdeHistorial: true });
    else if (panel && panel.dataset.ficha) cerrar(true);
  }

  function pintarEntregas() {
    var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>';
    $('#placeList').innerHTML = PUNTOS.map(function (p) { return '<li><i>' + pin + '</i><span>' + esc(p) + '</span></li>'; }).join('');
    $('#fueraTxt').textContent = FUERA;
    var ig = $('#igEntregas');
    if (CFG.instagram) { ig.href = CFG.instagram; ig.textContent = 'Ver entregas en ' + (CFG.instagramUsuario || 'Instagram'); }
    else ig.hidden = true;
  }

  /* ---------------- reseñas ---------------- */
  async function cargarResenas() {
    try { resenas = await api.resenas(); } catch (e) { resenas = []; }
    pintarResenas();
  }
  function pintarResenas() {
    var vis = resenas.filter(function (r) { return r.visible !== false; });
    var box = $('#scoreBox'), list = $('#reviewList');
    if (!vis.length) {
      box.innerHTML = '<span>Todavía no hay reseñas. Si ya nos compraste, la tuya sería la primera.</span>';
      list.innerHTML = '<div class="empty">Las reseñas aparecen aquí apenas alguien deja la suya.</div>';
      return;
    }
    var prom = vis.reduce(function (a, r) { return a + Number(r.estrellas); }, 0) / vis.length;
    var verif = vis.filter(function (r) { return r.verificada; }).length;
    box.innerHTML = '<b>' + prom.toFixed(1) + '</b>' + estrellas(Math.round(prom)) +
      '<span>' + vis.length + (vis.length === 1 ? ' reseña' : ' reseñas') + ' · ' + verif + ' con compra verificada</span>';
    list.innerHTML = vis.slice(0, 8).map(function (r) {
      return '<article class="review"><div class="review-top"><span class="avatar sm">' + esc(initials(r.nombre)) + '</span>' +
        '<strong>' + esc(r.nombre) + '</strong>' + (r.departamento ? '<span class="where">' + esc(r.departamento) + '</span>' : '') +
        '<span style="margin-left:auto">' + estrellas(r.estrellas) + '</span></div>' +
        '<p>' + esc(r.texto) + '</p>' +
        '<div class="review-top">' + (r.verificada ? '<span class="verif"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>COMPRA VERIFICADA</span>' : '') +
        '<span class="where" style="margin-left:auto">' + esc(fecha(r.creado_en)) + '</span></div></article>';
    }).join('');
  }
  function abrirResena() {
    if (!perfil) { abrirAuth('login', abrirResena, 'Ingresá para dejar tu reseña.'); return; }
    var mia = resenas.filter(function (r) { return r.user_id === perfil.id; })[0];
    var n = mia ? mia.estrellas : 5;
    cerrar(); velo();
    modal = document.createElement('div');
    modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Dejar reseña');
    var star = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>';
    modal.innerHTML = cab(mia ? 'Editar mi reseña' : 'Dejar mi reseña') +
      '<div class="panel-body"><form class="form-grid" id="rvForm" novalidate>' +
      '<div class="form-field full"><label>¿Cómo te fue?</label><div class="star-pick" id="rvStars" role="radiogroup" aria-label="Calificación">' +
      [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-s="' + i + '" aria-label="' + i + ' estrellas">' + star + '</button>'; }).join('') + '</div></div>' +
      '<div class="form-field full"><label for="rvText">Contanos tu experiencia</label>' +
      '<textarea id="rvText" rows="4" maxlength="600" placeholder="Cómo fue la entrega, el estado de la consola, la atención…">' + esc(mia ? mia.texto : '') + '</textarea>' +
      '<span class="hint">Se publica con tu nombre (' + esc(perfil.nombre) + ') y tu departamento.</span></div>' +
      '<div class="full" id="rvErr"></div>' +
      '<div class="form-field full"><button class="btn block" type="submit">Publicar reseña</button></div></form></div>';
    document.body.appendChild(modal);
    var pint = function () { $$('#rvStars button', modal).forEach(function (b) { b.classList.toggle('on', Number(b.dataset.s) <= n); }); };
    pint();
    $('#rvStars', modal).addEventListener('click', function (e) { var b = e.target.closest('button[data-s]'); if (b) { n = Number(b.dataset.s); pint(); } });
    $('#rvForm', modal).addEventListener('submit', async function (e) {
      e.preventDefault();
      var t = $('#rvText', modal).value.trim();
      if (t.length < 10) { $('#rvErr', modal).innerHTML = '<p class="err">Escribí al menos una oración (10 caracteres).</p>'; return; }
      var btn = $('button[type=submit]', this); busy(btn, true, 'Publicando…');
      try {
        await api.guardarResena({ user_id: perfil.id, nombre: perfil.nombre, departamento: perfil.departamento || null, estrellas: n, texto: t });
        cerrar(); toast('Gracias. Tu reseña ya está publicada.'); cargarResenas();
      } catch (err) { busy(btn, false); $('#rvErr', modal).innerHTML = '<p class="err">' + esc(traducir(err)) + '</p>'; }
    });
  }

  function pintarHeroVideo() {
    if (!CFG.heroVideo) return;
    var m = $('#heroMedia');
    m.innerHTML = '<video src="' + esc(CFG.heroVideo) + '"' + (CFG.heroPoster ? ' poster="' + esc(CFG.heroPoster) + '"' : '') + ' autoplay muted loop playsinline preload="metadata"></video>';
    m.hidden = false;
  }

  /* ---------------- catálogo ---------------- */
  var filtro = { q: '', cat: 'todas', grado: 'todas', orden: 'recientes' };
  var CATS = ['PlayStation', 'Xbox', 'Nintendo', 'Portátil', 'Retro', 'Accesorios'];
  var ICON_CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><circle cx="12" cy="12.5" r="3.2"/><path d="M8.5 6 10 4h4l1.5 2"/></svg>';
  var FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function visibles() { return productos.filter(function (p) { return p.activo || esAdmin(); }); }
  function cuantos(c) { return visibles().filter(function (p) { return c === 'todas' || p.categoria === c; }).length; }

  function montarTabs() {
    var w = $('#catTabs');
    ['todas'].concat(CATS).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.cat = c;
      b.setAttribute('aria-selected', c === 'todas' ? 'true' : 'false');
      w.appendChild(b);
    });
    w.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]'); if (!b) return;
      elegirCat(b.dataset.cat, false);
    });
    window.addEventListener('resize', function () { glide($('#catTabs'), $('#catGlide')); glide($('#howTabs'), $('#howGlide')); spy(); });
  }
  function elegirCat(c, bajar) {
    filtro.cat = c;
    $$('#catTabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.cat === c ? 'true' : 'false'); });
    glide($('#catTabs'), $('#catGlide'));
    render();
    if (bajar) document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Mueve la "pastilla" de color detrás de la pestaña activa.
  function glide(cont, pill) {
    if (!cont || !pill) return;
    var act = cont.querySelector('[aria-selected="true"], a.on');
    if (!act) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = act.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + act.offsetLeft + 'px)';
  }

  function pasa(p) {
    if (!p.activo && !esAdmin()) return false;
    if (filtro.cat !== 'todas' && p.categoria !== filtro.cat) return false;
    if (filtro.grado !== 'todas' && p.grado !== filtro.grado) return false;
    if (filtro.q) {
      var hay = [p.titulo, p.categoria, p.descripcion, (p.incluye || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(filtro.q.toLowerCase()) === -1) return false;
    }
    return true;
  }
  function tarjeta(p) {
    return '<button class="card" data-id="' + esc(p.id) + '" type="button">' +
      '<div class="thumb">' + media(p) +
      (!p.activo ? '<span class="tag off">Vendida</span>' : (esNueva(p) ? '<span class="tag">Nueva</span>' : '')) +
      '<span class="gbadge" data-g="' + esc(p.grado) + '" title="Grado ' + esc(p.grado) + '">' + esc(p.grado) + '</span>' +
      (fotosDe(p).length > 1 ? '<span class="photo-n">' + ICON_CAM + fotosDe(p).length + '</span>' : '') +
      '</div><div class="card-body"><h3>' + esc(p.titulo) + '</h3>' +
      '<span class="meta">' + esc(p.categoria) + ' · ' + esc(GRADO[p.grado] ? GRADO[p.grado].split(' · ')[1] : '') + '</span>' +
      '<div class="card-foot"><span class="price">' + money(p.precio) + '</span><span class="quick">' + FLECHA + '</span></div>' +
      '</div></button>';
  }
  function conVideo(root) {
    $$('.card video', root).forEach(function (v) {
      var card = v.closest('.card');
      card.addEventListener('mouseenter', function () { v.play().catch(function () { }); });
      card.addEventListener('mouseleave', function () { v.pause(); });
    });
  }
  function render() {
    var out = productos.filter(pasa);
    if (filtro.orden === 'baratas') out.sort(function (a, b) { return a.precio - b.precio; });
    else if (filtro.orden === 'caras') out.sort(function (a, b) { return b.precio - a.precio; });
    $('#grid').innerHTML = out.length ? out.map(tarjeta).join('')
      : '<div class="empty"><strong>' + (productos.length ? 'No hay consolas con esos filtros.' : 'Todavía no hay consolas publicadas.') + '</strong><br>' +
        (productos.length ? 'Probá otra categoría o quitá la búsqueda.' : (esAdmin() ? 'Abrí el Panel y publicá la primera.' : 'Activá las alertas y te avisamos cuando entren.')) + '</div>';
    $('#count').textContent = out.length + (out.length === 1 ? ' consola' : ' consolas');
    conVideo($('#grid'));
    $$('#catTabs button').forEach(function (b) {
      var c = b.dataset.cat;
      b.innerHTML = esc(c === 'todas' ? 'Todas' : c) + '<span class="c">' + cuantos(c) + '</span>';
    });
    glide($('#catTabs'), $('#catGlide'));
    pintarMosaico(); pintarDestacada(); pintarRiel();
  }

  function pintarMosaico() {
    $('#catTiles').innerHTML = CATS.map(function (c) {
      var n = cuantos(c);
      return '<button class="tile" type="button" data-c="' + esc(c) + '">' +
        '<div><h3>' + esc(c) + '</h3><span class="n">' + (n ? n + (n === 1 ? ' disponible' : ' disponibles') : 'Próximamente') + '</span></div>' +
        '<span class="art">' + ART[ART_CAT[c]] + '</span>' +
        '<span class="go">' + FLECHA + '</span></button>';
    }).join('');
  }
  function pintarDestacada() {
    var act = productos.filter(function (p) { return p.activo; });
    var box = $('#heroFeature');
    if (!act.length) {
      box.innerHTML = '<div class="feat" style="cursor:default"><span class="feat-badge">Próximamente</span>' +
        '<div class="ph">' + ART.consola + '</div><div class="info"><div><span class="tag-new">Inventario</span><h3>Estamos revisando consolas</h3></div></div></div>';
      return;
    }
    var p = act[0];
    box.innerHTML = '<button class="feat" type="button" data-id="' + esc(p.id) + '"><span class="feat-badge">Recién llegada</span>' +
      '<div class="ph">' + media(p, { auto: true }) + '</div>' +
      '<div class="info"><div><span class="tag-new">Grado ' + esc(p.grado) + ' · ' + esc(p.categoria) + '</span><h3>' + esc(p.titulo) + '</h3></div>' +
      '<span class="p">' + money(p.precio) + '</span></div></button>';
  }
  function pintarRiel() {
    var act = productos.filter(function (p) { return p.activo; }).slice(0, 10);
    $('#nuevas').hidden = act.length < 1;
    $('#newRail').innerHTML = act.map(tarjeta).join('');
    conVideo($('#newRail'));
  }

  /* ---------------- decoración animada ---------------- */
  function pintarCintas() {
    var avisos = CFG.anuncios || ['Entregas en ' + PUNTOS.length + ' puntos de San Salvador', 'Probás antes de pagar', 'Te compramos tu consola', 'Apartar no cuesta nada', 'Garantía de 15 días'];
    var t = avisos.map(function (a) { return '<span>' + esc(a) + '</span>'; }).join('');
    $('#ticker').innerHTML = t + t;
    var ic = {
      ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.1 8.2 7.5 9 4.4-.8 7.5-4.6 7.5-9V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
      bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/></svg>',
      chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.2A8.5 8.5 0 1 1 21 11.5Z"/></svg>'
    };
    var b = [[ic.ok, 'Revisadas una por una'], [ic.bolt, 'Probadas frente a vos'], [ic.pin, 'Puntos seguros en San Salvador'], [ic.chat, 'Te respondemos por chat'], [ic.ok, 'Grado honesto']]
      .map(function (x) { return '<span>' + x[0] + esc(x[1]) + '</span>'; }).join('');
    $('#belt').innerHTML = b + b;
    var arts = [ART.control, ART.portatil, ART.retro, ART.consola, ART.control, ART.portatil];
    var pos = [[6, 12, 90], [78, 8, 120], [62, 62, 80], [14, 70, 110], [40, 30, 60], [88, 72, 70]];
    $('#floaters').innerHTML = arts.map(function (a, i) {
      var p = pos[i];
      return a.replace('<svg ', '<svg style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[2] + 'px;--d:' + (18 + i * 3) + 's;--x:' + (i % 2 ? -30 : 26) + 'px;--y:' + (i % 3 ? -24 : 30) + 'px;--r0:' + (-10 + i * 4) + 'deg;--r1:' + (8 - i * 3) + 'deg" ');
    }).join('');
  }

  /* ---------------- navegación con pestañas ---------------- */
  function spy() {
    var ids = ['catalogo', 'vender', 'entregas', 'resenas', 'faq'];
    var y = window.scrollY + 140, cur = 'top', mejor = -1;
    ids.concat(['consolas', 'nuevas', 'grados', 'como']).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.hidden && el.offsetTop <= y && el.offsetTop > mejor) { mejor = el.offsetTop; cur = id; }
    });
    if (cur === 'nuevas' || cur === 'grados') cur = 'catalogo';
    var arriba = ids.indexOf(cur) === -1 ? (cur === 'top' ? null : (cur === 'como' ? 'vender' : 'catalogo')) : cur;
    $$('#nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.spy === arriba); });
    glide($('#nav'), $('#navGlide'));
    var abajo = cur === 'vender' || cur === 'como' ? 'vender' : (cur === 'top' || cur === 'consolas' ? 'top' : 'catalogo');
    $$('#bottomNav a').forEach(function (a) { a.classList.toggle('on', a.dataset.spy === abajo); });
  }

  function esNueva(p) {
    if (!p.creado_en) return false;
    return (Date.now() - new Date(p.creado_en).getTime()) < 1000 * 60 * 60 * 24 * 7;
  }
  function porId(id) { return productos.filter(function (p) { return String(p.id) === String(id); })[0]; }

  /* ---------------- overlays ---------------- */
  var scrim = null, panel = null, modal = null;
  // desdeHistorial = true cuando lo dispara el botón "atrás" del navegador.
  function cerrar(desdeHistorial) {
    var eraFicha = !!(panel && panel.dataset.ficha);
    if (panel) { panel.remove(); panel = null; }
    if (modal) { modal.remove(); modal = null; }
    if (scrim) { scrim.remove(); scrim = null; }
    document.body.classList.remove('overlay-open');
    if (eraFicha) {
      document.title = TITULO;
      if (desdeHistorial !== true) {
        if (history.state && history.state.ficha && !fichaDesdeCarga) history.back();
        else history.replaceState(null, '', '/');
      }
      fichaDesdeCarga = false;
    }
  }
  function velo() {
    document.body.classList.add('overlay-open');
    if (scrim) return;
    scrim = document.createElement('button');
    scrim.className = 'scrim'; scrim.setAttribute('aria-label', 'Cerrar');
    scrim.addEventListener('click', cerrar);
    document.body.appendChild(scrim);
  }
  function cab(t, extra) {
    return '<div class="panel-head">' + (extra || '') + '<h2>' + esc(t) + '</h2>' +
      '<button class="close" type="button" data-x="1" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
  }

  /* ---------------- ficha de producto ---------------- */
  function abrirFicha(id, opts) {
    opts = opts || {};
    var p = porId(id); if (!p) return;
    cerrar(opts.desdeHistorial || opts.sinHistorial ? true : undefined); velo();
    panel = document.createElement('aside');
    panel.className = 'panel'; panel.dataset.ficha = p.id;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', p.titulo);
    var msgWa = 'Hola, quiero comprar ' + p.titulo + ' (' + money(p.precio) + '). ¿Cuándo nos podemos ver? ' + linkDe(p);
    var escudo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.1 8.2 7.5 9 4.4-.8 7.5-4.6 7.5-9V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10" stroke-linecap="round"/></svg>';
    panel.innerHTML = cab(p.titulo) +
      '<div class="panel-body">' + galeria(p) +
      (!p.activo ? '<div class="sold-banner">Esta consola ya se vendió.</div>' : '') +
      '<div><div style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap">' +
      '<span class="price" style="font-size:27px">' + money(p.precio) + '</span>' +
      '<span class="grade" data-g="' + esc(p.grado) + '">' + esc(GRADO[p.grado] || p.grado) + '</span></div>' +
      '<p style="margin-top:12px; color:var(--ink-2); font-size:15px; white-space:pre-line">' + esc(p.descripcion) + '</p></div>' +
      '<dl class="kv">' +
      '<dt>Incluye</dt><dd>' + (p.incluye || []).map(esc).join(' · ') + '</dd>' +
      (p.serie ? '<dt>Serie</dt><dd>' + esc(p.serie) + '</dd>' : '') +
      '<dt>Entrega</dt><dd>En persona en San Salvador: ' + PUNTOS.map(esc).join(', ') + '</dd>' +
      '<dt>Fuera de SS</dt><dd>' + (p.envio ? 'Se coordina por WhatsApp' : 'Solo entrega en persona en San Salvador') + '</dd>' +
      '<dt>Garantía</dt><dd>' + GARANTIA + ' días por fallas de encendido, lectora y controles</dd>' +
      '</dl>' +
      '<div class="trust">' + escudo + '<div><strong>Procedencia verificada</strong>' +
      '<span>La compramos con acta firmada y DUI del dueño anterior. Al comprarla te damos un comprobante con su número de serie. <a href="/procedencia.html" target="_blank" rel="noopener">Cómo lo hacemos</a></span></div></div>' +
      '<div class="seller"><span class="avatar">TT</span><div style="min-width:0">' +
      '<div style="font-family:var(--display); font-weight:500">' + esc(CFG.marca || 'Ttoms') + '</div>' +
      '<div style="font-size:13px; color:var(--ink-2)">' + esc(CFG.ciudad || '') + resumenResenas() + '</div></div>' +
      (CFG.instagram ? '<a class="btn ghost xs" style="margin-left:auto" href="' + esc(CFG.instagram) + '" target="_blank" rel="noopener">' + esc(CFG.instagramUsuario || 'Instagram') + '</a>' : '') + '</div>' +
      '<div class="share-row">' +
      '<button class="btn ghost sm" type="button" data-act="share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4"/></svg>Compartir</button>' +
      '<button class="btn ghost sm" type="button" data-act="copy">Copiar enlace</button>' +
      '<button class="btn ghost sm" type="button" data-act="chat">Preguntar por chat</button></div>' +
      '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.1 8.2 7.5 9 4.4-.8 7.5-4.6 7.5-9V6L12 3Z"/></svg>' +
      '<span>No pagás nada por adelantado: en la entrega la encendés, la probás y pagás si estás conforme.</span></div>' +
      '</div>' +
      '<div class="panel-foot">' + (p.activo ? '<div class="buy-row">' +
        (WHATS.length ? '<a class="btn wa" href="' + waLink(WHATS[0], msgWa) + '" target="_blank" rel="noopener">' + WA_ICON + 'Comprar por WhatsApp</a>' : '') +
        '<button class="btn" type="button" data-act="buy">Comprar aquí</button></div>'
        : '<button class="btn block" type="button" data-act="more">Ver consolas disponibles</button>') + '</div>';
    document.body.appendChild(panel);
    if (!opts.desdeHistorial) {
      var url = '/c/' + encodeURIComponent(p.slug || p.id);
      if (opts.sinHistorial) history.replaceState({ ficha: p.id }, '', url);
      else if (location.pathname !== url) history.pushState({ ficha: p.id }, '', url);
    }
    document.title = p.titulo + ' · ' + money(p.precio) + ' · ' + (CFG.marca || 'Ttoms');
    montarGaleria(panel, p);
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || !panel || !panel.contains(b)) return;
      var a = b.dataset.act;
      if (a === 'share') compartir(p);
      else if (a === 'copy') copiar(linkDe(p), 'Enlace copiado. Pegalo en WhatsApp, Instagram o donde querás.');
      else if (a === 'chat') { cerrar(); abrirHilo(p.id); }
      else if (a === 'buy') abrirCompra(p.id);
      else if (a === 'more') { cerrar(); document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); }
    });
  }
  function compartir(p) {
    var url = linkDe(p), t = p.titulo + ' · ' + money(p.precio);
    if (navigator.share) navigator.share({ title: t, text: t + ' en ' + (CFG.marca || 'Ttoms'), url: url }).catch(function () { });
    else copiar(url, 'Enlace copiado. Pegalo en WhatsApp o Instagram.');
  }

  /* ---------------- galería de fotos ---------------- */
  function itemsGaleria(p) {
    var items = fotosDe(p).map(function (u) { return { t: 'img', u: u }; });
    if (p.video_url) items.push({ t: 'vid', u: p.video_url });
    return items;
  }
  function galeria(p) {
    var items = itemsGaleria(p);
    if (!items.length) return '<div class="shot">' + ART[ART_CAT[p.categoria] || 'consola'] + '</div>';
    var nav = function (dir) {
      return '<button class="gal-nav ' + dir + '" type="button" aria-label="' + (dir === 'next' ? 'Siguiente foto' : 'Foto anterior') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + (dir === 'next' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6') + '"/></svg></button>';
    };
    return '<div class="gal"><div class="gal-main"><div class="gal-track">' +
      items.map(function (it, i) {
        return '<button type="button" class="gal-slide" data-i="' + i + '" aria-label="Ver en grande (' + (i + 1) + ' de ' + items.length + ')">' +
          (it.t === 'img' ? '<img src="' + esc(it.u) + '" alt="' + esc(p.titulo) + ', foto ' + (i + 1) + '"' + (i ? ' loading="lazy"' : '') + '>'
            : '<video src="' + esc(it.u) + '" muted loop playsinline autoplay preload="metadata"></video>') + '</button>';
      }).join('') + '</div>' +
      (items.length > 1 ? nav('prev') + nav('next') + '<span class="gal-count">1 / ' + items.length + '</span>' : '') + '</div>' +
      (items.length > 1 ? '<div class="gal-thumbs">' + items.map(function (it, i) {
        return '<button type="button" data-i="' + i + '" class="' + (i ? '' : 'on') + '" aria-label="Foto ' + (i + 1) + '">' +
          (it.t === 'img' ? '<img src="' + esc(it.u) + '" alt="" loading="lazy">' : '<span class="vid"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>') + '</button>';
      }).join('') + '</div>' : '') + '</div>';
  }
  function montarGaleria(root, p) {
    var track = $('.gal-track', root); if (!track) return;
    var n = track.children.length, cont = $('.gal-count', root);
    var actual = function () { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); };
    var ir = function (i) { i = (i + n) % n; track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); };
    track.addEventListener('scroll', function () {
      var i = actual();
      if (cont) cont.textContent = (i + 1) + ' / ' + n;
      $$('.gal-thumbs button', root).forEach(function (b, k) { b.classList.toggle('on', k === i); });
    }, { passive: true });
    $('.gal', root).addEventListener('click', function (e) {
      var nv = e.target.closest('.gal-nav'); if (nv) { ir(actual() + (nv.classList.contains('next') ? 1 : -1)); return; }
      var th = e.target.closest('.gal-thumbs button'); if (th) { ir(Number(th.dataset.i)); return; }
      var sl = e.target.closest('.gal-slide'); if (sl) visor(p, Number(sl.dataset.i));
    });
  }
  // Visor a pantalla completa: se desliza con el dedo o con las flechas.
  function visor(p, inicio) {
    var items = itemsGaleria(p);
    var lb = document.createElement('div');
    lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Fotos de ' + p.titulo);
    lb.innerHTML = '<div class="lb-track">' + items.map(function (it, i) {
      return '<div class="lb-slide">' + (it.t === 'img' ? '<img src="' + esc(it.u) + '" alt="' + esc(p.titulo) + ', foto ' + (i + 1) + '">'
        : '<video src="' + esc(it.u) + '" controls playsinline autoplay muted loop></video>') + '</div>';
    }).join('') + '</div>' +
      '<div class="lb-bar"><span id="lbN">' + (inicio + 1) + ' / ' + items.length + '</span>' +
      '<button class="close" type="button" data-lb="x" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
    document.body.appendChild(lb);
    var tr = $('.lb-track', lb);
    tr.scrollLeft = inicio * tr.clientWidth;
    tr.addEventListener('scroll', function () { $('#lbN', lb).textContent = (Math.round(tr.scrollLeft / tr.clientWidth) + 1) + ' / ' + items.length; }, { passive: true });
    lb.addEventListener('click', function (e) { if (e.target.closest('[data-lb]') || e.target.classList.contains('lb-slide')) lb.remove(); });
  }

  async function pintarBanco(box, codigo) {
    if (!box) return;
    var b = null;
    try { b = await api.banco(); } catch (e) { }
    if (!b) { box.innerHTML = '<p class="hint">Te pasamos la cuenta por el chat.</p>'; return; }
    box.innerHTML = '<div class="bank">' +
      '<p class="eyebrow">Datos para transferir</p>' +
      '<dl class="kv" style="margin-top:10px">' +
      '<dt>Banco</dt><dd>' + esc(b.banco) + '</dd>' +
      '<dt>Tipo</dt><dd>' + esc(b.tipo) + '</dd>' +
      '<dt>Número</dt><dd><b class="mono" style="font-size:17px">' + esc(b.numero) + '</b> <button class="btn xs ghost" type="button" id="copyCuenta">Copiar</button></dd>' +
      '<dt>A nombre de</dt><dd>' + esc(b.titular) + '</dd>' +
      '<dt>Concepto</dt><dd class="mono">' + esc(codigo) + '</dd></dl>' +
      '<p class="hint" style="margin-top:10px">Poné el número de orden en el concepto y mandanos la foto del comprobante por el chat.</p></div>';
    $('#copyCuenta', box).addEventListener('click', function () {
      var t = String(b.numero);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Número de cuenta copiado.'); }, function () { window.prompt('Copiá el número:', t); });
    });
  }

  function resumenResenas() {
    var vis = resenas.filter(function (r) { return r.visible !== false; });
    if (!vis.length) return '';
    var prom = vis.reduce(function (a, r) { return a + Number(r.estrellas); }, 0) / vis.length;
    return ' · ' + prom.toFixed(1) + ' ★ en ' + vis.length + (vis.length === 1 ? ' reseña' : ' reseñas');
  }

  /* ---------------- compra directa ---------------- */
  function abrirCompra(id) {
    var p = porId(id); if (!p) return;
    if (!perfil) {
      abrirAuth('login', function () { abrirCompra(id); },
        'Ingresá o creá tu cuenta para confirmar la compra en la web. ¿Sin cuenta? Cerrá esto y tocá “Comprar por WhatsApp”.');
      return;
    }
    var pagos = CFG.pagos || {};
    var dentro = (perfil && perfil.departamento) ? perfil.departamento === 'San Salvador' : true;
    cerrar(); velo();
    modal = document.createElement('div');
    modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Comprar ' + p.titulo);

    var metodos = '';
    if (pagos.efectivo !== false) metodos += opt('pay', 'efectivo', 'Efectivo al recibirla', 'La probás y pagás ahí mismo', true);
    if (pagos.transferencia !== false) metodos += opt('pay', 'transferencia', 'Transferencia bancaria', 'La hacés en la entrega, después de probarla', pagos.efectivo === false);
    if (pagos.tarjeta) metodos += opt('pay', 'tarjeta', 'Tarjeta', 'Visa, Mastercard y American Express', false);

    modal.innerHTML = cab('Comprar consola') +
      '<div class="panel-body" id="coBody">' +
      '<div class="row-item"><span class="mini">' + media(p, { video: false }) + '</span>' +
      '<span class="grow"><strong>' + esc(p.titulo) + '</strong><span class="sub">Grado ' + esc(p.grado) + ' · garantía de ' + GARANTIA + ' días</span></span>' +
      '<span class="mono">' + money(p.precio) + '</span></div>' +
      '<div class="form-grid"><div class="form-field full"><label for="coTel">Tu WhatsApp</label>' +
      '<input id="coTel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="7000-0000" value="' + esc(perfil.telefono ? telBonito(perfil.telefono) : '') + '">' +
      '<span class="hint">Te escribimos a este número para acordar la hora de la entrega.</span></div></div>' +
      '<div><p class="eyebrow" style="margin-bottom:9px">Entrega</p><div class="opts">' +
      opt('ship', 'punto', 'En San Salvador', 'Nos vemos en uno de nuestros puntos, sin costo', dentro, 'Gratis') +
      '<div class="form-field" id="puntoBox"><label for="coPunto">Punto de entrega</label><select id="coPunto">' +
      PUNTOS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
      (p.envio ? opt('ship', 'fuera', 'Fuera de San Salvador', FUERA, !dentro, 'Se acuerda') : '') +
      '</div></div>' +
      '<div><p class="eyebrow" style="margin-bottom:9px">Cómo vas a pagar</p><div class="opts">' + metodos + '</div></div>' +
      '<div class="form-grid"><div class="form-field full"><label for="coNota">¿Qué día y hora te queda bien?</label>' +
      '<input id="coNota" placeholder="Ej. hoy después de las 5, o sábado en la mañana"></div></div>' +
      '<div class="total">' +
      '<div class="row"><span>Consola</span><span>' + money(p.precio) + '</span></div>' +
      '<div class="row"><span>Entrega</span><span id="coShip">Gratis</span></div>' +
      '<div class="row big"><span>Total a pagar al recibirla</span><span id="coTotal">' + money(p.precio) + '</span></div></div>' +
      '<label class="check" id="coTermsBox"><input type="checkbox" id="coTerms"><span>Acepto los <a href="/terminos.html" target="_blank" rel="noopener">términos y condiciones</a> y la <a href="/terminos.html#garantia" target="_blank" rel="noopener">garantía de ' + GARANTIA + ' días</a>.</span></label>' +
      '<div id="coErr"></div>' +
      '</div>' +
      '<div class="panel-foot"><button class="btn block" type="button" id="payBtn">Confirmar compra · ' + money(p.precio) + '</button></div>';
    document.body.appendChild(modal);

    function recalc() {
      var sEl = modal.querySelector('input[name="ship"]:checked');
      var entrega = sEl ? sEl.value : 'punto';
      var m = modal.querySelector('input[name="pay"]:checked');
      $('#puntoBox', modal).hidden = entrega !== 'punto';
      $('#coShip', modal).textContent = entrega === 'punto' ? 'Gratis' : 'Se acuerda por WhatsApp';
      $('#coTotal', modal).textContent = money(p.precio) + (entrega === 'punto' ? '' : ' + envío');
      return { pago: m ? m.value : 'efectivo', entrega: entrega,
        punto: entrega === 'punto' ? $('#coPunto', modal).value : ('Fuera de San Salvador' + (perfil && perfil.departamento ? ' · ' + perfil.departamento : '')) };
    }
    modal.addEventListener('change', recalc); recalc();

    $('#payBtn', modal).addEventListener('click', async function () {
      var r = recalc(), btn = this, err = $('#coErr', modal);
      var tel = telOk($('#coTel', modal).value);
      if (!tel) { err.innerHTML = '<p class="err">Escribí tu número de WhatsApp (8 dígitos) para poder coordinar la entrega.</p>'; $('#coTel', modal).focus(); return; }
      if (!$('#coTerms', modal).checked) { $('#coTermsBox', modal).classList.add('bad'); err.innerHTML = '<p class="err">Marcá la casilla de términos para confirmar.</p>'; return; }
      err.innerHTML = '';
      busy(btn, true, 'Confirmando…');
      var codigo = 'TT-' + Math.floor(100000 + Math.random() * 899999), orden;
      try {
        orden = await api.crearOrden({
          codigo: codigo, user_id: perfil.id, correo: perfil.correo, nombre_cliente: perfil.nombre,
          producto_id: p.id, titulo_producto: p.titulo, monto: p.precio, metodo_pago: r.pago,
          metodo_entrega: r.entrega, punto_entrega: r.punto, telefono: tel,
          nota: $('#coNota', modal).value.trim(), estado: 'pendiente'
        });
      } catch (e) { busy(btn, false); err.innerHTML = '<p class="err">' + esc(traducir(e)) + '</p>'; return; }
      if (perfil.telefono !== tel) { try { await api.guardarPerfil({ telefono: tel }); } catch (e) { } }
      api.notificar('orden', { id: orden.id }).catch(function () { });

      var total = orden && orden.monto != null ? orden.monto : p.precio;
      var msg = 'Hola, confirmé el pedido ' + codigo + ' de ' + p.titulo + ' (' + money(total) + '). ' +
        (r.entrega === 'punto' ? 'Me queda bien ' + r.punto + (($('#coNota', modal).value.trim()) ? ', ' + $('#coNota', modal).value.trim() : '') + '.' : 'Estoy fuera de San Salvador' + (perfil.departamento ? ', en ' + perfil.departamento : '') + '.');
      $('#coBody', modal).innerHTML =
        '<div class="success"><div class="ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div>' +
        '<h3 style="font-size:21px">¡Pedido confirmado!</h3>' +
        '<p style="color:var(--ink-2); margin-top:8px; font-size:15px">Te escribimos hoy por WhatsApp al <b>' + esc(telBonito(tel)) + '</b> para acordar la entrega. También te mandamos la confirmación a <b>' + esc(perfil.correo) + '</b>.</p>' +
        '<p class="mono" style="margin-top:14px; font-size:13px; color:var(--accent)">Pedido ' + esc(codigo) + ' · ' + money(total) + '</p></div>' +
        '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5" stroke-linecap="round"/></svg>' +
        '<span>Al entregártela te damos el comprobante con el número de serie y la garantía. Lo podés ver en cualquier momento en <a href="/comprobante.html?o=' + encodeURIComponent(codigo) + '" target="_blank" rel="noopener">tu comprobante</a> o en Mi cuenta → Mis compras.</span></div>' +
        (r.pago === 'transferencia' ? '<div id="bancoBox"><div class="skeleton" style="height:120px"></div></div>' : '');
      if (r.pago === 'transferencia') pintarBanco($('#bancoBox', modal), codigo);
      $('.panel-foot', modal).innerHTML = WHATS.length
        ? '<a class="btn wa block" href="' + waLink(WHATS[0], msg) + '" target="_blank" rel="noopener">' + WA_ICON + 'Escribirnos ahora por WhatsApp</a>'
        : '<button class="btn block" type="button" data-x="1">Listo</button>';
      productos = await api.productos().catch(function () { return productos; }); render();
      toast('Pedido ' + codigo + ' confirmado.');
    });
  }
  function opt(name, val, titulo, sub, checked, amt, cost) {
    return '<label class="opt"><input type="radio" name="' + name + '" value="' + val + '"' +
      (cost != null ? ' data-cost="' + cost + '"' : '') + (checked ? ' checked' : '') + '>' +
      '<span><strong>' + esc(titulo) + '</strong><span>' + esc(sub) + '</span></span>' +
      (amt ? '<span class="amt">' + esc(amt) + '</span>' : '') + '</label>';
  }

  /* ---------------- autenticación ---------------- */
  var trasAuth = null;
  function abrirAuth(vista, despues, porque) {
    trasAuth = despues || null;
    cerrar(); velo();
    modal = document.createElement('div');
    modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Cuenta');
    modal.innerHTML = cab('Tu cuenta ' + (CFG.marca || 'Ttoms')) +
      '<div class="tabs" id="authTabs">' +
      '<button type="button" data-v="login">Ingresar</button>' +
      '<button type="button" data-v="signup">Crear cuenta</button>' +
      '<button type="button" data-v="reset">Olvidé mi contraseña</button></div>' +
      '<div class="panel-body" id="authBody"></div>';
    document.body.appendChild(modal);
    $('#authTabs', modal).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (b) pintarAuth(b.dataset.v);
    });
    pintarAuth(vista || 'login', porque);
  }

  function pintarAuth(vista, porque) {
    $$('#authTabs button', modal).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.v === vista ? 'true' : 'false'); });
    var body = $('#authBody', modal);
    var aviso = porque ? '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg><span>' + esc(porque) + '</span></div>' : '';

    if (vista === 'login') {
      body.innerHTML = aviso +
        '<form class="form-grid" id="loginForm" novalidate>' +
        '<div class="form-field full"><label for="liEmail">Correo</label><input id="liEmail" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com"></div>' +
        '<div class="form-field full"><label for="liPass">Contraseña</label><input id="liPass" type="password" autocomplete="current-password"></div>' +
        '<div class="full" id="liErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Ingresar</button></div></form>' +
        (HAS_DB ? '' : '<div class="note warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>' +
          '<span>Demostración — administrador: <b class="mono">admin@ttoms.com</b> / <b class="mono">ttoms2026</b> · comprador: <b class="mono">comprador@ttoms.com</b> / <b class="mono">comprar2026</b></span></div>');
      $('#loginForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = $('button[type=submit]', this);
        busy(btn, true, 'Ingresando…');
        try {
          await api.ingresar($('#liEmail', modal).value.trim(), $('#liPass', modal).value);
          productos = await api.productos(); mensajes = await api.mensajes();
          refrescarCuenta(); refrescarBadge(); cerrar();
          toast('Hola, ' + String(perfil.nombre || '').split(' ')[0] + '. Sesión iniciada.');
          if (trasAuth) { var f = trasAuth; trasAuth = null; f(); }
        } catch (err) {
          busy(btn, false);
          $('#liErr', modal).innerHTML = '<p class="err">' + esc(traducir(err)) + '</p>';
        }
      });
    }

    else if (vista === 'signup') {
      body.innerHTML = aviso +
        '<form class="form-grid" id="signupForm" novalidate>' +
        '<div class="form-field"><label for="suName">Tu nombre</label><input id="suName" autocomplete="given-name" placeholder="Ej. Carlos"></div>' +
        '<div class="form-field"><label for="suFull">Nombre completo (opcional)</label><input id="suFull" autocomplete="name"></div>' +
        '<div class="form-field"><label for="suDepto">Departamento donde estás</label><select id="suDepto">' + deptoOpts('San Salvador') + '</select></div>' +
        '<div class="form-field"><label for="suEmail">Correo</label><input id="suEmail" type="email" autocomplete="email"></div>' +
        '<div class="form-field"><label for="suPass">Contraseña</label><input id="suPass" type="password" autocomplete="new-password">' +
        '<span class="strength"><i id="suBar"></i></span><span class="hint" id="suHint">Al menos 8 caracteres, con letras y números.</span></div>' +
        '<div class="form-field"><label for="suPass2">Repetí la contraseña</label><input id="suPass2" type="password" autocomplete="new-password"></div>' +
        '<div class="full"><label class="switch-row"><span class="switch"><input type="checkbox" id="suAlert" checked><span class="track"></span><span class="knob"></span></span>' +
        '<span class="grow"><strong>Quiero alertas por correo</strong><span>Un aviso cuando entre consola nueva o baje de precio algo del catálogo.</span></span></label></div>' +
        '<div class="full"><label class="check" id="suTermsBox"><input type="checkbox" id="suTerms"><span>Acepto los <a href="/terminos.html" target="_blank" rel="noopener">términos y condiciones</a> y autorizo el uso de mis datos según la <a href="/privacidad.html" target="_blank" rel="noopener">política de privacidad</a>.</span></label></div>' +
        '<div class="full" id="suErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Crear mi cuenta</button></div></form>';
      $('#suPass', modal).addEventListener('input', function () { fuerza(this.value, $('#suBar', modal), $('#suHint', modal)); });
      $('#signupForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var nombre = $('#suName', modal).value.trim(), correo = $('#suEmail', modal).value.trim();
        var p1 = $('#suPass', modal).value, p2 = $('#suPass2', modal).value, err = '';
        if (nombre.length < 2) err = 'Escribí tu nombre.';
        else if (!validEmail(correo)) err = 'Ese correo no parece válido.';
        else if (!passOk(p1)) err = 'La contraseña necesita al menos 8 caracteres, con letras y números.';
        else if (p1 !== p2) err = 'Las dos contraseñas no coinciden.';
        else if (!$('#suTerms', modal).checked) { err = 'Para crear la cuenta tenés que aceptar los términos y la política de privacidad.'; $('#suTermsBox', modal).classList.add('bad'); }
        if (err) { $('#suErr', modal).innerHTML = '<p class="err">' + esc(err) + '</p>'; return; }
        var alertas = $('#suAlert', modal).checked;
        var btn = $('button[type=submit]', this); busy(btn, true, 'Creando cuenta…');
        try {
          var r = await api.registrar({
            nombre: nombre, correo: correo, pass: p1,
            nombre_completo: $('#suFull', modal).value.trim(), departamento: $('#suDepto', modal).value,
            alertas: { nuevas: alertas, bajadas: alertas, ofertas: true, resumen: false, frecuencia: 'inmediato', acepto_terminos: new Date().toISOString() }
          });
          if (r.pendiente) {
            busy(btn, false);
            body.innerHTML = '<div class="success"><div class="ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 7h18v10H3z"/><path d="m3 8 9 6 9-6" stroke-linecap="round"/></svg></div>' +
              '<h3 style="font-size:19px">Revisá tu correo</h3><p style="color:var(--ink-2); margin-top:8px">Te mandamos un enlace a <b>' + esc(correo) + '</b> para confirmar la cuenta. Después de confirmarla vas a poder ingresar.</p></div>';
            return;
          }
          refrescarCuenta(); cerrar(); toast('Cuenta creada. ¡Bienvenido!');
          if (trasAuth) { var f = trasAuth; trasAuth = null; f(); }
        } catch (err2) { busy(btn, false); $('#suErr', modal).innerHTML = '<p class="err">' + esc(traducir(err2)) + '</p>'; }
      });
    }

    else {
      body.innerHTML =
        '<p style="color:var(--ink-2); font-size:15px">Escribí el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.</p>' +
        '<form class="form-grid" id="resetForm" novalidate>' +
        '<div class="form-field full"><label for="rsEmail">Correo de la cuenta</label><input id="rsEmail" type="email" autocomplete="email"></div>' +
        '<div class="full" id="rsErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Enviar enlace de recuperación</button></div></form>';
      $('#resetForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var correo = $('#rsEmail', modal).value.trim();
        if (!validEmail(correo)) { $('#rsErr', modal).innerHTML = '<p class="err">Ese correo no parece válido.</p>'; return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Enviando…');
        try { await api.recuperar(correo); } catch (err) { }
        busy(btn, false);
        body.innerHTML = '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7h18v10H3z"/><path d="m3 8 9 6 9-6" stroke-linecap="round"/></svg>' +
          '<span>Si <b>' + esc(correo) + '</b> tiene una cuenta con nosotros, va a recibir el enlace en unos minutos. Revisá también la carpeta de spam.</span></div>' +
          '<p class="hint">Por seguridad no confirmamos si un correo está registrado o no.</p>';
      });
    }
  }

  function abrirNuevaClave() {
    cerrar(); velo();
    modal = document.createElement('div');
    modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Contraseña nueva');
    modal.innerHTML = cab('Creá tu contraseña nueva') +
      '<div class="panel-body"><form class="form-grid" id="npForm" novalidate>' +
      '<div class="form-field full"><label for="npPass">Contraseña nueva</label><input id="npPass" type="password" autocomplete="new-password">' +
      '<span class="strength"><i id="npBar"></i></span><span class="hint" id="npHint">Al menos 8 caracteres, con letras y números.</span></div>' +
      '<div class="form-field full"><label for="npPass2">Repetila</label><input id="npPass2" type="password" autocomplete="new-password"></div>' +
      '<div class="full" id="npErr"></div>' +
      '<div class="form-field full"><button class="btn block" type="submit">Guardar contraseña</button></div></form></div>';
    document.body.appendChild(modal);
    $('#npPass', modal).addEventListener('input', function () { fuerza(this.value, $('#npBar', modal), $('#npHint', modal)); });
    $('#npForm', modal).addEventListener('submit', async function (e) {
      e.preventDefault();
      var p1 = $('#npPass', modal).value, p2 = $('#npPass2', modal).value, err = '';
      if (!passOk(p1)) err = 'La contraseña necesita al menos 8 caracteres, con letras y números.';
      else if (p1 !== p2) err = 'Las dos contraseñas no coinciden.';
      if (err) { $('#npErr', modal).innerHTML = '<p class="err">' + esc(err) + '</p>'; return; }
      var btn = $('button[type=submit]', this); busy(btn, true, 'Guardando…');
      try { await api.cambiarClave(p1); cerrar(); toast('Contraseña actualizada.'); }
      catch (e2) { busy(btn, false); $('#npErr', modal).innerHTML = '<p class="err">' + esc(traducir(e2)) + '</p>'; }
    });
  }

  function fuerza(p, bar, hint) {
    var s = 0;
    if (p.length >= 8) s++;
    if (/[a-zA-Z]/.test(p) && /\d/.test(p)) s++;
    if (p.length >= 12) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    bar.style.width = [0, 30, 55, 80, 100][s] + '%';
    bar.style.background = s <= 1 ? 'var(--bad)' : (s === 2 ? 'var(--signal)' : 'var(--ok)');
    hint.textContent = s <= 1 ? 'Débil: usá al menos 8 caracteres, con letras y números.'
      : (s === 2 ? 'Aceptable: sumá más caracteres o un símbolo.' : 'Buena contraseña.');
  }
  function traducir(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/User already registered|already exists/i.test(m)) return 'Ya existe una cuenta con ese correo. Probá ingresar.';
    if (/Email not confirmed/i.test(m)) return 'Todavía no confirmaste tu correo. Revisá el enlace que te enviamos.';
    if (/Password should be/i.test(m)) return 'La contraseña es muy corta.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Esperá un minuto.';
    if (/row-level security|violates|permission denied/i.test(m)) return 'Tu sesión no tiene permiso para esto. Cerrá sesión y volvé a entrar';
    if (/Payload too large|exceeded the maximum/i.test(m)) return 'La foto pesa demasiado (máx. 5 MB)';
    if (/mime type|not supported/i.test(m)) return 'Ese formato de foto no se acepta; usá JPG o PNG';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisá tu internet e intentá de nuevo';
    return m;
  }

  /* ---------------- mi cuenta ---------------- */
  async function abrirCuenta(tab) {
    if (!perfil) { abrirAuth('login', function () { abrirCuenta(tab); }); return; }
    cerrar(); velo();
    panel = document.createElement('aside');
    panel.className = 'panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Mi cuenta');
    panel.innerHTML = cab('Mi cuenta') +
      '<div class="tabs" id="acTabs">' +
      '<button type="button" data-t="perfil">Perfil</button>' +
      '<button type="button" data-t="seguridad">Seguridad</button>' +
      '<button type="button" data-t="correos">Correos</button>' +
      '<button type="button" data-t="compras">Mis compras</button>' +
      '<button type="button" data-t="ofertas">Mis ofertas</button></div>' +
      '<div class="panel-body" id="acBody"></div>' +
      '<div class="panel-foot"><button class="btn ghost danger block" type="button" id="logoutBtn">Cerrar sesión</button></div>';
    document.body.appendChild(panel);
    $('#acTabs', panel).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]'); if (b) pintarCuenta(b.dataset.t);
    });
    $('#logoutBtn', panel).addEventListener('click', async function () {
      await api.salir(); refrescarCuenta(); cerrar(); toast('Sesión cerrada.');
    });
    pintarCuenta(tab || 'perfil');
  }

  async function pintarCuenta(tab) {
    $$('#acTabs button', panel).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === tab ? 'true' : 'false'); });
    var body = $('#acBody', panel);
    var a = Object.assign({}, ALERTAS_DEF, perfil.alertas || {});

    if (tab === 'perfil') {
      body.innerHTML =
        '<div class="seller"><span class="avatar">' + esc(initials(perfil.nombre)) + '</span>' +
        '<div style="min-width:0"><div style="font-family:var(--display); font-weight:500">' + esc(perfil.nombre) + '</div>' +
        '<div style="font-size:13px; color:var(--ink-2)">' + esc(perfil.correo) + '</div></div>' +
        (esAdmin() ? '<span class="admin-pill" style="margin-left:auto">Administrador</span>' : '<span class="pill ok" style="margin-left:auto">Comprador</span>') + '</div>' +
        '<form class="form-grid" id="profForm" novalidate>' +
        '<div class="form-field"><label for="pfName">Tu nombre</label><input id="pfName" value="' + esc(perfil.nombre) + '"></div>' +
        '<div class="form-field"><label for="pfFull">Nombre completo (opcional)</label><input id="pfFull" value="' + esc(perfil.nombre_completo || '') + '"></div>' +
        '<div class="form-field"><label for="pfDepto">Departamento</label><select id="pfDepto">' + deptoOpts(perfil.departamento || 'San Salvador') + '</select></div>' +
        '<div class="form-field"><label for="pfTel">WhatsApp</label><input id="pfTel" type="tel" inputmode="numeric" placeholder="7000-0000" value="' + esc(perfil.telefono ? telBonito(perfil.telefono) : '') + '"></div>' +
        '<div class="form-field full"><label for="pfSince">Cliente desde</label><input id="pfSince" value="' + esc(fecha(perfil.creado_en)) + '" disabled></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Guardar cambios</button></div></form>' +
        (esAdmin() ? '<button class="btn ghost block" type="button" id="goAdmin">Abrir panel de administrador</button>' : '');
      $('#profForm', panel).addEventListener('submit', async function (e) {
        e.preventDefault();
        var n = $('#pfName', panel).value.trim();
        if (n.length < 2) { toast('Escribí tu nombre.'); return; }
        var telv = $('#pfTel', panel).value.trim(), tel = telOk(telv);
        if (telv && !tel) { toast('El WhatsApp tiene 8 dígitos (ej. 7000-0000).'); return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Guardando…');
        try {
          await api.guardarPerfil({ nombre: n, nombre_completo: $('#pfFull', panel).value.trim() || null, departamento: $('#pfDepto', panel).value, telefono: tel || null });
          refrescarCuenta(); toast('Datos actualizados.'); pintarCuenta('perfil');
        }
        catch (e2) { busy(btn, false); toast(traducir(e2)); }
      });
      if (esAdmin()) $('#goAdmin', panel).addEventListener('click', function () { abrirAdmin('resumen'); });
    }

    else if (tab === 'seguridad') {
      body.innerHTML =
        '<div><h3 style="font-size:17px">Cambiar contraseña</h3>' +
        '<p style="color:var(--ink-2); font-size:14.5px; margin-top:6px">Elegí una contraseña que no usés en otro sitio.</p></div>' +
        '<form class="form-grid" id="passForm" novalidate>' +
        (HAS_DB ? '' : '<div class="form-field full"><label for="cpOld">Contraseña actual</label><input id="cpOld" type="password" autocomplete="current-password"></div>') +
        '<div class="form-field full"><label for="cpNew">Contraseña nueva</label><input id="cpNew" type="password" autocomplete="new-password">' +
        '<span class="strength"><i id="cpBar"></i></span><span class="hint" id="cpHint">Al menos 8 caracteres, con letras y números.</span></div>' +
        '<div class="form-field full"><label for="cpNew2">Repetí la nueva</label><input id="cpNew2" type="password" autocomplete="new-password"></div>' +
        '<div class="full" id="cpErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Actualizar contraseña</button></div></form>' +
        '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>' +
        '<span>Nunca te vamos a pedir tu contraseña por chat, WhatsApp ni redes sociales.</span></div>';
      $('#cpNew', panel).addEventListener('input', function () { fuerza(this.value, $('#cpBar', panel), $('#cpHint', panel)); });
      $('#passForm', panel).addEventListener('submit', async function (e) {
        e.preventDefault();
        var p1 = $('#cpNew', panel).value, p2 = $('#cpNew2', panel).value, err = '';
        if (!HAS_DB && $('#cpOld', panel).value !== perfil.pass) err = 'La contraseña actual no coincide.';
        else if (!passOk(p1)) err = 'La contraseña nueva necesita al menos 8 caracteres, con letras y números.';
        else if (p1 !== p2) err = 'Las dos contraseñas nuevas no coinciden.';
        if (err) { $('#cpErr', panel).innerHTML = '<p class="err">' + esc(err) + '</p>'; return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Guardando…');
        try { await api.cambiarClave(p1); toast('Contraseña actualizada.'); pintarCuenta('seguridad'); }
        catch (e2) { busy(btn, false); $('#cpErr', panel).innerHTML = '<p class="err">' + esc(traducir(e2)) + '</p>'; }
      });
    }

    else if (tab === 'correos') {
      body.innerHTML =
        '<div><h3 style="font-size:17px">Alertas por correo</h3>' +
        '<p style="color:var(--ink-2); font-size:14.5px; margin-top:6px">Los enviamos a <b>' + esc(perfil.correo) + '</b>. Podés apagarlos todos cuando querás.</p></div>' +
        '<div class="rows">' +
        sw('nuevas', 'Publicaciones nuevas', 'Cuando entra una consola o accesorio al catálogo.', a.nuevas) +
        sw('bajadas', 'Bajadas de precio', 'Cuando algo del catálogo baja de precio.', a.bajadas) +
        sw('ofertas', 'Respuestas a mis ofertas de venta', 'Cuando cotizamos la consola que nos ofreciste.', a.ofertas) +
        '</div>' +
        '<p class="hint">La confirmación de tus pedidos y tu comprobante de compra siempre te llegan: son parte de la compra.</p>' +
        '<button class="btn block" type="button" id="prefSave">Guardar preferencias</button>' +
        '<button class="btn ghost block" type="button" id="prefOff">Desactivar todos los correos</button>';
      $('#prefSave', panel).addEventListener('click', async function () {
        var btn = this; busy(btn, true, 'Guardando…');
        try {
          await api.guardarPerfil({ alertas: Object.assign({}, a, {
            nuevas: $('#sw-nuevas', panel).checked, bajadas: $('#sw-bajadas', panel).checked,
            ofertas: $('#sw-ofertas', panel).checked, resumen: false, frecuencia: 'inmediato' }) });
          toast('Preferencias guardadas.'); pintarCuenta('correos');
        } catch (e) { busy(btn, false); toast(traducir(e)); }
      });
      $('#prefOff', panel).addEventListener('click', async function () {
        await api.guardarPerfil({ alertas: Object.assign({}, a, { nuevas: false, bajadas: false, ofertas: false, resumen: false }) });
        toast('Desactivamos todos los correos de tu cuenta.'); pintarCuenta('correos');
      });
    }

    else if (tab === 'compras') {
      body.innerHTML = '<div class="skeleton" style="height:90px"></div>';
      var ords = [];
      try { ords = (await api.ordenes()).filter(function (o) { return o.user_id === perfil.id; }); } catch (e) { }
      body.innerHTML = ords.length ? '<div class="rows">' + ords.map(function (o) {
        var p = porId(o.producto_id);
        return '<div class="row-item"><span class="mini">' + (p ? media(p, { video: false }) : ART.consola) + '</span>' +
          '<span class="grow"><strong>' + esc(o.titulo_producto || (p && p.titulo) || 'Consola') + '</strong>' +
          '<span class="sub">Pedido ' + esc(o.codigo) + ' · ' + esc(fecha(o.creado_en)) + ' · ' + esc(o.punto_entrega || o.metodo_entrega) + '</span>' +
          (o.garantia_hasta ? '<span class="sub">Garantía hasta el ' + esc(o.garantia_hasta) + '</span>' : '') +
          '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap"><a class="btn xs ghost" href="/comprobante.html?o=' + encodeURIComponent(o.codigo) + '" target="_blank" rel="noopener">Comprobante</a>' +
          (o.estado === 'pendiente' && WHATS.length ? '<a class="btn xs wa" href="' + waLink(WHATS[0], 'Hola, tengo el pedido ' + o.codigo + ' (' + (o.titulo_producto || '') + '). ¿Cuándo nos vemos?') + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</span></span>' +
          '<span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(o.monto) + '</span>' +
          '<span class="pill ' + (o.estado === 'entregada' ? 'ok' : (o.estado === 'cancelada' ? 'bad' : 'warn')) + '">' + esc(ESTADO_ORDEN[o.estado] || o.estado) + '</span></span></div>';
      }).join('') + '</div>' : '<div class="empty"><strong>Todavía no tenés compras.</strong><br>Cuando comprés algo, acá vas a ver el estado de cada pedido y tu comprobante.</div>';
      var porTransferir = ords.filter(function (o) { return o.estado === 'pendiente' && o.metodo_pago === 'transferencia'; })[0];
      if (porTransferir) { body.insertAdjacentHTML('beforeend', '<div id="bancoCuenta"></div>'); pintarBanco($('#bancoCuenta', body), porTransferir.codigo); }
    }

    else {
      body.innerHTML = '<div class="skeleton" style="height:90px"></div>';
      var ofs = [];
      try { ofs = (await api.ofertas()).filter(function (o) { return o.user_id === perfil.id; }); } catch (e) { }
      body.innerHTML = (ofs.length ? '<div class="rows">' + ofs.map(function (o) {
        return '<div class="row-item"><span class="mini">' + ART[ART_CAT[o.categoria] || 'consola'] + '</span>' +
          '<span class="grow"><strong>' + esc(o.titulo) + '</strong><span class="sub">Pedís ' + money(o.precio_esperado) +
          (o.cotizacion ? ' · te ' + (o.estado === 'comprada' ? 'pagamos ' : 'cotizamos ') + money(o.cotizacion) : '') + ' · ' + esc(fecha(o.creado_en)) + '</span>' + fotos(o) + '</span>' +
          '<span class="pill ' + (o.estado === 'aceptada' || o.estado === 'comprada' ? 'ok' : (o.estado === 'rechazada' ? 'bad' : 'warn')) + '">' + esc(o.estado) + '</span></div>';
      }).join('') + '</div>' : '<div class="empty"><strong>No has enviado ofertas.</strong><br>Mandanos tu consola desde la sección de venta y te cotizamos.</div>') +
        '<button class="btn ghost block" type="button" id="goSell">Enviar una oferta nueva</button>';
      $('#goSell', panel).addEventListener('click', function () { cerrar(); document.getElementById('vender').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    }
  }
  function sw(id, t, s, on) {
    return '<label class="switch-row"><span class="switch"><input type="checkbox" id="sw-' + id + '"' + (on ? ' checked' : '') + '><span class="track"></span><span class="knob"></span></span>' +
      '<span class="grow"><strong>' + esc(t) + '</strong><span>' + esc(s) + '</span></span></label>';
  }

  /* ---------------- panel de administrador ---------------- */
  /* ---------------- tiempo real ----------------
     Solo se conecta quien tiene sesión iniciada: los visitantes que solo
     miran el catálogo no ocupan conexiones en vivo (el plan gratis de
     Supabase permite 200 a la vez). */
  var vivoDe = null;
  function conectarVivo() {
    var quien = perfil ? perfil.id + (esAdmin() ? ':admin' : '') : null;
    if (quien === vivoDe) return;
    api.desconectarVivo();
    vivoDe = quien;
    if (!perfil) return;
    api.escucharMensajes(function (m) {
      if (mensajes.some(function (x) { return x.id === m.id; })) return;
      mensajes.push(m); if (dock) renderDock(); refrescarBadge();
    });
    if (esAdmin()) {
      api.escucharTabla('ofertas', function (o) { avisoAdmin('ofertas', 'Nueva oferta: ' + (o.titulo || 'consola') + ' por ' + money(o.precio_esperado), o.id); });
      api.escucharTabla('ordenes', function (o) { avisoAdmin('ordenes', 'Pedido nuevo: ' + (o.titulo_producto || 'consola') + ' · ' + (o.punto_entrega || ''), o.id); });
    }
  }

  /* ---------------- avisos al administrador ---------------- */
  var adminTab = null, nuevosIds = {};
  var pend = { ofertas: 0, ordenes: 0 };
  async function contarPendientes() {
    if (!esAdmin()) { $('#adminBadge').hidden = true; return; }
    try {
      var o = await api.ofertas(), r = await api.ordenes();
      pend.ofertas = o.filter(function (x) { return x.estado === 'pendiente'; }).length;
      pend.ordenes = r.filter(function (x) { return x.estado === 'pendiente'; }).length;
    } catch (e) { }
    pintarPendientes();
  }
  function pintarPendientes() {
    var n = pend.ofertas + pend.ordenes, b = $('#adminBadge');
    b.textContent = n; b.hidden = n === 0;
    if (modal) $$('#adTabs button', modal).forEach(function (t) {
      var k = t.dataset.t, c = pend[k];
      var old = t.querySelector('.count-badge'); if (old) old.remove();
      if (c) t.insertAdjacentHTML('beforeend', '<span class="count-badge">' + c + '</span>');
    });
  }
  function avisoAdmin(tipo, texto, id) {
    if (!esAdmin()) return;
    nuevosIds[id] = true;
    pend[tipo] = (pend[tipo] || 0) + 1;
    pintarPendientes();
    toast(texto);
    if (modal && (adminTab === tipo || adminTab === 'resumen')) pintarAdmin(adminTab);
  }
  function errorCaja(e) {
    return '<div class="note warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>' +
      '<span>No se pudo cargar: ' + esc(traducir(e)) + '. Cerrá sesión y volvé a entrar; si sigue, recargá la página.</span></div>';
  }
  function fotos(o) {
    var f = (o.imagenes || []).filter(Boolean);
    return f.length ? '<span class="pics">' + f.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Foto de la oferta" loading="lazy"></a>'; }).join('') + '</span>' : '';
  }

  function abrirAdmin(tab) {
    if (!esAdmin()) { abrirAuth('login', function () { abrirAdmin(tab); }, 'Ingresá con la cuenta de administrador.'); return; }
    cerrar(); velo();
    modal = document.createElement('div');
    modal.className = 'modal wide'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Panel de administrador');
    modal.innerHTML = cab('Panel de ' + (CFG.marca || 'Ttoms')) +
      '<div class="tabs" id="adTabs">' +
      '<button type="button" data-t="resumen">Resumen</button>' +
      '<button type="button" data-t="publicar">Publicar</button>' +
      '<button type="button" data-t="inventario">Inventario</button>' +
      '<button type="button" data-t="ordenes">Pedidos</button>' +
      '<button type="button" data-t="ofertas">Ofertas recibidas</button>' +
      '<button type="button" data-t="actas">Actas de compra</button>' +
      '<button type="button" data-t="resenas">Reseñas</button>' +
      '<button type="button" data-t="clientes">Clientes</button>' +
      '<button type="button" data-t="correos">Correos</button></div>' +
      '<div class="panel-body" id="adBody"></div>';
    document.body.appendChild(modal);
    $('#adTabs', modal).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]'); if (b) pintarAdmin(b.dataset.t);
    });
    pintarAdmin(tab || 'resumen');
    contarPendientes();
  }

  function nota(txt, warn) {
    return '<div class="note' + (warn ? ' warn' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg><span>' + txt + '</span></div>';
  }
  function msgCorreo(r, ok) {
    if (!r) return '';
    if (r.motivo === 'sin-configurar') return 'Los correos todavía no están activados (Panel → Correos).';
    return ok || '';
  }

  /* ---------- fotos del producto: agregar, quitar, elegir portada ---------- */
  function gestorFotos(cont, iniciales) {
    var items = (iniciales || []).map(function (u) { return { url: u, prev: u }; });
    cont.innerHTML = '<label class="ph-add"><input type="file" accept="image/*" multiple>' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
      '<span class="lbl">Agregar fotos (hasta 10)</span></label><div class="ph-grid"></div>' +
      '<span class="hint">La primera es la portada. Subí: frente, atrás, puertos, controles, la etiqueta con la serie y la consola encendida.</span>';
    var grid = $('.ph-grid', cont), input = $('input', cont), lbl = $('.lbl', cont);
    function pintar() {
      grid.innerHTML = items.map(function (it, i) {
        return '<figure class="' + (i === 0 ? 'cover' : '') + '"><img src="' + esc(it.prev) + '" alt="Foto ' + (i + 1) + '">' +
          (i === 0 ? '<span class="badge">Portada</span>' : '') +
          '<div class="tools">' + (i > 0 ? '<button type="button" data-cov="' + i + '" title="Usar como portada">★ Portada</button>' : '<span></span>') +
          '<button type="button" data-rm="' + i + '" aria-label="Quitar foto">✕</button></div></figure>';
      }).join('');
      lbl.textContent = items.length ? items.length + ' de 10 fotos · agregar más' : 'Agregar fotos (hasta 10)';
    }
    input.addEventListener('change', function () {
      Array.prototype.slice.call(this.files || []).forEach(function (f) {
        if (!/^image\//.test(f.type) && !/\.(heic|heif)$/i.test(f.name)) return;
        if (items.length >= 10) { toast('Máximo 10 fotos por publicación.'); return; }
        items.push({ file: f, prev: URL.createObjectURL(f) });
      });
      this.value = ''; pintar();
    });
    grid.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cov]'), r = e.target.closest('[data-rm]');
      if (c) { var it = items.splice(Number(c.dataset.cov), 1)[0]; items.unshift(it); pintar(); }
      if (r) { items.splice(Number(r.dataset.rm), 1); pintar(); }
    });
    pintar();
    return {
      cuantas: function () { return items.length; },
      portadaLocal: function () { return items[0] ? (items[0].file || null) : null; },
      portadaUrl: function () { return items[0] ? items[0].prev : null; },
      subir: async function (avance) {
        var urls = [];
        for (var i = 0; i < items.length; i++) {
          if (avance) avance(i + 1, items.length);
          if (items[i].url) urls.push(items[i].url);
          else { var u = await api.subirArchivo(await comprimir(items[i].file), 'fotos'); items[i].url = u; urls.push(u); }
        }
        return urls;
      }
    };
  }

  /* ---------- imagen de vista previa para WhatsApp / Instagram (1200×630) ---------- */
  function cargarImagen(src) {
    return new Promise(function (ok, no) {
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () { ok(img); }; img.onerror = no; img.src = src;
    });
  }
  async function crearOg(p, fuente) {
    try {
      if (document.fonts && document.fonts.load) { await document.fonts.load('800 60px "Bricolage Grotesque"'); await document.fonts.load('500 60px "IBM Plex Mono"'); }
      var W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      x.fillStyle = '#0F1A17'; x.fillRect(0, 0, W, H);
      var foto = null;
      if (fuente) { try { foto = await cargarImagen(fuente instanceof Blob ? URL.createObjectURL(fuente) : fuente); } catch (e) { foto = null; } }
      var FW = 600;
      if (foto) {
        var k = Math.max(FW / foto.naturalWidth, H / foto.naturalHeight), w = foto.naturalWidth * k, h = foto.naturalHeight * k;
        x.save(); x.beginPath(); x.rect(0, 0, FW, H); x.clip();
        x.drawImage(foto, (FW - w) / 2, (H - h) / 2, w, h); x.restore();
      } else {
        var g = x.createRadialGradient(200, 150, 20, 300, 315, 520); g.addColorStop(0, '#2B4A41'); g.addColorStop(1, '#14231F');
        x.fillStyle = g; x.fillRect(0, 0, FW, H);
      }
      var gr = x.createRadialGradient(1150, 620, 10, 1150, 620, 420); gr.addColorStop(0, 'rgba(232,167,101,.28)'); gr.addColorStop(1, 'rgba(232,167,101,0)');
      x.fillStyle = gr; x.fillRect(FW, 0, W - FW, H);
      var L = FW + 56, maxW = W - L - 50;
      // marca
      x.fillStyle = '#8FE3C8'; roundRect(x, L, 52, 40, 40, 11); x.fill();
      x.fillStyle = '#0F1A17'; x.fillRect(L + 9, 64, 16, 4); x.fillRect(L + 15, 64, 4, 18);
      x.fillStyle = '#E8A765'; x.beginPath(); x.arc(L + 29, 79, 4, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.font = '800 34px "Bricolage Grotesque", sans-serif'; x.fillText(CFG.marca || 'Ttoms', L + 54, 83);
      // grado
      x.font = '500 20px "IBM Plex Mono", monospace'; x.fillStyle = '#E8A765';
      x.fillText(('GRADO ' + (GRADO[p.grado] || p.grado)).toUpperCase().replace(' · ', ' · '), L, 170);
      // título (hasta 3 líneas)
      x.fillStyle = '#fff'; x.font = '800 54px "Bricolage Grotesque", sans-serif';
      var palabras = String(p.titulo).split(/\s+/), lineas = [], lin = '';
      palabras.forEach(function (w) { var t = lin ? lin + ' ' + w : w; if (x.measureText(t).width > maxW && lin) { lineas.push(lin); lin = w; } else lin = t; });
      if (lin) lineas.push(lin);
      if (lineas.length > 3) { lineas = lineas.slice(0, 3); lineas[2] = lineas[2].replace(/\s+\S*$/, '') + '…'; }
      lineas.forEach(function (l, i) { x.fillText(l, L, 236 + i * 60); });
      // precio
      x.fillStyle = '#8FE3C8'; x.font = '500 76px "IBM Plex Mono", monospace';
      x.fillText(money(p.precio), L, 236 + lineas.length * 60 + 88);
      // pie
      x.fillStyle = '#9DB5AC'; x.font = '400 24px "Source Sans 3", sans-serif';
      x.fillText('La probás antes de pagar · San Salvador', L, 580);
      var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', 0.84); });
      if (!blob) return null;
      return await api.subirArchivo(new File([blob], 'og.jpg', { type: 'image/jpeg' }), 'og');
    } catch (e) { console.warn('No se pudo crear la vista previa', e); return null; }
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  /* ---------- formulario de producto (publicar y editar) ---------- */
  function formProducto(p, origen, actas) {
    p = p || {}; origen = origen || {};
    var cats = ['PlayStation', 'Xbox', 'Nintendo', 'Portátil', 'Retro', 'Accesorios'];
    var opcActas = (actas || []).map(function (a) {
      return '<option value="' + esc(a.id) + '"' + (origen.acta_id === a.id ? ' selected' : '') + ' data-serie="' + esc(a.serie) + '">' + esc(a.numero + ' · ' + a.articulo + ' · serie …' + ultimos4(a.serie)) + '</option>';
    }).join('');
    return '<form class="form-grid" id="prodForm" novalidate>' +
      '<div class="form-field full"><label for="nlTitle">Título</label><input id="nlTitle" value="' + esc(p.titulo || '') + '" placeholder="Ej. PlayStation 5 Slim Digital"></div>' +
      '<div class="form-field"><label for="nlCat">Categoría</label><select id="nlCat">' + cats.map(function (c) { return '<option' + (p.categoria === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label for="nlPrice">Precio (US$)</label><input id="nlPrice" type="number" min="5" step="1" value="' + esc(p.precio != null ? Number(p.precio) : '') + '" placeholder="250"></div>' +
      '<div class="form-field"><label for="nlGrade">Estado</label><select id="nlGrade">' + ['S', 'A', 'B', 'C'].map(function (g) { return '<option value="' + g + '"' + ((p.grado || 'A') === g ? ' selected' : '') + '>' + g + ' — ' + GRADO[g].split(' · ')[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="form-field"><label for="nlVid">Video corto (opcional)</label><input id="nlVid" type="file" accept="video/*">' + (p.video_url ? '<span class="hint">Ya tiene video. Subí otro solo si lo querés cambiar.</span>' : '') + '</div>' +
      '<div class="form-field full"><label for="nlInc">Incluye (separado por comas)</label><input id="nlInc" value="' + esc((p.incluye || []).join(', ')) + '" placeholder="1 control, cable HDMI, caja original"></div>' +
      '<div class="form-field full"><label for="nlDesc">Descripción</label><textarea id="nlDesc" rows="3" placeholder="Estado real, revisión hecha, detalles de uso…">' + esc(p.descripcion || '') + '</textarea></div>' +
      '<div class="form-field full"><label>Fotos</label><div id="nlFotos"></div></div>' +
      '<div class="form-field"><label for="nlActa">Viene del acta de compra</label><select id="nlActa"><option value="">— Sin acta (consola propia o comprada antes)</option>' + opcActas + '</select></div>' +
      '<div class="form-field"><label for="nlSerie">Número de serie completo (privado)</label><input id="nlSerie" value="' + esc(origen.serie || '') + '" placeholder="Ej. E12345678901" autocomplete="off">' +
      '<span class="hint">En la web solo se ve “termina en ' + (origen.serie ? esc(ultimos4(origen.serie)) : '1234') + '”. Completo va en el comprobante del comprador.</span></div>' +
      '<div class="full"><label class="switch-row"><span class="switch"><input type="checkbox" id="nlEnvio"' + (p.envio === false ? '' : ' checked') + '><span class="track"></span><span class="knob"></span></span>' +
      '<span class="grow"><strong>Se puede entregar fuera de San Salvador</strong><span>Si lo apagás, solo se entrega en los puntos de San Salvador.</span></span></label></div>' +
      '<div class="full" id="nlMailBox"></div>' +
      '<div class="full" id="nlErr"></div>' +
      '<div class="form-field full"><button class="btn block" type="submit">' + (p.id ? 'Guardar cambios' : 'Publicar en el catálogo') + '</button></div></form>';
  }
  function leerProducto() {
    var inc = $('#nlInc', modal).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var serie = $('#nlSerie', modal).value.trim();
    return {
      titulo: $('#nlTitle', modal).value.trim(), categoria: $('#nlCat', modal).value, precio: Number($('#nlPrice', modal).value),
      grado: $('#nlGrade', modal).value, incluye: inc.length ? inc : ['Consultá qué incluye por WhatsApp'],
      descripcion: $('#nlDesc', modal).value.trim() || 'Revisada y probada antes de publicarla.',
      envio: $('#nlEnvio', modal).checked, serie: serie, acta_id: $('#nlActa', modal).value || null
    };
  }
  function enlazarActa() {
    $('#nlActa', modal).addEventListener('change', function () {
      var o = this.selectedOptions[0];
      if (o && o.dataset.serie && !$('#nlSerie', modal).value.trim()) $('#nlSerie', modal).value = o.dataset.serie;
    });
  }
  function exitoPublicado(p, aviso, editado) {
    var link = linkDe(p), msg = p.titulo + ' · ' + money(p.precio) + '\n' + link;
    return '<div class="success"><div class="ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div>' +
      '<h3 style="font-size:20px">' + (editado ? 'Cambios guardados' : 'Publicada en el catálogo') + '</h3>' +
      '<p style="color:var(--ink-2); margin-top:8px">' + esc(aviso || '') + '</p>' +
      '<p class="mono" style="margin-top:12px; font-size:13px; word-break:break-all"><a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(link) + '</a></p></div>' +
      '<div class="row-btns" style="justify-content:center; margin-top:0">' +
      '<button class="btn" type="button" data-copy="' + esc(link) + '">Copiar enlace</button>' +
      '<a class="btn wa" href="https://wa.me/?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + WA_ICON + 'Mandar por WhatsApp</a>' +
      '<button class="btn ghost" type="button" data-go="' + (editado ? 'inventario' : 'publicar') + '">' + (editado ? 'Volver al inventario' : 'Publicar otra') + '</button></div>' +
      nota('Pegá el enlace en tus historias de Instagram o en WhatsApp: al abrirlo se muestra esta consola con sus fotos. La vista previa con foto y precio aparece en WhatsApp.');
  }
  async function guardarProducto(prev, fotosCtl, btn) {
    var d = leerProducto(), err = $('#nlErr', modal);
    if (d.titulo.length < 4) { err.innerHTML = '<p class="err">Poné un título para la publicación.</p>'; return null; }
    if (!d.precio || d.precio < 5) { err.innerHTML = '<p class="err">Poné un precio de al menos $5.</p>'; return null; }
    if (!fotosCtl.cuantas() && !window.confirm('No agregaste fotos. Las publicaciones con varias fotos se venden mucho más rápido. ¿Publicar igual?')) return null;
    if (!d.serie && d.categoria !== 'Accesorios' && !window.confirm('No pusiste el número de serie. Es tu respaldo legal y va en el comprobante del comprador. ¿Seguir sin serie?')) return null;
    err.innerHTML = '';
    busy(btn, true, 'Subiendo fotos…');
    var urls = await fotosCtl.subir(function (i, n) { btn.textContent = 'Subiendo foto ' + i + ' de ' + n + '…'; });
    var vid = $('#nlVid', modal).files[0];
    btn.textContent = vid ? 'Subiendo video…' : 'Guardando…';
    var video_url = vid ? await api.subirArchivo(vid, 'videos') : (prev ? prev.video_url : null);
    var datos = {
      titulo: d.titulo, categoria: d.categoria, precio: d.precio, grado: d.grado, incluye: d.incluye,
      descripcion: d.descripcion, envio: d.envio, imagenes: urls, imagen_url: urls[0] || null, video_url: video_url,
      serie: d.serie ? 'Verificada · termina en ' + ultimos4(d.serie) : (prev ? prev.serie : null)
    };
    var p;
    if (prev) { p = await api.editarProducto(prev.id, datos); Object.assign(prev, p || datos); p = prev; }
    else { datos.ubicacion = 'San Salvador'; datos.activo = true; p = await api.crearProducto(datos); productos.unshift(p); }
    if (d.serie || d.acta_id) { try { await api.guardarOrigen({ producto_id: p.id, serie: d.serie || null, acta_id: d.acta_id }); } catch (e) { toast('No se guardó la serie privada: ' + traducir(e)); } }
    // Vista previa para compartir: solo si cambió algo que se ve en ella.
    var cambioVista = !prev || prev._titulo !== d.titulo || Number(prev._precio) !== d.precio || prev._portada !== urls[0] || prev._grado !== d.grado || !prev.og_url;
    if (cambioVista) {
      btn.textContent = 'Creando vista previa…';
      var og = await crearOg(p, fotosCtl.portadaLocal() || urls[0]);
      if (og) { try { var r = await api.editarProducto(p.id, { og_url: og }); p.og_url = og; if (r) Object.assign(p, r); } catch (e) { } }
    }
    render();
    return p;
  }

  /* ---------- acta de compra (cuando ustedes compran una consola) ---------- */
  function formActa(o, actas) {
    o = o || {};
    var chk = function (id, txt, req) {
      return '<label class="check"><input type="checkbox" data-v="' + id + '"' + (req ? ' data-req="1"' : '') + '><span>' + txt + '</span></label>';
    };
    return '<div>' + (o.id ? '<p class="eyebrow">Oferta de ' + esc(o.nombre || o.correo || '') + '</p>' : '') +
      '<h3 style="font-size:19px; margin-top:6px">Acta de compra</h3>' +
      '<p style="color:var(--ink-2); font-size:14.5px; margin-top:6px">Llenala en el momento de la compra, con el vendedor presente y su documento en la mano. Después la imprimís y la firman los dos. Es tu prueba de buena fe ante el art. 214-A del Código Penal.</p></div>' +
      '<form class="form-grid" id="actaForm" novalidate>' +
      '<div class="form-field full"><p class="eyebrow">Vendedor</p></div>' +
      '<div class="form-field full"><label for="acNom">Nombre completo (como aparece en el documento)</label><input id="acNom" value="' + esc(o.nombre_completo || '') + '" autocomplete="off"></div>' +
      '<div class="form-field"><label for="acTipo">Documento</label><select id="acTipo"><option>DUI</option><option>Carné de residente</option><option>Pasaporte</option></select></div>' +
      '<div class="form-field"><label for="acDoc">Número</label><input id="acDoc" placeholder="00000000-0" autocomplete="off" inputmode="numeric"></div>' +
      '<div class="form-field"><label for="acTel">Teléfono</label><input id="acTel" value="' + esc(o.telefono ? telBonito(o.telefono) : '') + '" inputmode="numeric" placeholder="7000-0000"></div>' +
      '<div class="form-field"><label for="acDom">Municipio y departamento donde vive</label><input id="acDom" value="' + esc(o.ubicacion || '') + '"></div>' +
      '<div class="form-field full"><p class="eyebrow" style="margin-top:8px">La consola</p></div>' +
      '<div class="form-field full"><label for="acArt">Artículo (marca, modelo, color, capacidad)</label><input id="acArt" value="' + esc(o.titulo || '') + '"></div>' +
      '<div class="form-field"><label for="acSerie">Número de serie (tal como está en la etiqueta)</label><input id="acSerie" value="' + esc(o.serie || '') + '" autocomplete="off"></div>' +
      '<div class="form-field"><label for="acResp">Respaldo que presentó</label><select id="acResp">' +
      ['Factura y caja original', 'Factura', 'Caja original con la misma serie', 'Ninguno'].map(function (x) { return '<option' + (o.comprobante_origen === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="full" id="acDup"></div>' +
      '<div class="form-field"><label for="acAcc">Accesorios que entrega</label><input id="acAcc" placeholder="1 control, cables, caja"></div>' +
      '<div class="form-field"><label for="acEst">Estado físico</label><input id="acEst" value="' + esc(o.grado ? 'Grado ' + o.grado : '') + '" placeholder="Rayones leves en la tapa"></div>' +
      '<div class="form-field full"><p class="eyebrow" style="margin-top:8px">La compra</p></div>' +
      '<div class="form-field"><label for="acMonto">Monto pagado (US$)</label><input id="acMonto" type="number" min="0" step="1" value="' + esc(o.cotizacion != null ? Number(o.cotizacion) : (o.precio_esperado != null ? Number(o.precio_esperado) : '')) + '"></div>' +
      '<div class="form-field"><label for="acPago">Forma de pago</label><select id="acPago"><option>Efectivo</option><option>Transferencia</option></select></div>' +
      '<div class="form-field full"><label for="acLugar">Lugar</label><input id="acLugar" list="acLugares" value="' + esc(PUNTOS[0] || '') + '"><datalist id="acLugares">' + PUNTOS.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div>' +
      '<div class="form-field full"><p class="eyebrow" style="margin-top:8px">Verificaciones</p><div class="checks">' +
      chk('documento', 'Vi el documento original y la foto coincide con la persona.', true) +
      chk('serie', 'La serie de la consola coincide con la que anoté (y con la caja o factura, si las trajo).', true) +
      chk('serie_intacta', 'La etiqueta de serie no está raspada, borrada ni alterada.', true) +
      chk('desvinculada', 'La consola quedó desvinculada de la cuenta del vendedor (PSN, Nintendo o Microsoft) y restaurada.', true) +
      chk('precio', 'El precio es razonable para el mercado. (Un precio muy bajo hace presumir mala fe: art. 214-A.)', true) +
      chk('conducta', 'El vendedor no mostró señales sospechosas (prisa excesiva, no sabe usarla, no quiere identificarse).', true) +
      '</div></div>' +
      '<div class="form-field full"><label for="acNotas">Notas (opcional)</label><textarea id="acNotas" rows="2"></textarea></div>' +
      '<div class="full" id="acErr"></div>' +
      '<div class="form-field full"><button class="btn block" type="submit">Guardar acta y preparar para firmar</button></div></form>';
  }
  function montarActa(o, actas, alTerminar) {
    var dup = function () {
      var s = serieNormal($('#acSerie', modal).value), box = $('#acDup', modal);
      var otra = s.length >= 4 ? (actas || []).filter(function (a) { return serieNormal(a.serie) === s; })[0] : null;
      box.innerHTML = otra ? '<div class="warn-box">Esta serie ya está registrada en el acta ' + esc(otra.numero) + ' (' + esc(fecha(otra.fecha)) + ', vendida por ' + esc(otra.vendedor_nombre) + '). Una misma consola vendida dos veces es una señal de alerta: verificá bien antes de comprar.</div>' : '';
    };
    $('#acSerie', modal).addEventListener('input', dup); dup();
    $('#actaForm', modal).addEventListener('submit', async function (e) {
      e.preventDefault();
      var err = $('#acErr', modal), tipo = $('#acTipo', modal).value, docv = $('#acDoc', modal).value.trim();
      var nom = $('#acNom', modal).value.trim(), serie = $('#acSerie', modal).value.trim(), monto = Number($('#acMonto', modal).value);
      var falta = '';
      if (nom.length < 5) falta = 'Escribí el nombre completo del vendedor.';
      else if (tipo === 'DUI' && !duiNormal(docv)) falta = 'El DUI tiene 8 números, un guion y un número (00000000-0).';
      else if (tipo !== 'DUI' && docv.length < 5) falta = 'Escribí el número del documento.';
      else if ($('#acArt', modal).value.trim().length < 3) falta = 'Escribí qué consola es.';
      else if (serieNormal(serie).length < 4) falta = 'Anotá el número de serie completo. Sin serie no se puede comprar.';
      else if (!(monto >= 0) || $('#acMonto', modal).value === '') falta = 'Escribí cuánto pagaste.';
      else if ($$('[data-req]', modal).some(function (c) { return !c.checked; })) falta = 'Marcá todas las verificaciones. Si alguna no se cumple, no compres la consola.';
      if (falta) { err.innerHTML = '<p class="err">' + esc(falta) + '</p>'; return; }
      if (tipo === 'DUI' && !duiOk(docv) && !window.confirm('El dígito verificador de ese DUI no cuadra: puede estar mal escrito o ser falso. Revisalo con el documento en la mano. ¿Guardar igual?')) return;
      var ver = {}; $$('[data-v]', modal).forEach(function (c) { ver[c.dataset.v] = c.checked; });
      var btn = $('button[type=submit]', this); busy(btn, true, 'Guardando…');
      try {
        var a = await api.crearActa({
          oferta_id: o && o.id ? o.id : null, vendedor_nombre: nom, documento_tipo: tipo,
          documento_numero: tipo === 'DUI' ? duiNormal(docv) : docv, vendedor_telefono: telOk($('#acTel', modal).value) || $('#acTel', modal).value.trim() || null,
          vendedor_domicilio: $('#acDom', modal).value.trim() || null, articulo: $('#acArt', modal).value.trim(), serie: serie,
          accesorios: $('#acAcc', modal).value.trim() || null, estado_fisico: $('#acEst', modal).value.trim() || null,
          comprobante_origen: $('#acResp', modal).value, verificaciones: ver, monto: monto, metodo_pago: $('#acPago', modal).value,
          lugar: $('#acLugar', modal).value.trim() || null, notas: $('#acNotas', modal).value.trim() || null
        });
        if (o && o.id) { try { await api.editarOferta(o.id, { estado: 'comprada', acta_id: a.id, cotizacion: monto }); } catch (e2) { } }
        alTerminar(a);
      } catch (e3) { busy(btn, false); err.innerHTML = '<p class="err">' + esc(traducir(e3)) + '</p>'; }
    });
  }
  function exitoActa(a) {
    return '<div class="success"><div class="ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div>' +
      '<h3 style="font-size:20px">Acta ' + esc(a.numero) + ' guardada</h3>' +
      '<p style="color:var(--ink-2); margin-top:8px">Imprimila (o guardala en PDF) y fírmenla los dos, con la huella del vendedor. Guardá la copia firmada.</p></div>' +
      '<div class="row-btns" style="justify-content:center; margin-top:0">' +
      '<a class="btn" href="/acta.html?id=' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">Abrir acta para imprimir</a>' +
      '<button class="btn ghost" type="button" data-pub-acta="' + esc(a.id) + '">Publicar esta consola</button></div>';
  }

  async function pintarAdmin(tab, extra) {
    if (!modal || !$('#adBody', modal)) return;
    adminTab = tab;
    $$('#adTabs button', modal).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === tab ? 'true' : 'false'); });
    // Nodo nuevo en cada pestaña para no acumular manejadores de clic.
    var viejo = $('#adBody', modal), body = viejo.cloneNode(false);
    viejo.replaceWith(body);
    body.innerHTML = '<div class="skeleton" style="height:120px"></div>';
    body.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]'); if (g) { pintarAdmin(g.dataset.go); return; }
      var cp = e.target.closest('[data-copy]'); if (cp) { copiar(cp.dataset.copy, 'Enlace copiado.'); return; }
      var pa = e.target.closest('[data-pub-acta]'); if (pa) { pintarAdmin('publicar', { acta: pa.dataset.pubActa }); return; }
    });

    if (tab === 'resumen') {
      var ofs = [], ords = [], gente = [], st = {}, correo = null, fallo = null;
      try { ofs = await api.ofertas(); ords = await api.ordenes(); gente = await api.perfiles(); } catch (e) { fallo = e; }
      try { st = await api.estadisticas(); correo = await api.estadoCorreo(); } catch (e) { }
      var activos = productos.filter(function (p) { return p.activo; });
      var valor = activos.reduce(function (a, p) { return a + Number(p.precio); }, 0);
      var ofP = ofs.filter(function (o) { return o.estado === 'pendiente'; });
      var orP = ords.filter(function (o) { return o.estado === 'pendiente' || o.estado === 'pagada'; });
      pend.ofertas = ofP.length; pend.ordenes = ords.filter(function (o) { return o.estado === 'pendiente'; }).length; pintarPendientes();
      body.innerHTML = (fallo ? errorCaja(fallo) : '') +
        (correo && !correo.configurado ? nota('Los correos automáticos todavía no están activados. <a href="#" data-go="correos"><b>Activarlos ahora</b></a> (toma 3 minutos).', true) : '') +
        '<div class="stat-row">' +
        '<div class="stat' + (orP.length ? ' hot' : '') + '"><b>' + orP.length + '</b><span>Pedidos por entregar</span></div>' +
        '<div class="stat' + (ofP.length ? ' hot' : '') + '"><b>' + ofP.length + '</b><span>Ofertas por responder</span></div>' +
        '<div class="stat"><b>' + activos.length + '</b><span>Publicaciones activas</span></div>' +
        '<div class="stat"><b>' + (Math.max(Number(st.entregadas || 0), Number(st.vendidas || 0)) + Number(CFG.ventasPrevias || 0)) + '</b><span>Vendidas (contador público)</span></div>' +
        '<div class="stat"><b>$' + Math.round(valor).toLocaleString('en-US') + '</b><span>Valor del inventario</span></div>' +
        '<div class="stat"><b>' + gente.filter(function (u) { return u.alertas && u.alertas.nuevas; }).length + '</b><span>Suscriptores</span></div>' +
        '</div>' +
        (orP.length ? '<div><p class="eyebrow" style="margin:4px 0 9px">Pedidos por entregar</p><div class="rows">' + orP.slice(0, 4).map(function (o) { return filaOrden(o); }).join('') + '</div></div>' : '') +
        (ofP.length ? '<div><p class="eyebrow" style="margin:4px 0 9px">Ofertas esperando respuesta</p><div class="rows">' + ofP.slice(0, 4).map(function (o) {
          return '<div class="row-item' + (nuevosIds[o.id] ? ' nuevo' : '') + '"><span class="mini">' + ((o.imagenes || [])[0] ? '<img src="' + esc(o.imagenes[0]) + '" alt="">' : ART[ART_CAT[o.categoria] || 'consola']) + '</span>' +
            '<span class="grow"><strong>' + esc(o.titulo) + '</strong><span class="sub">' + esc(o.nombre || o.correo) + ' pide ' + money(o.precio_esperado) + ' · ' + esc(fecha(o.creado_en)) + '</span></span>' +
            '<button class="btn xs" type="button" data-go="ofertas">Responder</button></div>';
        }).join('') + '</div></div>' : '') +
        (!ofP.length && !orP.length && !fallo ? nota('Todo al día. Cuando entre un pedido o una oferta te aparece aquí al instante, con un aviso' + (correo && correo.configurado ? ' y un correo.' : '.')) : '');
    }

    else if (tab === 'publicar') {
      var actasP = [], subs = 0;
      try { actasP = await api.actas(); } catch (e) { }
      try { subs = (await api.perfiles()).filter(function (u) { return u.rol !== 'admin' && u.alertas && u.alertas.nuevas; }).length; } catch (e) { }
      var desdeActa = extra && extra.acta ? actasP.filter(function (a) { return a.id === extra.acta; })[0] : null;
      body.innerHTML = formProducto(desdeActa ? { titulo: desdeActa.articulo } : null, desdeActa ? { serie: desdeActa.serie, acta_id: desdeActa.id } : null, actasP);
      $('#nlMailBox', modal).innerHTML = '<label class="switch-row"><span class="switch"><input type="checkbox" id="nlMail" checked><span class="track"></span><span class="knob"></span></span>' +
        '<span class="grow"><strong>Avisar por correo a los suscriptores</strong><span>' + subs + ' personas tienen activadas las alertas de publicaciones nuevas.</span></span></label>';
      var fotosP = gestorFotos($('#nlFotos', modal), []);
      enlazarActa();
      $('#prodForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = $('button[type=submit]', this);
        try {
          var p = await guardarProducto(null, fotosP, btn);
          if (!p) { busy(btn, false); return; }
          var aviso = 'Ya está en el catálogo con su enlace propio.';
          if ($('#nlMail', modal).checked && subs) {
            try { var r = await api.notificar('nuevo_producto', { id: p.id }); aviso += ' ' + msgCorreo(r, 'Se avisó por correo a ' + (r.enviados || 0) + ' suscriptores.'); } catch (e2) { aviso += ' No se pudo mandar el aviso por correo.'; }
          }
          body.innerHTML = exitoPublicado(p, aviso, false);
        } catch (err) { busy(btn, false); $('#nlErr', modal).innerHTML = '<p class="err">' + esc(traducir(err)) + '</p>'; }
      });
    }

    else if (tab === 'editar') {
      var pe = porId(extra && extra.id); if (!pe) { pintarAdmin('inventario'); return; }
      var org = null, actasE = [];
      try { org = await api.origen(pe.id); } catch (e) { }
      try { actasE = await api.actas(); } catch (e) { }
      pe._titulo = pe.titulo; pe._precio = pe.precio; pe._portada = fotosDe(pe)[0]; pe._grado = pe.grado;
      body.innerHTML = '<div style="display:flex; align-items:center; gap:10px"><button class="btn xs ghost" type="button" data-go="inventario">← Inventario</button><strong style="font-family:var(--display)">Editar publicación</strong></div>' +
        formProducto(pe, org, actasE);
      $('#nlMailBox', modal).innerHTML = '<label class="switch-row"><span class="switch"><input type="checkbox" id="nlMail" checked><span class="track"></span><span class="knob"></span></span>' +
        '<span class="grow"><strong>Si baja el precio, avisar a los suscriptores</strong><span>Solo se manda si el precio nuevo es menor al actual (' + money(pe.precio) + ').</span></span></label>';
      var fotosE = gestorFotos($('#nlFotos', modal), fotosDe(pe));
      enlazarActa();
      $('#prodForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = $('button[type=submit]', this), antes = Number(pe.precio);
        try {
          var p = await guardarProducto(pe, fotosE, btn);
          if (!p) { busy(btn, false); return; }
          var aviso = '';
          if (Number(p.precio) < antes && $('#nlMail', modal).checked && p.activo) {
            try { var r = await api.notificar('baja_precio', { id: p.id, antes: antes }); aviso = msgCorreo(r, 'Avisamos de la bajada a ' + (r.enviados || 0) + ' suscriptores.'); } catch (e2) { aviso = 'No se pudo mandar el aviso de bajada.'; }
          }
          body.innerHTML = exitoPublicado(p, aviso, true);
        } catch (err) { busy(btn, false); $('#nlErr', modal).innerHTML = '<p class="err">' + esc(traducir(err)) + '</p>'; }
      });
    }

    else if (tab === 'inventario') {
      body.innerHTML = productos.length ? '<div class="rows">' + productos.map(function (p) {
        var nf = fotosDe(p).length;
        return '<div class="row-item"><span class="mini">' + media(p, { video: false }) + '</span>' +
          '<span class="grow"><strong>' + esc(p.titulo) + '</strong><span class="sub">' + esc(p.categoria) + ' · grado ' + esc(p.grado) + ' · ' + nf + (nf === 1 ? ' foto' : ' fotos') + (p.serie ? ' · ' + esc(p.serie) : ' · sin serie') + '</span>' +
          '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
          '<button class="btn xs" type="button" data-edit="' + esc(p.id) + '">Editar</button>' +
          (p.activo ? '<button class="btn xs ghost" type="button" data-copy="' + esc(linkDe(p)) + '">Copiar enlace</button>' : '') +
          '<button class="btn xs ghost" type="button" data-toggle="' + esc(p.id) + '">' + (p.activo ? 'Marcar como vendida' : 'Volver a publicar') + '</button>' +
          '<button class="btn xs ghost danger" type="button" data-del="' + esc(p.id) + '">Eliminar</button>' +
          '</span></span>' +
          '<span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(p.precio) + '</span>' +
          '<span class="pill ' + (p.activo ? 'ok' : '') + '">' + (p.activo ? 'publicada' : 'vendida') + '</span></span></div>';
      }).join('') + '</div>' : '<div class="empty"><strong>Todavía no hay publicaciones.</strong><br><button class="btn sm" type="button" data-go="publicar" style="margin-top:12px">Publicar la primera</button></div>';

      body.addEventListener('click', async function (e) {
        var ed = e.target.closest('[data-edit]'), tg = e.target.closest('[data-toggle]'), dl = e.target.closest('[data-del]');
        try {
          if (ed) { pintarAdmin('editar', { id: ed.dataset.edit }); }
          else if (tg) {
            var p2 = porId(tg.dataset.toggle);
            var r2 = await api.editarProducto(p2.id, { activo: !p2.activo }); Object.assign(p2, r2 || { activo: !p2.activo }); render(); pintarContador();
            pintarAdmin('inventario');
          } else if (dl) {
            var p3 = porId(dl.dataset.del);
            if (!window.confirm('¿Eliminar "' + p3.titulo + '" del catálogo? No se puede deshacer. Si ya se vendió, mejor marcala como vendida: así cuenta en el contador.')) return;
            await api.borrarProducto(p3.id);
            productos = productos.filter(function (x) { return x.id !== p3.id; });
            render(); toast('Publicación eliminada.'); pintarAdmin('inventario');
          }
        } catch (err) { toast(traducir(err)); }
      });
    }

    else if (tab === 'ofertas') {
      var ofs2 = [], falloOf = null, actasO = [];
      try { ofs2 = await api.ofertas(); } catch (e) { falloOf = e; }
      try { actasO = await api.actas(); } catch (e) { }
      if (falloOf) { body.innerHTML = errorCaja(falloOf); return; }
      var ESTADO_OF = { pendiente: 'pendiente', cotizada: 'cotizada', aceptada: 'aceptada', rechazada: 'rechazada', comprada: 'comprada' };
      body.innerHTML = ofs2.length ? nota('Cuando compres una consola, tocá <b>Registrar compra</b> con el vendedor presente: se llena el acta con su DUI y la serie, y queda lista para imprimir y firmar.') +
        '<div class="rows">' + ofs2.map(function (o) {
          var tel = telOk(o.telefono);
          var acta = o.acta_id ? actasO.filter(function (a) { return a.id === o.acta_id; })[0] : null;
          return '<div class="row-item' + (nuevosIds[o.id] ? ' nuevo' : '') + '"><span class="mini">' + ((o.imagenes || [])[0] ? '<img src="' + esc(o.imagenes[0]) + '" alt="">' : ART[ART_CAT[o.categoria] || 'consola']) + '</span>' +
            '<span class="grow"><strong>' + esc(o.titulo) + '</strong>' +
            '<span class="sub">' + esc(o.nombre || o.correo) + ' · ' + esc(o.ubicacion) + ' · grado ' + esc(o.grado) + ' · ' + esc(fecha(o.creado_en)) + '</span>' +
            '<span class="sub">Serie: <b class="mono">' + esc(o.serie || '—') + '</b> · Respaldo: ' + esc(o.comprobante_origen || '—') +
            (o.declaracion_en ? ' · <span style="color:var(--ok)">declaró procedencia lícita</span>' : '') + '</span>' +
            '<span class="sub" style="margin-top:4px">' + esc(o.descripcion) + '</span>' + fotos(o) +
            (o.cotizacion ? '<span class="sub" style="margin-top:6px">Tu cotización: <b class="mono">' + money(o.cotizacion) + '</b></span>' : '') +
            '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
            (tel ? '<a class="btn xs wa" href="' + waLink('503' + tel, 'Hola ' + (o.nombre || '') + ', te escribimos de Ttoms por tu ' + o.titulo + '.') + '" target="_blank" rel="noopener">WhatsApp ' + esc(telBonito(tel)) + '</a>' : '') +
            (o.estado === 'pendiente' || o.estado === 'cotizada' ? '<button class="btn xs" type="button" data-quote="' + esc(o.id) + '">Cotizar</button>' +
              '<button class="btn xs ghost" type="button" data-accept="' + esc(o.id) + '">Aceptar ' + money(o.precio_esperado) + '</button>' +
              '<button class="btn xs ghost danger" type="button" data-reject="' + esc(o.id) + '">Rechazar</button>' : '') +
            (o.estado === 'cotizada' || o.estado === 'aceptada' ? '<button class="btn xs amber" type="button" data-acta="' + esc(o.id) + '">Registrar compra (acta)</button>' : '') +
            (acta ? '<a class="btn xs ghost" href="/acta.html?id=' + encodeURIComponent(acta.id) + '" target="_blank" rel="noopener">Acta ' + esc(acta.numero) + '</a>' : '') +
            '</span></span><span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(o.precio_esperado) + '</span>' +
            '<span class="pill ' + (o.estado === 'aceptada' || o.estado === 'comprada' ? 'ok' : (o.estado === 'rechazada' ? 'bad' : 'warn')) + '">' + esc(ESTADO_OF[o.estado] || o.estado) + '</span></span></div>';
        }).join('') + '</div>' : '<div class="empty"><strong>No hay ofertas todavía.</strong><br>Cuando alguien te ofrezca su consola, aparece acá.</div>';

      body.addEventListener('click', async function (e) {
        var q = e.target.closest('[data-quote]'), a2 = e.target.closest('[data-accept]'), r2 = e.target.closest('[data-reject]'), ac = e.target.closest('[data-acta]');
        var id = q ? q.dataset.quote : (a2 ? a2.dataset.accept : (r2 ? r2.dataset.reject : (ac ? ac.dataset.acta : null)));
        if (!id) return;
        var o = ofs2.filter(function (x) { return String(x.id) === String(id); })[0]; if (!o) return;
        if (ac) {
          body.innerHTML = '<button class="btn xs ghost" type="button" data-go="ofertas" style="justify-self:start">← Ofertas</button>' + formActa(o, actasO);
          montarActa(o, actasO, function (a) { body.innerHTML = exitoActa(a); contarPendientes(); });
          return;
        }
        try {
          var r;
          if (q) {
            var v = window.prompt('¿Cuánto le ofrecés por "' + o.titulo + '"?', String(Math.round(o.precio_esperado * 0.85)));
            if (v === null) return;
            var n = Number(String(v).replace(/[^\d.]/g, ''));
            if (!n) { toast('Escribí un monto válido.'); return; }
            await api.editarOferta(o.id, { estado: 'cotizada', cotizacion: n });
          } else if (a2) {
            await api.editarOferta(o.id, { estado: 'aceptada', cotizacion: o.precio_esperado });
          } else {
            if (!window.confirm('¿Rechazar la oferta de ' + (o.nombre || 'este cliente') + '?')) return;
            await api.editarOferta(o.id, { estado: 'rechazada' });
          }
          try { r = await api.notificar('oferta_respuesta', { id: o.id }); } catch (e2) { r = null; }
          toast('Oferta actualizada. ' + (r && r.enviados ? 'Le avisamos por correo.' : msgCorreo(r, '')));
          contarPendientes(); pintarAdmin('ofertas');
        } catch (err) { toast(traducir(err)); }
      });
    }

    else if (tab === 'actas') {
      var actas = [], falloA = null;
      try { actas = await api.actas(); } catch (e) { falloA = e; }
      if (falloA) { body.innerHTML = errorCaja(falloA); return; }
      body.innerHTML = nota('Cada consola que comprás debe tener su acta: nombre y DUI del vendedor, serie, precio y su declaración firmada. Se guardan 10 años y solo las ven ustedes. Es lo que demuestra que compraron de buena fe si alguna vez aparece una consola robada.') +
        '<div class="row-btns" style="margin-top:0"><button class="btn" type="button" id="nuevaActa">Nueva acta de compra</button>' +
        '<input id="buscaSerie" class="search" style="height:44px; flex:1 1 220px; border:1px solid var(--line-2); padding:0 16px" placeholder="Buscar por serie o nombre…"></div>' +
        '<div class="rows" id="listaActas"></div>';
      var pintarLista = function (filtroTxt) {
        var f = serieNormal(filtroTxt), t = String(filtroTxt || '').toLowerCase();
        var lista = actas.filter(function (a) { return !filtroTxt || serieNormal(a.serie).indexOf(f) >= 0 || String(a.vendedor_nombre).toLowerCase().indexOf(t) >= 0; });
        $('#listaActas', modal).innerHTML = lista.length ? lista.map(function (a) {
          return '<div class="row-item"><span class="mini">' + ART.consola + '</span>' +
            '<span class="grow"><strong>' + esc(a.numero) + ' · ' + esc(a.articulo) + '</strong>' +
            '<span class="sub">Serie <b class="mono">' + esc(a.serie) + '</b> · ' + esc(fecha(a.fecha)) + '</span>' +
            '<span class="sub">Vendedor: ' + esc(a.vendedor_nombre) + ' · ' + esc(a.documento_tipo) + ' ' + esc(a.documento_numero) + '</span>' +
            '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
            '<a class="btn xs" href="/acta.html?id=' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener">Imprimir</a>' +
            '<button class="btn xs ghost" type="button" data-pub-acta="' + esc(a.id) + '">Publicar esta consola</button></span></span>' +
            '<span class="mono">' + money(a.monto) + '</span></div>';
        }).join('') : '<div class="empty"><strong>' + (actas.length ? 'Ninguna acta coincide.' : 'Todavía no hay actas.') + '</strong></div>';
      };
      pintarLista('');
      $('#buscaSerie', modal).addEventListener('input', function () { pintarLista(this.value.trim()); });
      $('#nuevaActa', modal).addEventListener('click', function () {
        body.innerHTML = '<button class="btn xs ghost" type="button" data-go="actas" style="justify-self:start">← Actas</button>' + formActa(null, actas);
        montarActa(null, actas, function (a) { body.innerHTML = exitoActa(a); });
      });
    }

    else if (tab === 'ordenes') {
      var ords2 = [], falloOr = null;
      try { ords2 = await api.ordenes(); } catch (e) { falloOr = e; }
      if (falloOr) { body.innerHTML = errorCaja(falloOr); return; }
      body.innerHTML = (ords2.length ? nota('Marcá <b>Entregada</b> al entregar: la consola sale del catálogo, suma al contador, se activa la reseña verificada y el cliente recibe su comprobante con serie y garantía por correo.') +
        '<div class="rows">' + ords2.map(function (o) { return filaOrden(o, true); }).join('') + '</div>'
        : '<div class="empty"><strong>Sin pedidos todavía.</strong></div>');
      body.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-estado]'); if (!b) return;
        var o = ords2.filter(function (x) { return String(x.id) === b.dataset.id; })[0]; if (!o) return;
        var estado = b.dataset.estado, patch = { estado: estado };
        try {
          if (estado === 'cancelada' && !window.confirm('¿Cancelar el pedido ' + o.codigo + '?')) return;
          if (estado === 'entregada') {
            var org2 = null; try { org2 = await api.origen(o.producto_id); } catch (e2) { }
            if (!org2 || !org2.serie) {
              var sr = window.prompt('Número de serie de la consola que entregaste (va en el comprobante del cliente). Dejalo vacío si es un accesorio sin serie.', '');
              if (sr === null) return;
              if (sr.trim()) patch.serie = sr.trim();
            }
          }
          busy(b, true, '…');
          await api.editarOrden(o.id, patch);
          var extraMsg = '';
          if (estado === 'entregada') {
            try { var r = await api.notificar('entregada', { id: o.id }); extraMsg = r && r.enviados ? ' Le mandamos el comprobante por correo.' : ' ' + msgCorreo(r, ''); } catch (e3) { }
            cargarResenas();
          }
          if (estado === 'entregada' || estado === 'pagada') { try { productos = await api.productos(); render(); pintarContador(); } catch (e4) { } }
          toast('Pedido actualizado.' + extraMsg); contarPendientes(); pintarAdmin('ordenes');
        } catch (err) { busy(b, false); toast(traducir(err)); }
      });
    }

    else if (tab === 'resenas') {
      var rs = [];
      try { rs = await api.resenas(); } catch (e) { }
      body.innerHTML = rs.length ? '<div class="rows">' + rs.map(function (r) {
        return '<div class="row-item"><span class="avatar sm">' + esc(initials(r.nombre)) + '</span>' +
          '<span class="grow"><strong>' + esc(r.nombre) + ' ' + estrellas(r.estrellas) + '</strong>' +
          '<span class="sub">' + esc(r.departamento || '') + ' · ' + esc(fecha(r.creado_en)) + (r.verificada ? ' · compra verificada' : ' · sin compra registrada') + '</span>' +
          '<span class="sub" style="margin-top:4px">' + esc(r.texto) + '</span>' +
          '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
          '<button class="btn xs ghost" type="button" data-vis="' + esc(r.id) + '" data-v="' + (r.visible === false ? '1' : '0') + '">' + (r.visible === false ? 'Mostrar' : 'Ocultar') + '</button>' +
          '<button class="btn xs ghost danger" type="button" data-rdel="' + esc(r.id) + '">Eliminar</button></span></span>' +
          '<span class="pill ' + (r.visible === false ? '' : 'ok') + '">' + (r.visible === false ? 'oculta' : 'publicada') + '</span></div>';
      }).join('') + '</div>' : '<div class="empty"><strong>Sin reseñas todavía.</strong><br>Al marcar un pedido como entregado, el cliente recibe un correo invitándolo a dejar la suya.</div>';
      body.addEventListener('click', async function (e) {
        var v = e.target.closest('[data-vis]'), d = e.target.closest('[data-rdel]');
        try {
          if (v) { await api.editarResena(v.dataset.vis, { visible: v.dataset.v === '1' }); }
          else if (d) { if (!window.confirm('¿Eliminar esta reseña?')) return; await api.borrarResena(d.dataset.rdel); }
          else return;
          cargarResenas(); pintarAdmin('resenas');
        } catch (err) { toast(traducir(err)); }
      });
    }

    else if (tab === 'correos') {
      var ec = { configurado: false }, log = [], gente3 = [];
      try { ec = await api.estadoCorreo(); } catch (e) { }
      try { log = await api.correosLog(); } catch (e) { }
      try { gente3 = await api.perfiles(); } catch (e) { }
      var conAlerta3 = gente3.filter(function (u) { return u.rol !== 'admin' && u.alertas && u.alertas.nuevas; });
      var pasos = '<ol style="margin:8px 0 0; padding-left:20px; color:var(--ink-2); font-size:14.5px; line-height:1.7">' +
        '<li>Entrá a <a href="https://myaccount.google.com/security" target="_blank" rel="noopener"><b>myaccount.google.com/security</b></a> con la cuenta de Gmail del negocio.</li>' +
        '<li>Activá la <b>Verificación en 2 pasos</b> (si ya está activa, seguí).</li>' +
        '<li>Abrí <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener"><b>Contraseñas de aplicaciones</b></a>, escribí el nombre <b>Ttoms web</b> y tocá Crear.</li>' +
        '<li>Google te muestra 16 letras. Copialas y pegalas aquí abajo.</li></ol>';
      body.innerHTML =
        (ec.configurado
          ? '<div class="trust"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg><div><strong>Los correos están activados</strong><span>Salen desde <b>' + esc(ec.usuario) + '</b>. Gmail permite unos 500 por día.</span></div></div>' +
            '<div class="row-btns" style="margin-top:0"><button class="btn" type="button" id="mailTest">Mandarme un correo de prueba</button><button class="btn ghost" type="button" id="mailChange">Cambiar la cuenta</button></div>'
          : '<div><h3 style="font-size:18px">Activar los correos automáticos</h3><p style="color:var(--ink-2); font-size:14.5px; margin-top:6px">Los correos salen desde su propio Gmail, gratis. Google pide una “contraseña de aplicación” (distinta de la contraseña normal) para que la web pueda enviar en su nombre.</p>' + pasos + '</div>') +
        '<form class="form-grid" id="mailForm"' + (ec.configurado ? ' hidden' : '') + ' novalidate>' +
        '<div class="form-field"><label for="mUser">Gmail del negocio</label><input id="mUser" type="email" value="' + esc(ec.usuario || (perfil && perfil.correo) || '') + '"></div>' +
        '<div class="form-field"><label for="mName">Nombre que ve el cliente</label><input id="mName" value="' + esc(CFG.marca || 'Ttoms') + '"></div>' +
        '<div class="form-field full"><label for="mPass">Contraseña de aplicación (16 letras)</label><input id="mPass" type="password" autocomplete="off" placeholder="abcd efgh ijkl mnop"><span class="hint">Se guarda en el servidor, en un lugar que nadie puede leer desde la web: ni desde este panel se vuelve a ver, solo se reemplaza.</span></div>' +
        '<div class="full" id="mErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Guardar y mandar un correo de prueba</button></div></form>' +
        '<div><p class="eyebrow" style="margin:8px 0 9px">Qué se envía solo</p><ul style="margin:0; padding-left:20px; color:var(--ink-2); font-size:14px; line-height:1.7">' +
        '<li>Confirmación de cada pedido al comprador (lo exige la Ley de Protección al Consumidor, art. 21-B) y aviso a ustedes.</li>' +
        '<li>Comprobante con serie y garantía cuando marcan un pedido como entregado.</li>' +
        '<li>Acuse al que ofrece su consola, aviso a ustedes y la respuesta cuando cotizan, aceptan o rechazan.</li>' +
        '<li>Publicaciones nuevas y bajadas de precio a los suscriptores (si lo marcan al publicar).</li>' +
        '<li>“Te respondimos en el chat” cuando contestan un mensaje (máximo uno cada 20 minutos).</li></ul></div>' +
        '<form class="form-grid" id="blastForm" novalidate>' +
        '<div class="form-field full"><p class="eyebrow" style="margin:8px 0 0">Anuncio a suscriptores (' + conAlerta3.length + ')</p></div>' +
        '<div class="form-field full"><label for="bsSubject">Asunto</label><input id="bsSubject" placeholder="Ej. Entraron 4 consolas nuevas esta semana"></div>' +
        '<div class="form-field full"><label for="bsBody">Mensaje</label><textarea id="bsBody" rows="3" placeholder="Contá qué entró, precios y hasta cuándo dura."></textarea></div>' +
        '<div class="form-field full"><button class="btn block ghost" type="submit">Enviar anuncio a ' + conAlerta3.length + ' suscriptores</button></div></form>' +
        '<div class="mail-log"><p class="eyebrow" style="margin:8px 0 9px">Últimos envíos</p><div class="rows">' +
        (log.length ? log.map(function (l) {
          return '<div class="row-item"><span class="grow"><strong style="font-size:14px">' + esc(l.asunto || l.tipo) + '</strong><span class="sub">' + esc(l.para || '') + ' · ' + esc(new Date(l.enviado_en).toLocaleString('es-SV')) + '</span>' +
            (l.error ? '<span class="sub" style="color:var(--bad)">' + esc(l.error) + '</span>' : '') + '</span>' +
            '<span class="pill ' + (l.ok ? 'ok' : 'bad') + '">' + (l.ok ? 'enviado' : 'falló') + '</span></div>';
        }).join('') : '<div class="empty" style="padding:24px">Todavía no se ha enviado ningún correo.</div>') + '</div></div>';

      var probar = async function (btn) {
        busy(btn, true, 'Enviando prueba…');
        try {
          var r = await api.notificar('prueba');
          busy(btn, false);
          if (r && r.ok) toast('Listo: revisá tu bandeja de entrada (' + (perfil && perfil.correo) + ').');
          else toast(r && r.motivo === 'sin-configurar' ? 'Primero guardá la cuenta de Gmail.' : 'Gmail no aceptó el envío. Revisá la contraseña de aplicación (abajo sale el error).');
          pintarAdmin('correos');
        } catch (e) { busy(btn, false); toast('No se pudo enviar: ' + traducir(e)); }
      };
      if ($('#mailTest', modal)) $('#mailTest', modal).addEventListener('click', function () { probar(this); });
      if ($('#mailChange', modal)) $('#mailChange', modal).addEventListener('click', function () { $('#mailForm', modal).hidden = false; this.hidden = true; });
      $('#mailForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var u = $('#mUser', modal).value.trim(), pw = $('#mPass', modal).value.replace(/\s/g, ''), err = $('#mErr', modal);
        if (!validEmail(u)) { err.innerHTML = '<p class="err">Escribí el Gmail del negocio.</p>'; return; }
        if (pw.length !== 16) { err.innerHTML = '<p class="err">La contraseña de aplicación tiene 16 letras (sin contar espacios). No es la contraseña normal de Gmail.</p>'; return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Guardando…');
        try { await api.guardarCorreo(u, pw, $('#mName', modal).value.trim() || 'Ttoms'); $('#mPass', modal).value = ''; await probar(btn); }
        catch (e2) { busy(btn, false); err.innerHTML = '<p class="err">' + esc(traducir(e2)) + '</p>'; }
      });
      $('#blastForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var s = $('#bsSubject', modal).value.trim(), b = $('#bsBody', modal).value.trim();
        if (s.length < 4 || b.length < 10) { toast('Escribí asunto y mensaje del anuncio.'); return; }
        if (!conAlerta3.length) { toast('Todavía no hay suscriptores con alertas activas.'); return; }
        if (!window.confirm('¿Enviar el anuncio a ' + conAlerta3.length + ' suscriptores?')) return;
        var btn = $('button[type=submit]', this); busy(btn, true, 'Enviando…');
        try {
          var r = await api.notificar('anuncio', { asunto: s, cuerpo: b });
          busy(btn, false);
          toast(r && r.motivo === 'sin-configurar' ? 'Primero activá los correos (arriba).' : 'Anuncio enviado a ' + (r.enviados || 0) + ' suscriptores.');
          pintarAdmin('correos');
        } catch (err) { busy(btn, false); toast('No se pudo enviar: ' + traducir(err)); }
      });
    }

    else {
      var gente2 = [];
      try { gente2 = await api.perfiles(); } catch (e) { }
      var compradores = gente2.filter(function (u) { return u.rol !== 'admin'; });
      var conAlerta = compradores.filter(function (u) { return u.alertas && u.alertas.nuevas; });
      body.innerHTML =
        '<div class="stat-row">' +
        '<div class="stat"><b>' + compradores.length + '</b><span>Cuentas de comprador</span></div>' +
        '<div class="stat"><b>' + conAlerta.length + '</b><span>Con alertas de novedades</span></div>' +
        '</div>' +
        '<div class="row-btns" style="margin-top:0"><button class="btn ghost" type="button" id="copyMails">Copiar los ' + conAlerta.length + ' correos</button>' +
        '<button class="btn ghost" type="button" data-go="correos">Enviar un anuncio</button></div>' +
        '<div><p class="eyebrow" style="margin:4px 0 9px">Clientes</p><div class="rows">' +
        compradores.map(function (u) {
          var on = ['nuevas', 'bajadas', 'ofertas'].filter(function (k) { return u.alertas && u.alertas[k]; });
          var tel = telOk(u.telefono);
          return '<div class="row-item"><span class="avatar sm">' + esc(initials(u.nombre)) + '</span>' +
            '<span class="grow"><strong>' + esc(u.nombre) + (u.nombre_completo ? ' <span class="sub" style="display:inline">(' + esc(u.nombre_completo) + ')</span>' : '') + '</strong>' +
            '<span class="sub">' + esc(u.correo) + (tel ? ' · WhatsApp ' + esc(telBonito(tel)) : '') + ' · ' + esc(u.departamento || 'sin departamento') + ' · desde ' + esc(fecha(u.creado_en)) + '</span></span>' +
            '<span class="pill ' + (on.length ? 'ok' : '') + '">' + (on.length ? on.length + ' alertas' : 'sin alertas') + '</span></div>';
        }).join('') + '</div></div>';
      $('#copyMails', modal).addEventListener('click', function () {
        copiar(conAlerta.map(function (u) { return u.correo; }).join(', '), 'Correos copiados al portapapeles.');
      });
    }
  }

  function filaOrden(o, acciones) {
    var btns = '', tel = telOk(o.telefono);
    if (acciones && o.estado !== 'entregada' && o.estado !== 'cancelada') {
      btns = '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
        (tel ? '<a class="btn xs wa" href="' + waLink('503' + tel, 'Hola ' + (o.nombre_cliente || '') + ', te escribimos de Ttoms por tu pedido ' + o.codigo + ' (' + (o.titulo_producto || '') + '). ¿Qué día y hora te queda bien?') + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
        (o.estado === 'pendiente' ? '<button class="btn xs ghost" type="button" data-estado="pagada" data-id="' + esc(o.id) + '">Pagada</button>' : '') +
        '<button class="btn xs" type="button" data-estado="entregada" data-id="' + esc(o.id) + '">Entregada</button>' +
        '<button class="btn xs ghost danger" type="button" data-estado="cancelada" data-id="' + esc(o.id) + '">Cancelar</button></span>';
    } else if (acciones) {
      btns = '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap"><a class="btn xs ghost" href="/comprobante.html?o=' + encodeURIComponent(o.codigo) + '" target="_blank" rel="noopener">Comprobante</a></span>';
    }
    var p = porId(o.producto_id);
    return '<div class="row-item' + (nuevosIds[o.id] ? ' nuevo' : '') + '"><span class="mini">' + (p ? media(p, { video: false }) : ART.consola) + '</span>' +
      '<span class="grow"><strong>' + esc(o.titulo_producto || 'Consola') + '</strong>' +
      '<span class="sub">' + esc(o.codigo) + ' · ' + esc(o.nombre_cliente || o.correo || '') + (tel ? ' · ' + esc(telBonito(tel)) : '') + ' · ' + esc(o.metodo_pago) + ' · ' + esc(fecha(o.creado_en)) + '</span>' +
      (o.punto_entrega ? '<span class="sub">Entrega: ' + esc(o.punto_entrega) + '</span>' : '') +
      (o.nota ? '<span class="sub">Horario: ' + esc(o.nota) + '</span>' : '') +
      (o.serie ? '<span class="sub">Serie: <span class="mono">' + esc(o.serie) + '</span></span>' : '') + btns + '</span>' +
      '<span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(o.monto) + '</span>' +
      '<span class="pill ' + (o.estado === 'entregada' ? 'ok' : (o.estado === 'cancelada' ? 'bad' : 'warn')) + '">' + esc(ESTADO_ORDEN[o.estado] || o.estado) + '</span></span></div>';
  }

  /* ---------------- chat ---------------- */
  var dock = null, hiloActivo = null;

  function hilos() {
    var mapa = {};
    mensajes.forEach(function (m) {
      var clave = m.user_id + '|' + m.producto_id;
      if (!mapa[clave]) mapa[clave] = { clave: clave, user_id: m.user_id, producto_id: m.producto_id, nombre: m.nombre_cliente || 'Cliente', msgs: [] };
      if (m.nombre_cliente) mapa[clave].nombre = m.nombre_cliente;
      mapa[clave].msgs.push(m);
    });
    var lista = Object.keys(mapa).map(function (k) { return mapa[k]; });
    if (!esAdmin() && perfil) lista = lista.filter(function (h) { return h.user_id === perfil.id; });
    return lista.sort(function (a, b) {
      return new Date(b.msgs[b.msgs.length - 1].creado_en) - new Date(a.msgs[a.msgs.length - 1].creado_en);
    });
  }
  function refrescarBadge() {
    var n = 0;
    hilos().forEach(function (h) {
      var ult = h.msgs[h.msgs.length - 1];
      if (esAdmin() ? ult.autor === 'cliente' : ult.autor === 'admin') n++;
    });
    var el = $('#chatCount'); el.textContent = n; el.hidden = n === 0;
    $('#chatDotMobile').hidden = n === 0;
  }
  function abrirDock() {
    if (dock) return;
    dock = document.createElement('section');
    dock.className = 'chat-dock'; dock.setAttribute('aria-label', 'Mensajes');
    document.body.classList.add('chat-open');
    document.body.appendChild(dock); renderDock();
  }
  function cerrarDock() { if (dock) { dock.remove(); dock = null; hiloActivo = null; } document.body.classList.remove('chat-open'); }

  function renderDock() {
    if (!dock) return;
    var lista = hilos();
    if (!hiloActivo) {
      dock.innerHTML =
        '<div class="chat-head"><h3>' + (esAdmin() ? 'Conversaciones' : 'Chat con ' + esc(CFG.marca || 'Ttoms')) + '</h3>' +
        '<span class="sub">' + lista.length + '</span>' +
        '<button class="close" type="button" data-act="close" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
        (lista.length ? '<div class="chat-list">' + lista.map(function (h) {
          var p = porId(h.producto_id), ult = h.msgs[h.msgs.length - 1];
          return '<button class="thread-row" type="button" data-k="' + esc(h.clave) + '">' +
            '<span class="avatar sm">' + esc(esAdmin() ? initials(h.nombre) : 'TT') + '</span>' +
            '<span style="min-width:0; flex:1"><span style="display:flex; gap:8px; align-items:center">' +
            '<span class="who">' + esc(esAdmin() ? h.nombre : (p ? p.titulo : 'Consulta')) + '</span>' +
            '<span class="when">' + esc(hora(ult.creado_en)) + '</span></span>' +
            (esAdmin() && p ? '<span class="last">' + esc(p.titulo) + '</span>' : '') +
            '<span class="last">' + (ult.autor === (esAdmin() ? 'admin' : 'cliente') ? 'Vos: ' : '') + esc(ult.texto) + '</span></span></button>';
        }).join('') + '</div>'
          : '<div class="empty" style="margin:16px; border:0">' + (perfil ? 'No tenés conversaciones todavía. Entrá a una consola y tocá “Preguntar por chat”.' : 'Ingresá a tu cuenta para escribirnos por chat.') + '</div>') +
        (perfil ? '' : '<div class="composer"><button class="btn block" type="button" data-act="login">Ingresar para escribir</button></div>');
    } else {
      var h = lista.filter(function (x) { return x.clave === hiloActivo; })[0];
      if (!h) { hiloActivo = null; return renderDock(); }
      var p = porId(h.producto_id);
      dock.innerHTML =
        '<div class="chat-head">' +
        '<button class="close" type="button" data-act="back" aria-label="Volver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"/></svg></button>' +
        '<h3>' + esc(esAdmin() ? h.nombre : (CFG.marca || 'Ttoms')) + '</h3>' +
        '<button class="close" type="button" data-act="close" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
        (p ? '<div class="ctx"><span class="mini">' + media(p, { video: false }) + '</span><span class="nm">' + esc(p.titulo) + '</span><span class="pr">' + money(p.precio) + '</span></div>' : '') +
        '<div class="msgs" id="msgs">' + h.msgs.map(function (m) {
          var mio = esAdmin() ? m.autor === 'admin' : m.autor === 'cliente';
          return '<div class="bubble' + (mio ? ' me' : '') + '">' + esc(m.texto) + '<span class="t">' + esc(hora(m.creado_en)) + '</span></div>';
        }).join('') + '</div>' +
        (esAdmin() ? '' : '<div class="quick-row">' +
          '<button type="button" data-q="¿Sigue disponible?">¿Sigue disponible?</button>' +
          '<button type="button" data-q="¿Dónde y a qué hora me la pueden entregar?">¿Dónde nos vemos?</button>' +
          '<button type="button" data-q="¿Aceptan una oferta más baja?">Hacer una oferta</button>' +
          '<button type="button" data-q="¿Qué incluye exactamente?">¿Qué incluye?</button></div>') +
        '<form class="composer" id="composer"><input id="msgInput" placeholder="Escribí un mensaje…" autocomplete="off" aria-label="Mensaje">' +
        '<button class="send" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 20 4l-8 16-2-6-6-2Z"/></svg></button></form>';
      var m = $('#msgs', dock); m.scrollTop = m.scrollHeight;
    }
  }

  async function enviarChat(texto, userId, productoId) {
    var m = {
      user_id: userId, producto_id: productoId, autor: esAdmin() ? 'admin' : 'cliente',
      nombre_cliente: esAdmin() ? undefined : perfil.nombre, texto: texto
    };
    if (m.nombre_cliente === undefined) delete m.nombre_cliente;
    try {
      var guardado = await api.enviarMensaje(m);
      if (!mensajes.some(function (x) { return x.id === guardado.id; })) mensajes.push(guardado);
      if (esAdmin() && guardado && guardado.id) api.notificar('chat', { id: guardado.id }).catch(function () { });
      renderDock(); refrescarBadge();
    } catch (e) { toast('No se pudo enviar el mensaje: ' + traducir(e)); }
  }

  function abrirHilo(productoId, primerMensaje) {
    if (!perfil) { abrirAuth('login', function () { abrirHilo(productoId, primerMensaje); }, 'Ingresá para escribirnos por chat.'); return; }
    abrirDock();
    hiloActivo = perfil.id + '|' + productoId;
    var existe = hilos().some(function (h) { return h.clave === hiloActivo; });
    if (!existe && !primerMensaje) primerMensaje = 'Hola, me interesa esta consola. ¿Sigue disponible?';
    renderDock();
    if (primerMensaje) enviarChat(primerMensaje, perfil.id, productoId);
    var i = $('#msgInput', dock); if (i) i.focus();
  }

  /* ---------------- eventos globales ---------------- */
  function conectarEventos() {
    $('#themeBtn').addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var oscuro = cur ? cur === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', oscuro ? 'light' : 'dark');
    });
    $('#q').addEventListener('input', function () { filtro.q = this.value.trim(); render(); });
    $('#catTiles').addEventListener('click', function (e) { var t = e.target.closest('.tile'); if (t) elegirCat(t.dataset.c, true); });
    $('#heroFeature').addEventListener('click', function (e) { var f = e.target.closest('.feat[data-id]'); if (f) abrirFicha(f.dataset.id); });
    $('#newRail').addEventListener('click', function (e) { var c = e.target.closest('.card'); if (c) abrirFicha(c.dataset.id); });
    $$('[data-rail]').forEach(function (b) {
      b.addEventListener('click', function () { var r = $('#newRail'); r.scrollBy({ left: Number(b.dataset.rail) * r.clientWidth * .8, behavior: 'smooth' }); });
    });
    $('#howTabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-how]'); if (!b) return;
      $$('#howTabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      $('#howComprar').hidden = b.dataset.how !== 'comprar';
      $('#howVender').hidden = b.dataset.how !== 'vender';
      glide($('#howTabs'), $('#howGlide'));
    });
    $('#accountBtnMobile').addEventListener('click', function () { perfil ? abrirCuenta('perfil') : abrirAuth('login'); });
    $('#chatBtnMobile').addEventListener('click', function () { if (dock) cerrarDock(); else { hiloActivo = null; abrirDock(); } });
    montarFotos();
    $('#fGrade').addEventListener('change', function () { filtro.grado = this.value; render(); });
    $('#fSort').addEventListener('change', function () { filtro.orden = this.value; render(); });
    $('#grid').addEventListener('click', function (e) {
      var c = e.target.closest('.card'); if (c && c.dataset.id) abrirFicha(c.dataset.id);
    });
    $('#accountBtn').addEventListener('click', function () { perfil ? abrirCuenta('perfil') : abrirAuth('login'); });
    $('#adminShortcut').addEventListener('click', function () { abrirAdmin('resumen'); });
    $('#writeReview').addEventListener('click', abrirResena);
    $('#chatBtn').addEventListener('click', function () { if (dock) cerrarDock(); else { hiloActivo = null; abrirDock(); } });

    document.addEventListener('keydown', function (e) {
      var lb = $('.lightbox');
      if (lb) {
        var tr = $('.lb-track', lb);
        if (e.key === 'Escape') lb.remove();
        else if (e.key === 'ArrowRight') tr.scrollBy({ left: tr.clientWidth, behavior: 'smooth' });
        else if (e.key === 'ArrowLeft') tr.scrollBy({ left: -tr.clientWidth, behavior: 'smooth' });
        return;
      }
      if (e.key === 'Escape') cerrar();
    });
    document.addEventListener('click', function (e) {
      var x = e.target.closest('[data-x]');
      if (x && ((panel && panel.contains(x)) || (modal && modal.contains(x)))) { cerrar(); return; }
      var o = e.target.closest('[data-open]');
      if (o) { e.preventDefault(); o.dataset.open === 'auth' ? abrirAuth(perfil ? 'login' : 'signup') : abrirCuenta('perfil'); return; }
      if (!dock) return;
      var row = e.target.closest('.thread-row');
      if (row && dock.contains(row)) { hiloActivo = row.dataset.k; renderDock(); refrescarBadge(); return; }
      var b = e.target.closest('[data-act]');
      if (b && dock.contains(b)) {
        if (b.dataset.act === 'close') cerrarDock();
        else if (b.dataset.act === 'back') { hiloActivo = null; renderDock(); }
        else if (b.dataset.act === 'login') { cerrarDock(); abrirAuth('login'); }
        return;
      }
      var q = e.target.closest('.quick-row button');
      if (q && dock.contains(q) && hiloActivo) {
        var partes = hiloActivo.split('|');
        enviarChat(q.dataset.q, partes[0], partes[1]);
      }
    });
    document.addEventListener('submit', function (e) {
      if (dock && e.target.id === 'composer') {
        e.preventDefault();
        var input = $('#msgInput', dock), v = input.value.trim(); if (!v || !hiloActivo) return;
        input.value = '';
        var partes = hiloActivo.split('|');
        enviarChat(v, partes[0], partes[1]);
      }
    });

    /* oferta de venta */
    $('#sellForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var form = this;
      if (!perfil) { abrirAuth('signup', function () { form.dispatchEvent(new Event('submit', { cancelable: true })); }, 'Creá tu cuenta para darle seguimiento a la oferta.'); return; }
      var titulo = $('#sTitle').value.trim(), esperado = Number($('#sPrice').value);
      if (titulo.length < 4) { toast('Contanos qué consola querés vender.'); $('#sTitle').focus(); return; }
      if (!esperado || esperado < 5) { toast('Poné cuánto esperás recibir, al menos $5.'); $('#sPrice').focus(); return; }
      var serie = $('#sSerie').value.trim(), telv = $('#sTel').value.trim(), tel = telOk(telv);
      if ($('#sCat').value !== 'Accesorios' && serieNormal(serie).length < 4) { toast('Escribí el número de serie: viene en la etiqueta de abajo o de atrás de la consola.'); $('#sSerie').focus(); return; }
      if (telv && !tel) { toast('El WhatsApp tiene 8 dígitos (ej. 7000-0000).'); $('#sTel').focus(); return; }
      if (!$('#sDecl').checked) { toast('Marcá la declaración de que la consola es tuya y de procedencia lícita.'); $('#sDecl').closest('.check').classList.add('bad'); return; }
      if (!fotosVenta.length && !window.confirm('No agregaste fotos. Con fotos te cotizamos más rápido y más cerca del precio real. ¿Enviar igual?')) return;
      var btn = $('button[type=submit]', form);
      try {
        busy(btn, true, fotosVenta.length ? 'Subiendo fotos…' : 'Enviando…');
        var imagenes = await subirFotosVenta();
        busy(btn, true, 'Enviando…');
        await api.crearOferta({
          user_id: perfil.id, nombre: perfil.nombre, correo: perfil.correo, titulo: titulo,
          categoria: $('#sCat').value, grado: $('#sGrade').value, precio_esperado: esperado,
          ubicacion: $('#sLoc').value, descripcion: $('#sDesc').value.trim() || 'Sin detalles adicionales.',
          imagenes: imagenes, estado: 'pendiente', serie: serie || null, telefono: tel || null,
          comprobante_origen: $('#sOrigen').value, declaracion_en: new Date().toISOString()
        }).then(function (of) { if (of && of.id) api.notificar('oferta_nueva', { id: of.id }).catch(function () { }); return of; });
        if (tel && !perfil.telefono) { try { await api.guardarPerfil({ telefono: tel }); } catch (e3) { } }
        busy(btn, false); form.reset(); limpiarFotos(); $('#sDecl').closest('.check').classList.remove('bad');
        if (perfil.departamento) $('#sLoc').value = perfil.departamento;
        toast('¡Oferta enviada! Te respondemos en menos de 24 horas. El día de la venta traé tu DUI.');
      } catch (err) { busy(btn, false); toast('No se pudo enviar: ' + traducir(err)); }
    });

    /* alta rápida de alertas */
    $('#subForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var correo = $('#subEmail').value.trim();
      if (!validEmail(correo)) { toast('Escribí un correo válido.'); return; }
      if (perfil && perfil.correo.toLowerCase() === correo.toLowerCase()) {
        var a = Object.assign({}, ALERTAS_DEF, perfil.alertas || {}, { nuevas: true, bajadas: true });
        await api.guardarPerfil({ alertas: a });
        $('#subEmail').value = ''; toast('Listo, activamos las alertas en tu cuenta.');
        return;
      }
      $('#subEmail').value = '';
      abrirAuth('signup', null, 'Creá tu cuenta con ' + correo + ' y activamos las alertas.');
      setTimeout(function () { var f = $('#suEmail', modal); if (f) f.value = correo; }, 30);
    });
  }

  function refrescarCuenta() {
    $('#accountLabel').textContent = perfil ? String(perfil.nombre || perfil.correo).split(' ')[0] : 'Ingresar';
    $('#adminShortcut').hidden = !esAdmin();
    if (perfil && perfil.departamento) $('#sLoc').value = perfil.departamento;
    render();
    if (dock) renderDock();
    contarPendientes();
    conectarVivo();
  }

  /* ---------------- fotos de la oferta de venta ---------------- */
  var fotosVenta = [];
  function montarFotos() {
    var input = $('#sPhotos'), drop = $('#drop');
    input.addEventListener('change', function () { agregarFotos(this.files); this.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer) agregarFotos(e.dataTransfer.files); });
    $('#photoThumbs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      e.preventDefault();
      var i = Number(b.dataset.i); URL.revokeObjectURL(fotosVenta[i].url); fotosVenta.splice(i, 1); pintarFotos();
    });
  }
  function agregarFotos(lista) {
    Array.prototype.slice.call(lista || []).forEach(function (f) {
      if (!/^image\//.test(f.type) && !/\.(heic|heif)$/i.test(f.name)) { toast('Solo se aceptan fotos.'); return; }
      if (fotosVenta.length >= 4) { toast('Máximo 4 fotos por oferta.'); return; }
      if (f.size > 15 * 1024 * 1024) { toast(f.name + ' pesa demasiado (máx. 15 MB).'); return; }
      fotosVenta.push({ file: f, url: URL.createObjectURL(f) });
    });
    pintarFotos();
  }
  function pintarFotos() {
    var x = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    $('#photoThumbs').innerHTML = fotosVenta.map(function (f, i) {
      return '<figure><img src="' + f.url + '" alt="Foto ' + (i + 1) + '"><button type="button" data-i="' + i + '" aria-label="Quitar foto">' + x + '</button></figure>';
    }).join('');
    $('#drop strong').textContent = fotosVenta.length ? (fotosVenta.length + ' de 4 fotos · agregá más') : 'Agregá hasta 4 fotos';
  }
  // Reduce la foto a 1600 px y JPEG para que suba rápido con datos móviles.
  function comprimir(file) {
    return new Promise(function (ok) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b || b.size > 5 * 1024 * 1024) { ok(file); return; }
          ok(new File([b], (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', .84);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
      img.src = url;
    });
  }
  async function subirFotosVenta() {
    var urls = [];
    for (var i = 0; i < fotosVenta.length; i++) {
      var f = await comprimir(fotosVenta[i].file);
      urls.push(await api.subirArchivo(f, perfil.id, 'ofertas'));
    }
    return urls;
  }
  function limpiarFotos() {
    fotosVenta.forEach(function (f) { URL.revokeObjectURL(f.url); });
    fotosVenta = []; pintarFotos();
  }
})();
