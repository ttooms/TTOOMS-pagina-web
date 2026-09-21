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
  var FUERA = CFG.fueraDeSanSalvador || 'Fuera de San Salvador coordinamos la entrega por chat.';
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
    var out = '';
    if (p.imagen_url) out += '<img src="' + esc(p.imagen_url) + '" alt="' + esc(p.titulo) + '" loading="lazy">';
    else out += art;
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
    if (on) { btn.dataset.txt = btn.textContent; btn.textContent = txt || 'Un momento…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.txt || btn.textContent; btn.disabled = false; }
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
    async subirArchivo(file, carpeta) {
      var ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      var ruta = carpeta + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      var up = await sb.storage.from('productos').upload(ruta, file, { cacheControl: '3600', upsert: false });
      if (up.error) throw up.error;
      return sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
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
    async enviarCorreos(destinatarios, asunto, cuerpo) {
      if (!CFG.funcionCorreo) return { enviados: 0, motivo: 'sin-funcion' };
      var s = await sb.auth.getSession();
      var res = await fetch(CFG.funcionCorreo, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (s.data.session ? s.data.session.access_token : CFG.supabaseKey)
        },
        body: JSON.stringify({ destinatarios: destinatarios, asunto: asunto, cuerpo: cuerpo })
      });
      if (!res.ok) throw new Error('La función de correo respondió ' + res.status);
      return await res.json();
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
    async crearProducto(p) { p.id = 'p' + Date.now(); p.creado_en = new Date().toISOString(); demo.productos.unshift(p); demoSave(); return p; },
    async editarProducto(id, patch) { var p = demo.productos.filter(function (x) { return x.id === id; })[0]; Object.assign(p, patch); demoSave(); return p; },
    async borrarProducto(id) { demo.productos = demo.productos.filter(function (x) { return x.id !== id; }); demoSave(); },
    async subirArchivo(file) { return URL.createObjectURL(file); },
    async ordenes() { return demo.ordenes.slice(); },
    async crearOrden(o) { o.id = 'o' + Date.now(); o.creado_en = new Date().toISOString(); demo.ordenes.unshift(o); demoSave(); return o; },
    async editarOrden(id, patch) {
      var o = demo.ordenes.filter(function (x) { return x.id === id; })[0]; Object.assign(o, patch);
      if (patch.estado === 'entregada') demo.resenas.forEach(function (r) { if (r.user_id === o.user_id) r.verificada = true; });
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
    async crearOferta(o) { o.id = 'of' + Date.now(); o.creado_en = new Date().toISOString(); demo.ofertas.unshift(o); demoSave(); return o; },
    async editarOferta(id, patch) { var o = demo.ofertas.filter(function (x) { return x.id === id; })[0]; Object.assign(o, patch); demoSave(); return o; },
    async perfiles() { return demo.perfiles.slice(); },
    async mensajes() { return demo.mensajes.slice(); },
    async enviarMensaje(m) { m.id = 'm' + Date.now(); m.creado_en = new Date().toISOString(); demo.mensajes.push(m); demoSave(); return m; },
    escucharMensajes() { },
    async enviarCorreos(dest, asunto, cuerpo) { demo.correos.unshift({ para: dest, asunto: asunto, cuerpo: cuerpo, fecha: fecha() }); demoSave(); return { enviados: dest.length }; }
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
    pintarHeroVideo();
    pintarEntregas();
    montarChips();
    conectarEventos();
    $$('select[data-deptos]').forEach(function (s) { s.innerHTML = deptoOpts('San Salvador'); });
    cargarResenas();

    try { await api.sesion(); } catch (e) { }
    refrescarCuenta();

    try { productos = await api.productos(); }
    catch (e) { productos = []; toast('No pudimos cargar el catálogo: ' + (e.message || e)); }
    render();

    try { mensajes = await api.mensajes(); } catch (e) { mensajes = []; }
    refrescarBadge();
    api.escucharMensajes(function (m) {
      if (mensajes.some(function (x) { return x.id === m.id; })) return;
      mensajes.push(m); if (dock) renderDock(); refrescarBadge();
    });

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
    }).join('') + (CFG.whatsapp ? '<a class="icon-btn" href="https://wa.me/' + esc(CFG.whatsapp) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.5-5.2A8.5 8.5 0 1 1 21 11.5Z"/></svg>WhatsApp</a>' : '');
    if (CFG.facebook) $('#fbTop').href = CFG.facebook; else $('#fbTop').hidden = true;
    if (CFG.instagram) $('#igTop').href = CFG.instagram; else $('#igTop').hidden = true;
  }

  function pintarEntregas() {
    var pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>';
    $('#placeList').innerHTML = PUNTOS.map(function (p) { return '<li>' + pin + '<span>' + esc(p) + '</span></li>'; }).join('');
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
  var filtro = { q: '', cat: 'todas', grado: 'todas', max: 800, orden: 'recientes' };
  var CATS = ['PlayStation', 'Xbox', 'Nintendo', 'Portátil', 'Retro', 'Accesorios'];

  function montarChips() {
    var w = $('#quickCats');
    CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = c; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        filtro.cat = (filtro.cat === c) ? 'todas' : c;
        $('#fCat').value = filtro.cat; syncChips(); render();
        document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      w.appendChild(b);
    });
  }
  function syncChips() {
    $$('#quickCats .chip').forEach(function (b) { b.setAttribute('aria-pressed', b.textContent === filtro.cat ? 'true' : 'false'); });
  }
  function pasa(p) {
    if (!p.activo && !esAdmin()) return false;
    if (filtro.cat !== 'todas' && p.categoria !== filtro.cat) return false;
    if (filtro.grado !== 'todas' && p.grado !== filtro.grado) return false;
    if (Number(p.precio) > filtro.max) return false;
    if (filtro.q) {
      var hay = [p.titulo, p.categoria, p.descripcion, (p.incluye || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(filtro.q.toLowerCase()) === -1) return false;
    }
    return true;
  }
  function render() {
    var out = productos.filter(pasa);
    if (filtro.orden === 'baratas') out.sort(function (a, b) { return a.precio - b.precio; });
    else if (filtro.orden === 'caras') out.sort(function (a, b) { return b.precio - a.precio; });
    $('#grid').innerHTML = out.length ? out.map(function (p) {
      return '<button class="card" data-id="' + esc(p.id) + '" type="button">' +
        '<div class="thumb">' + media(p) +
        (!p.activo ? '<span class="tag off">Oculta</span>' : (esNueva(p) ? '<span class="tag deal">Recién llegada</span>' : '')) +
        '</div><div class="card-body"><h3>' + esc(p.titulo) + '</h3>' +
        '<div class="price">' + money(p.precio) + '</div><div class="meta">' +
        '<span class="grade" data-g="' + esc(p.grado) + '">' + esc(p.grado) + '</span>' +
        '<span class="dot"></span><span>' + esc(p.ubicacion) + '</span>' +
        '<span class="dot"></span><span>' + (p.envio ? 'Con envío' : 'Solo en persona') + '</span>' +
        '</div></div></button>';
    }).join('') : '<div class="empty"><strong>' + (productos.length ? 'No hay consolas con esos filtros.' : 'Todavía no hay consolas publicadas.') + '</strong><br>' + (productos.length ? 'Probá ampliar el rango de precio o cambiar de categoría.' : 'Ingresá como administrador y publicá la primera.') + '</div>';
    $('#count').textContent = out.length + (out.length === 1 ? ' consola disponible' : ' consolas disponibles');
    $$('#grid .card video').forEach(function (v) {
      var card = v.closest('.card');
      card.addEventListener('mouseenter', function () { v.play().catch(function () { }); });
      card.addEventListener('mouseleave', function () { v.pause(); });
    });
  }
  function esNueva(p) {
    if (!p.creado_en) return false;
    return (Date.now() - new Date(p.creado_en).getTime()) < 1000 * 60 * 60 * 24 * 7;
  }
  function porId(id) { return productos.filter(function (p) { return String(p.id) === String(id); })[0]; }

  /* ---------------- overlays ---------------- */
  var scrim = null, panel = null, modal = null;
  function cerrar() {
    if (panel) { panel.remove(); panel = null; }
    if (modal) { modal.remove(); modal = null; }
    if (scrim) { scrim.remove(); scrim = null; }
  }
  function velo() {
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
  function abrirFicha(id) {
    var p = porId(id); if (!p) return;
    cerrar(); velo();
    panel = document.createElement('aside');
    panel.className = 'panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', p.titulo);
    panel.innerHTML = cab(p.titulo) +
      '<div class="panel-body">' +
      '<div class="shot">' + media(p, { auto: true }) + '</div>' +
      '<div><div style="display:flex; align-items:baseline; gap:12px; flex-wrap:wrap">' +
      '<span class="price" style="font-size:27px">' + money(p.precio) + '</span>' +
      '<span class="grade" data-g="' + esc(p.grado) + '">' + esc(GRADO[p.grado] || p.grado) + '</span></div>' +
      '<p style="margin-top:12px; color:var(--ink-2); font-size:15px">' + esc(p.descripcion) + '</p></div>' +
      '<dl class="kv">' +
      '<dt>Incluye</dt><dd>' + (p.incluye || []).map(esc).join(' · ') + '</dd>' +
      '<dt>Entrega</dt><dd>En persona en San Salvador: ' + PUNTOS.map(esc).join(', ') + '</dd>' +
      '<dt>Fuera de SS</dt><dd>' + (p.envio ? 'Se coordina por chat' : 'Solo entrega en persona en San Salvador') + '</dd>' +
      (p.serie ? '<dt>Identidad</dt><dd>' + esc(p.serie) + '</dd>' : '') +
      '<dt>Garantía</dt><dd>15 días por fallas de encendido, lectora y controles</dd>' +
      '</dl>' +
      '<div class="seller"><span class="avatar">TT</span><div style="min-width:0">' +
      '<div style="font-family:var(--display); font-weight:500">' + esc(CFG.marca || 'Ttoms') + '</div>' +
      '<div style="font-size:13px; color:var(--ink-2)">' + esc(CFG.ciudad || '') + resumenResenas() + '</div></div>' +
      (CFG.instagram ? '<a class="btn ghost xs" style="margin-left:auto" href="' + esc(CFG.instagram) + '" target="_blank" rel="noopener">' + esc(CFG.instagramUsuario || 'Instagram') + '</a>' : '') + '</div>' +
      '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4.5 6v6c0 4.4 3.1 8.2 7.5 9 4.4-.8 7.5-4.6 7.5-9V6L12 3Z"/></svg>' +
      '<span>Apartarla no cuesta nada. En la entrega la encendés, la probás y pagás solo si estás conforme.</span></div>' +
      '</div>' +
      '<div class="panel-foot">' +
      '<button class="btn ghost" type="button" data-act="chat" style="flex:1">Preguntar por chat</button>' +
      '<button class="btn" type="button" data-act="buy" style="flex:1">Apartar consola</button></div>';
    document.body.appendChild(panel);
    panel.querySelector('[data-act="chat"]').addEventListener('click', function () { cerrar(); abrirHilo(p.id); });
    panel.querySelector('[data-act="buy"]').addEventListener('click', function () {
      if (!perfil) { abrirAuth('login', function () { abrirPago(p.id); }, 'Ingresá o creá tu cuenta para completar la compra.'); return; }
      abrirPago(p.id);
    });
  }

  function resumenResenas() {
    var vis = resenas.filter(function (r) { return r.visible !== false; });
    if (!vis.length) return '';
    var prom = vis.reduce(function (a, r) { return a + Number(r.estrellas); }, 0) / vis.length;
    return ' · ' + prom.toFixed(1) + ' ★ en ' + vis.length + (vis.length === 1 ? ' reseña' : ' reseñas');
  }

  /* ---------------- pago ---------------- */
  function abrirPago(id) {
    var p = porId(id); if (!p) return;
    var pagos = CFG.pagos || {};
    var prot = Number(pagos.proteccion || 0);
    var dentro = (perfil && perfil.departamento) ? perfil.departamento === 'San Salvador' : true;
    cerrar(); velo();
    modal = document.createElement('div');
    modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Apartar ' + p.titulo);

    var metodos = '';
    if (pagos.efectivo !== false) metodos += opt('pay', 'efectivo', 'Efectivo al recibirla', 'La probás y pagás ahí mismo', true);
    if (pagos.transferencia !== false) metodos += opt('pay', 'transferencia', 'Transferencia', 'La hacés en la entrega o antes de un envío' + (pagos.banco ? ' · ' + pagos.banco : ''), pagos.efectivo === false);
    if (pagos.tarjeta) metodos += opt('pay', 'tarjeta', 'Tarjeta', 'Visa, Mastercard y American Express', false);

    modal.innerHTML = cab('Apartar consola') +
      '<div class="panel-body" id="coBody">' +
      '<div class="row-item"><span class="mini">' + media(p, { video: false }) + '</span>' +
      '<span class="grow"><strong>' + esc(p.titulo) + '</strong><span class="sub">Grado ' + esc(p.grado) + '</span></span>' +
      '<span class="mono">' + money(p.precio) + '</span></div>' +
      '<div><p class="eyebrow" style="margin-bottom:9px">Entrega</p><div class="opts">' +
      opt('ship', 'punto', 'En San Salvador', 'Nos vemos en uno de nuestros puntos, sin costo', dentro, 'Gratis') +
      '<div class="form-field" id="puntoBox"><label for="coPunto">Punto de entrega</label><select id="coPunto">' +
      PUNTOS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select></div>' +
      (p.envio ? opt('ship', 'fuera', 'Fuera de San Salvador', FUERA, !dentro, 'Por chat') : '') +
      '</div></div>' +
      '<div><p class="eyebrow" style="margin-bottom:9px">Cómo vas a pagar</p><div class="opts">' + metodos + '</div></div>' +
      '<div class="form-grid"><div class="form-field full"><label for="coNota">Día y hora que te quedan bien (opcional)</label>' +
      '<input id="coNota" placeholder="Ej. sábado por la mañana o entre semana después de las 5"></div></div>' +
      '<div class="total">' +
      '<div class="row"><span>Consola</span><span>' + money(p.precio) + '</span></div>' +
      (prot ? '<div class="row"><span>Recargo</span><span>' + money(p.precio * prot) + '</span></div>' : '') +
      '<div class="row"><span>Entrega</span><span id="coShip">Gratis</span></div>' +
      '<div class="row big"><span>Total a pagar en la entrega</span><span id="coTotal">' + money(p.precio * (1 + prot)) + '</span></div></div>' +
      '<p class="hint">Apartar no te cobra nada. Te escribimos por el chat para confirmar la entrega.</p>' +
      '</div>' +
      '<div class="panel-foot"><button class="btn block" type="button" id="payBtn">Apartar consola</button></div>';
    document.body.appendChild(modal);

    function recalc() {
      var s = modal.querySelector('input[name="ship"]:checked');
      var entrega = s ? s.value : 'punto';
      var m = modal.querySelector('input[name="pay"]:checked');
      $('#puntoBox', modal).hidden = entrega !== 'punto';
      $('#coShip', modal).textContent = entrega === 'punto' ? 'Gratis' : 'Se acuerda por chat';
      var total = Number(p.precio) * (1 + prot);
      $('#coTotal', modal).textContent = money(total) + (entrega === 'punto' ? '' : ' + envío');
      return { total: total, pago: m ? m.value : 'efectivo', entrega: entrega,
        punto: entrega === 'punto' ? $('#coPunto', modal).value : ('Fuera de San Salvador' + (perfil && perfil.departamento ? ' · ' + perfil.departamento : '')) };
    }
    modal.addEventListener('change', recalc); recalc();

    $('#payBtn', modal).addEventListener('click', async function () {
      var r = recalc(), btn = this;
      busy(btn, true, 'Apartando…');
      var codigo = 'TT-' + Math.floor(100000 + Math.random() * 899999);
      try {
        await api.crearOrden({
          codigo: codigo, user_id: perfil.id, correo: perfil.correo, nombre_cliente: perfil.nombre,
          producto_id: p.id, titulo_producto: p.titulo, monto: r.total, metodo_pago: r.pago,
          metodo_entrega: r.entrega, punto_entrega: r.punto,
          nota: $('#coNota', modal).value.trim(), estado: 'pendiente'
        });
      } catch (e) { busy(btn, false); toast('No se pudo apartar: ' + traducir(e)); return; }

      var instruccion = r.entrega === 'punto'
        ? 'Te la guardamos. Nos vemos en ' + r.punto + '; la probás y pagás ' + (r.pago === 'transferencia' ? 'por transferencia' : 'en efectivo') + ' si estás conforme.'
        : 'Te la guardamos. Por el chat acordamos cómo hacértela llegar, el costo del envío y el pago.';
      $('#coBody', modal).innerHTML =
        '<div class="success"><div class="ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div>' +
        '<h3 style="font-size:20px">Consola apartada</h3>' +
        '<p style="color:var(--ink-2); margin-top:8px; font-size:15px">' + esc(instruccion) + '</p>' +
        '<p class="mono" style="margin-top:14px; font-size:13px; color:var(--accent)">Orden ' + codigo + ' · ' + money(r.total) + '</p></div>';
      busy(btn, false);
      btn.textContent = 'Coordinar por chat';
      btn.onclick = function () {
        cerrar();
        abrirHilo(p.id, 'Hola, aparté ' + p.titulo + ' (orden ' + codigo + '). ' +
          (r.entrega === 'punto' ? 'Me queda bien ' + r.punto + '.' : 'Estoy fuera de San Salvador' + (perfil.departamento ? ', en ' + perfil.departamento : '') + '.'));
      };
      toast('Orden ' + codigo + ' registrada.');
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
        '<div class="full" id="suErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Crear mi cuenta</button>' +
        '<p class="hint" style="margin-top:8px">Al crear la cuenta aceptás los términos de compra y la política de garantía.</p></div></form>';
      $('#suPass', modal).addEventListener('input', function () { fuerza(this.value, $('#suBar', modal), $('#suHint', modal)); });
      $('#signupForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var nombre = $('#suName', modal).value.trim(), correo = $('#suEmail', modal).value.trim();
        var p1 = $('#suPass', modal).value, p2 = $('#suPass2', modal).value, err = '';
        if (nombre.length < 2) err = 'Escribí tu nombre.';
        else if (!validEmail(correo)) err = 'Ese correo no parece válido.';
        else if (!passOk(p1)) err = 'La contraseña necesita al menos 8 caracteres, con letras y números.';
        else if (p1 !== p2) err = 'Las dos contraseñas no coinciden.';
        if (err) { $('#suErr', modal).innerHTML = '<p class="err">' + esc(err) + '</p>'; return; }
        var alertas = $('#suAlert', modal).checked;
        var btn = $('button[type=submit]', this); busy(btn, true, 'Creando cuenta…');
        try {
          var r = await api.registrar({
            nombre: nombre, correo: correo, pass: p1,
            nombre_completo: $('#suFull', modal).value.trim(), departamento: $('#suDepto', modal).value,
            alertas: { nuevas: alertas, bajadas: alertas, ofertas: true, resumen: false, frecuencia: 'inmediato' }
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
        '<div class="form-field"><label for="pfSince">Cliente desde</label><input id="pfSince" value="' + esc(fecha(perfil.creado_en)) + '" disabled></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Guardar cambios</button></div></form>' +
        (esAdmin() ? '<button class="btn ghost block" type="button" id="goAdmin">Abrir panel de administrador</button>' : '');
      $('#profForm', panel).addEventListener('submit', async function (e) {
        e.preventDefault();
        var n = $('#pfName', panel).value.trim();
        if (n.length < 2) { toast('Escribí tu nombre.'); return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Guardando…');
        try {
          await api.guardarPerfil({ nombre: n, nombre_completo: $('#pfFull', panel).value.trim() || null, departamento: $('#pfDepto', panel).value });
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
        sw('resumen', 'Resumen semanal', 'Un solo correo los viernes con lo que entró en la semana.', a.resumen) +
        '</div>' +
        '<div class="form-field"><label for="acFreq">Frecuencia máxima</label><select id="acFreq">' +
        '<option value="inmediato">Apenas se publica</option><option value="diario">Un resumen al día</option><option value="semanal">Solo una vez por semana</option></select></div>' +
        '<button class="btn block" type="button" id="prefSave">Guardar preferencias</button>' +
        '<button class="btn ghost block" type="button" id="prefOff">Desactivar todos los correos</button>';
      $('#acFreq', panel).value = a.frecuencia;
      $('#prefSave', panel).addEventListener('click', async function () {
        var btn = this; busy(btn, true, 'Guardando…');
        try {
          await api.guardarPerfil({ alertas: {
            nuevas: $('#sw-nuevas', panel).checked, bajadas: $('#sw-bajadas', panel).checked,
            ofertas: $('#sw-ofertas', panel).checked, resumen: $('#sw-resumen', panel).checked,
            frecuencia: $('#acFreq', panel).value } });
          toast('Preferencias guardadas.'); pintarCuenta('correos');
        } catch (e) { busy(btn, false); toast(traducir(e)); }
      });
      $('#prefOff', panel).addEventListener('click', async function () {
        await api.guardarPerfil({ alertas: { nuevas: false, bajadas: false, ofertas: false, resumen: false, frecuencia: a.frecuencia } });
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
          '<span class="sub">Orden ' + esc(o.codigo) + ' · ' + esc(fecha(o.creado_en)) + ' · ' + esc(o.punto_entrega || o.metodo_entrega) + '</span></span>' +
          '<span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(o.monto) + '</span>' +
          '<span class="pill ' + (o.estado === 'entregada' ? 'ok' : 'warn') + '">' + esc(o.estado) + '</span></span></div>';
      }).join('') + '</div>' : '<div class="empty"><strong>Todavía no tenés compras.</strong><br>Cuando comprés algo, acá vas a ver el estado de cada orden.</div>';
    }

    else {
      body.innerHTML = '<div class="skeleton" style="height:90px"></div>';
      var ofs = [];
      try { ofs = (await api.ofertas()).filter(function (o) { return o.user_id === perfil.id; }); } catch (e) { }
      body.innerHTML = (ofs.length ? '<div class="rows">' + ofs.map(function (o) {
        return '<div class="row-item"><span class="mini">' + ART[ART_CAT[o.categoria] || 'consola'] + '</span>' +
          '<span class="grow"><strong>' + esc(o.titulo) + '</strong><span class="sub">Pedís ' + money(o.precio_esperado) +
          (o.cotizacion ? ' · te cotizamos ' + money(o.cotizacion) : '') + ' · ' + esc(fecha(o.creado_en)) + '</span></span>' +
          '<span class="pill ' + (o.estado === 'aceptada' ? 'ok' : (o.estado === 'rechazada' ? 'bad' : 'warn')) + '">' + esc(o.estado) + '</span></div>';
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
      '<button type="button" data-t="ofertas">Ofertas recibidas</button>' +
      '<button type="button" data-t="ordenes">Órdenes</button>' +
      '<button type="button" data-t="resenas">Reseñas</button>' +
      '<button type="button" data-t="clientes">Clientes y correos</button></div>' +
      '<div class="panel-body" id="adBody"></div>';
    document.body.appendChild(modal);
    $('#adTabs', modal).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]'); if (b) pintarAdmin(b.dataset.t);
    });
    pintarAdmin(tab || 'resumen');
  }

  async function pintarAdmin(tab) {
    $$('#adTabs button', modal).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === tab ? 'true' : 'false'); });
    // Nodo nuevo en cada pestaña para no acumular manejadores de clic.
    var viejo = $('#adBody', modal), body = viejo.cloneNode(false);
    viejo.replaceWith(body);
    body.innerHTML = '<div class="skeleton" style="height:120px"></div>';

    if (tab === 'resumen') {
      var ofs = [], ords = [], gente = [];
      try { ofs = await api.ofertas(); ords = await api.ordenes(); gente = await api.perfiles(); } catch (e) { }
      var activos = productos.filter(function (p) { return p.activo; });
      var valor = activos.reduce(function (a, p) { return a + Number(p.precio); }, 0);
      body.innerHTML =
        '<div class="stat-row">' +
        '<div class="stat"><b>' + activos.length + '</b><span>Publicaciones activas</span></div>' +
        '<div class="stat"><b>$' + Math.round(valor).toLocaleString('en-US') + '</b><span>Valor del inventario</span></div>' +
        '<div class="stat"><b>' + ofs.filter(function (o) { return o.estado === 'pendiente'; }).length + '</b><span>Ofertas por responder</span></div>' +
        '<div class="stat"><b>' + ords.filter(function (o) { return o.estado === 'pendiente'; }).length + '</b><span>Órdenes por entregar</span></div>' +
        '<div class="stat"><b>' + gente.filter(function (u) { return u.alertas && u.alertas.nuevas; }).length + '</b><span>Suscriptores a novedades</span></div>' +
        '</div>' +
        '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>' +
        '<span>Para publicar una consola: pestaña <b>Publicar</b>, subís foto o video, precio y estado. Aparece en el catálogo al instante para todo el mundo.</span></div>' +
        (ords.length ? '<div><p class="eyebrow" style="margin:4px 0 9px">Últimas órdenes</p><div class="rows">' + ords.slice(0, 4).map(filaOrden).join('') + '</div></div>' : '');
    }

    else if (tab === 'publicar') {
      var subs = 0;
      try { subs = (await api.perfiles()).filter(function (u) { return u.alertas && u.alertas.nuevas; }).length; } catch (e) { }
      body.innerHTML =
        '<form class="form-grid" id="newProd" novalidate>' +
        '<div class="form-field full"><label for="nlTitle">Título</label><input id="nlTitle" placeholder="Ej. PlayStation 5 Slim Digital"></div>' +
        '<div class="form-field"><label for="nlCat">Categoría</label><select id="nlCat"><option>PlayStation</option><option>Xbox</option><option>Nintendo</option><option>Portátil</option><option>Retro</option><option>Accesorios</option></select></div>' +
        '<div class="form-field"><label for="nlPrice">Precio (US$)</label><input id="nlPrice" type="number" min="5" step="1" placeholder="250"></div>' +
        '<div class="form-field"><label for="nlGrade">Estado</label><select id="nlGrade"><option value="S">S — como nueva</option><option value="A" selected>A — muy buena</option><option value="B">B — buena</option><option value="C">C — con marcas</option></select></div>' +
        '<div class="form-field full"><label for="nlInc">Incluye (separado por comas)</label><input id="nlInc" placeholder="1 control, cable HDMI, caja original"></div>' +
        '<div class="form-field full"><label for="nlDesc">Descripción</label><textarea id="nlDesc" rows="3" placeholder="Estado real, revisión hecha, detalles de uso…"></textarea></div>' +
        '<div class="form-field"><label for="nlImg">Foto principal</label><input id="nlImg" type="file" accept="image/*"></div>' +
        '<div class="form-field"><label for="nlVid">Video corto (opcional)</label><input id="nlVid" type="file" accept="video/*"></div>' +
        '<div class="form-field full"><label for="nlSerie">Nota de identidad (opcional)</label><input id="nlSerie" placeholder="Serie registrada · termina en 4471"></div>' +
        '<div class="full"><label class="switch-row"><span class="switch"><input type="checkbox" id="nlEnvio" checked><span class="track"></span><span class="knob"></span></span>' +
        '<span class="grow"><strong>Se puede entregar fuera de San Salvador</strong><span>Si lo apagás, solo se entrega en los puntos de San Salvador.</span></span></label></div>' +
        '<div class="full"><label class="switch-row"><span class="switch"><input type="checkbox" id="nlMail" checked><span class="track"></span><span class="knob"></span></span>' +
        '<span class="grow"><strong>Avisar por correo a los suscriptores</strong><span>' + subs + ' personas tienen activadas las alertas de publicaciones nuevas.</span></span></label></div>' +
        '<div class="full" id="nlErr"></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Publicar en el catálogo</button></div></form>';

      $('#newProd', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var t = $('#nlTitle', modal).value.trim(), precio = Number($('#nlPrice', modal).value);
        if (t.length < 4) { $('#nlErr', modal).innerHTML = '<p class="err">Poné un título para la publicación.</p>'; return; }
        if (!precio || precio < 5) { $('#nlErr', modal).innerHTML = '<p class="err">Poné un precio de al menos $5.</p>'; return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Publicando…');
        try {
          var img = $('#nlImg', modal).files[0], vid = $('#nlVid', modal).files[0];
          var imagen_url = img ? await api.subirArchivo(img, 'fotos') : null;
          var video_url = vid ? await api.subirArchivo(vid, 'videos') : null;
          var inc = $('#nlInc', modal).value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          var nuevo = await api.crearProducto({
            titulo: t, categoria: $('#nlCat', modal).value, precio: precio, grado: $('#nlGrade', modal).value,
            ubicacion: 'San Salvador', incluye: inc.length ? inc : ['Consultá qué incluye por chat'],
            descripcion: $('#nlDesc', modal).value.trim() || 'Revisada y probada antes de publicarla.',
            serie: $('#nlSerie', modal).value.trim() || null, envio: $('#nlEnvio', modal).checked,
            activo: true, imagen_url: imagen_url, video_url: video_url
          });
          productos.unshift(nuevo); render();
          var aviso = '';
          if ($('#nlMail', modal).checked) aviso = await avisarNuevo(nuevo);
          toast('Publicada en el catálogo. ' + aviso);
          pintarAdmin('publicar');
        } catch (err) { busy(btn, false); $('#nlErr', modal).innerHTML = '<p class="err">' + esc(traducir(err)) + '</p>'; }
      });
    }

    else if (tab === 'inventario') {
      body.innerHTML = '<div class="rows">' + productos.map(function (p) {
        return '<div class="row-item"><span class="mini">' + media(p, { video: false }) + '</span>' +
          '<span class="grow"><strong>' + esc(p.titulo) + '</strong><span class="sub">' + esc(p.categoria) + ' · grado ' + esc(p.grado) + ' · ' + esc(p.ubicacion) + '</span>' +
          '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
          '<button class="btn xs ghost" type="button" data-precio="' + esc(p.id) + '">Cambiar precio</button>' +
          '<button class="btn xs ghost" type="button" data-toggle="' + esc(p.id) + '">' + (p.activo ? 'Marcar como vendida' : 'Volver a publicar') + '</button>' +
          '<button class="btn xs ghost danger" type="button" data-del="' + esc(p.id) + '">Eliminar</button>' +
          '</span></span>' +
          '<span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(p.precio) + '</span>' +
          '<span class="pill ' + (p.activo ? 'ok' : '') + '">' + (p.activo ? 'publicada' : 'vendida') + '</span></span></div>';
      }).join('') + '</div>';

      body.addEventListener('click', async function (e) {
        var pr = e.target.closest('[data-precio]'), tg = e.target.closest('[data-toggle]'), dl = e.target.closest('[data-del]');
        try {
          if (pr) {
            var p = porId(pr.dataset.precio);
            var v = window.prompt('Precio nuevo para "' + p.titulo + '" (US$)', String(p.precio));
            if (v === null) return;
            var n = Number(String(v).replace(/[^\d.]/g, ''));
            if (!n) { toast('Escribí un monto válido.'); return; }
            var baja = n < Number(p.precio);
            await api.editarProducto(p.id, { precio: n }); p.precio = n; render();
            if (baja) { var r = await avisarBaja(p); toast('Precio actualizado. ' + r); }
            else toast('Precio actualizado.');
            pintarAdmin('inventario');
          } else if (tg) {
            var p2 = porId(tg.dataset.toggle);
            await api.editarProducto(p2.id, { activo: !p2.activo }); p2.activo = !p2.activo; render();
            pintarAdmin('inventario');
          } else if (dl) {
            var p3 = porId(dl.dataset.del);
            if (!window.confirm('¿Eliminar "' + p3.titulo + '" del catálogo? No se puede deshacer.')) return;
            await api.borrarProducto(p3.id);
            productos = productos.filter(function (x) { return x.id !== p3.id; });
            render(); toast('Publicación eliminada.'); pintarAdmin('inventario');
          }
        } catch (err) { toast(traducir(err)); }
      });
    }

    else if (tab === 'ofertas') {
      var ofs = [];
      try { ofs = await api.ofertas(); } catch (e) { }
      body.innerHTML = ofs.length ? '<div class="rows">' + ofs.map(function (o) {
        return '<div class="row-item"><span class="mini">' + ART[ART_CAT[o.categoria] || 'consola'] + '</span>' +
          '<span class="grow"><strong>' + esc(o.titulo) + '</strong>' +
          '<span class="sub">' + esc(o.nombre || o.correo) + ' · ' + esc(o.ubicacion) + ' · grado ' + esc(o.grado) + ' · ' + esc(fecha(o.creado_en)) + '</span>' +
          '<span class="sub" style="margin-top:4px">' + esc(o.descripcion) + '</span>' +
          (o.estado === 'pendiente' || o.estado === 'cotizada' ? '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
            '<button class="btn xs" type="button" data-quote="' + esc(o.id) + '">Cotizar</button>' +
            '<button class="btn xs ghost" type="button" data-accept="' + esc(o.id) + '">Aceptar ' + money(o.precio_esperado) + '</button>' +
            '<button class="btn xs ghost danger" type="button" data-reject="' + esc(o.id) + '">Rechazar</button></span>' : '') +
          '</span><span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(o.precio_esperado) + '</span>' +
          '<span class="pill ' + (o.estado === 'aceptada' ? 'ok' : (o.estado === 'rechazada' ? 'bad' : 'warn')) + '">' + esc(o.estado) + '</span></span></div>';
      }).join('') + '</div>' : '<div class="empty"><strong>No hay ofertas todavía.</strong><br>Cuando alguien te ofrezca su consola, aparece acá.</div>';

      body.addEventListener('click', async function (e) {
        var q = e.target.closest('[data-quote]'), a2 = e.target.closest('[data-accept]'), r2 = e.target.closest('[data-reject]');
        var id = q ? q.dataset.quote : (a2 ? a2.dataset.accept : (r2 ? r2.dataset.reject : null));
        if (!id) return;
        var o = ofs.filter(function (x) { return String(x.id) === String(id); })[0]; if (!o) return;
        try {
          if (q) {
            var v = window.prompt('¿Cuánto le ofrecés por "' + o.titulo + '"?', String(Math.round(o.precio_esperado * 0.85)));
            if (v === null) return;
            var n = Number(String(v).replace(/[^\d.]/g, ''));
            if (!n) { toast('Escribí un monto válido.'); return; }
            await api.editarOferta(o.id, { estado: 'cotizada', cotizacion: n });
            await correoOferta(o, 'Te cotizamos tu ' + o.titulo, 'Revisamos lo que nos mandaste y podemos pagarte ' + money(n) + '. Si te sirve, escribinos por el chat del sitio y coordinamos la revisión.');
            toast('Cotización registrada y notificada.');
          } else if (a2) {
            await api.editarOferta(o.id, { estado: 'aceptada', cotizacion: o.precio_esperado });
            await correoOferta(o, 'Aceptamos tu oferta: ' + o.titulo, 'Nos quedamos con tu ' + o.titulo + ' por ' + money(o.precio_esperado) + '. Escribinos por el chat para coordinar el día de la revisión y el pago.');
            toast('Oferta aceptada.');
          } else {
            await api.editarOferta(o.id, { estado: 'rechazada' });
            await correoOferta(o, 'Sobre tu oferta: ' + o.titulo, 'Gracias por pensar en nosotros. Por ahora no podemos recibir esa consola, pero si querés ofrecernos otra, escribinos cuando querás.');
            toast('Oferta rechazada y notificada.');
          }
          pintarAdmin('ofertas');
        } catch (err) { toast(traducir(err)); }
      });
    }

    else if (tab === 'ordenes') {
      var ords2 = [];
      try { ords2 = await api.ordenes(); } catch (e) { }
      body.innerHTML = (ords2.length ? '<div class="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>' +
        '<span>Marcá <b>Entregada</b> después de cada entrega: eso activa la marca de compra verificada en la reseña de ese cliente.</span></div>' +
        '<div class="rows">' + ords2.map(function (o) { return filaOrden(o, true); }).join('') + '</div>'
        : '<div class="empty"><strong>Sin órdenes todavía.</strong></div>');
      body.addEventListener('click', async function (e) {
        var b = e.target.closest('[data-estado]'); if (!b) return;
        try {
          await api.editarOrden(b.dataset.id, { estado: b.dataset.estado });
          if (b.dataset.estado === 'entregada') {
            var o = ords2.filter(function (x) { return String(x.id) === b.dataset.id; })[0];
            var p = o && porId(o.producto_id);
            if (p && p.activo && window.confirm('¿Marcar "' + p.titulo + '" como vendida para quitarla del catálogo?')) {
              await api.editarProducto(p.id, { activo: false }); p.activo = false; render();
            }
            cargarResenas();
          }
          toast('Orden actualizada.'); pintarAdmin('ordenes');
        } catch (err) { toast(traducir(err)); }
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
      }).join('') + '</div>' : '<div class="empty"><strong>Sin reseñas todavía.</strong><br>Pedíle a cada cliente que deje la suya después de la entrega.</div>';
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
        '<form class="form-grid" id="blastForm" novalidate>' +
        '<div class="form-field full"><label for="bsSubject">Asunto del anuncio</label><input id="bsSubject" placeholder="Ej. Entraron 4 consolas nuevas esta semana"></div>' +
        '<div class="form-field full"><label for="bsBody">Mensaje</label><textarea id="bsBody" rows="3" placeholder="Contá qué entró, precios y hasta cuándo dura."></textarea></div>' +
        '<div class="form-field full"><button class="btn block" type="submit">Enviar anuncio a ' + conAlerta.length + ' suscriptores</button></div></form>' +
        (CFG.funcionCorreo ? '' : '<div class="note warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" stroke-linecap="round"/></svg>' +
          '<span>El envío automático todavía no está conectado (paso 7 del README). Mientras tanto, usá el botón de copiar correos y mandá el anuncio desde tu correo.</span></div>') +
        '<button class="btn ghost block" type="button" id="copyMails">Copiar los ' + conAlerta.length + ' correos</button>' +
        '<div><p class="eyebrow" style="margin:4px 0 9px">Clientes</p><div class="rows">' +
        compradores.map(function (u) {
          var on = ['nuevas', 'bajadas', 'ofertas', 'resumen'].filter(function (k) { return u.alertas && u.alertas[k]; });
          return '<div class="row-item"><span class="avatar sm">' + esc(initials(u.nombre)) + '</span>' +
            '<span class="grow"><strong>' + esc(u.nombre) + (u.nombre_completo ? ' <span class="sub" style="display:inline">(' + esc(u.nombre_completo) + ')</span>' : '') + '</strong>' +
            '<span class="sub">' + esc(u.correo) + ' · ' + esc(u.departamento || 'sin departamento') + ' · desde ' + esc(fecha(u.creado_en)) + '</span></span>' +
            '<span class="pill ' + (on.length ? 'ok' : '') + '">' + (on.length ? on.length + ' alertas' : 'sin alertas') + '</span></div>';
        }).join('') + '</div></div>';

      $('#copyMails', modal).addEventListener('click', function () {
        var txt = conAlerta.map(function (u) { return u.correo; }).join(', ');
        navigator.clipboard.writeText(txt).then(function () { toast('Correos copiados al portapapeles.'); },
          function () { window.prompt('Copiá los correos:', txt); });
      });
      $('#blastForm', modal).addEventListener('submit', async function (e) {
        e.preventDefault();
        var s = $('#bsSubject', modal).value.trim(), b = $('#bsBody', modal).value.trim();
        if (s.length < 4 || b.length < 10) { toast('Escribí asunto y mensaje del anuncio.'); return; }
        if (!conAlerta.length) { toast('Todavía no hay suscriptores con alertas activas.'); return; }
        var btn = $('button[type=submit]', this); busy(btn, true, 'Enviando…');
        try {
          var r = await api.enviarCorreos(conAlerta.map(function (u) { return u.correo; }), s, b);
          busy(btn, false);
          toast(r.motivo === 'sin-funcion' ? 'Falta conectar la función de correo (paso 7 del README).' : 'Anuncio enviado a ' + (r.enviados || conAlerta.length) + ' suscriptores.');
        } catch (err) { busy(btn, false); toast('No se pudo enviar: ' + traducir(err)); }
      });
    }
  }

  function filaOrden(o, acciones) {
    var btns = '';
    if (acciones && o.estado !== 'entregada' && o.estado !== 'cancelada') {
      btns = '<span style="display:flex; gap:6px; margin-top:9px; flex-wrap:wrap">' +
        (o.estado === 'pendiente' ? '<button class="btn xs ghost" type="button" data-estado="pagada" data-id="' + esc(o.id) + '">Pagada</button>' : '') +
        '<button class="btn xs" type="button" data-estado="entregada" data-id="' + esc(o.id) + '">Entregada</button>' +
        '<button class="btn xs ghost danger" type="button" data-estado="cancelada" data-id="' + esc(o.id) + '">Cancelar</button></span>';
    }
    return '<div class="row-item"><span class="mini">' + ART.consola + '</span>' +
      '<span class="grow"><strong>' + esc(o.titulo_producto || 'Consola') + '</strong>' +
      '<span class="sub">' + esc(o.codigo) + ' · ' + esc(o.nombre_cliente || o.correo || '') + ' · ' + esc(o.metodo_pago) + ' · ' + esc(fecha(o.creado_en)) + '</span>' +
      (o.punto_entrega ? '<span class="sub">Entrega: ' + esc(o.punto_entrega) + '</span>' : '') +
      (o.nota ? '<span class="sub">Nota: ' + esc(o.nota) + '</span>' : '') + btns + '</span>' +
      '<span style="display:grid; gap:6px; justify-items:end"><span class="mono">' + money(o.monto) + '</span>' +
      '<span class="pill ' + (o.estado === 'entregada' ? 'ok' : 'warn') + '">' + esc(o.estado) + '</span></span></div>';
  }

  async function avisarNuevo(p) {
    try {
      var gente = await api.perfiles();
      var dest = gente.filter(function (u) { return u.rol !== 'admin' && u.alertas && u.alertas.nuevas; }).map(function (u) { return u.correo; });
      if (!dest.length) return '';
      var r = await api.enviarCorreos(dest, 'Nueva en ' + (CFG.marca || 'Ttoms') + ': ' + p.titulo,
        'Acaba de entrar al catálogo: ' + p.titulo + ' en grado ' + p.grado + ' por ' + money(p.precio) + '. Entrega en ' + p.ubicacion + ' o envío nacional. Si te interesa, escribinos por el chat antes de que vuele.');
      return r.motivo === 'sin-funcion' ? 'Falta conectar el envío de correos.' : 'Se avisó a ' + dest.length + ' suscriptores.';
    } catch (e) { return 'No se pudo enviar el aviso por correo.'; }
  }
  async function avisarBaja(p) {
    try {
      var gente = await api.perfiles();
      var dest = gente.filter(function (u) { return u.rol !== 'admin' && u.alertas && u.alertas.bajadas; }).map(function (u) { return u.correo; });
      if (!dest.length) return '';
      var r = await api.enviarCorreos(dest, 'Bajó de precio: ' + p.titulo,
        p.titulo + ' pasó a ' + money(p.precio) + '. Sigue con garantía de 15 días y entrega en ' + p.ubicacion + '.');
      return r.motivo === 'sin-funcion' ? '' : 'Avisamos a ' + dest.length + ' suscriptores.';
    } catch (e) { return ''; }
  }
  async function correoOferta(o, asunto, cuerpo) {
    try {
      var gente = await api.perfiles();
      var u = gente.filter(function (x) { return x.correo === o.correo; })[0];
      if (u && u.alertas && u.alertas.ofertas) await api.enviarCorreos([o.correo], asunto, cuerpo);
    } catch (e) { }
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
  }
  function abrirDock() {
    if (dock) return;
    dock = document.createElement('section');
    dock.className = 'chat-dock'; dock.setAttribute('aria-label', 'Mensajes');
    document.body.appendChild(dock); renderDock();
  }
  function cerrarDock() { if (dock) { dock.remove(); dock = null; hiloActivo = null; } }

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
        (esAdmin() ? '' : '<div class="quick">' +
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
    $('#menuBtn').addEventListener('click', function () {
      var nav = $('#nav'); var abierto = nav.classList.toggle('open');
      this.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    $('#nav').addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { this.classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); }
    });
    $('#q').addEventListener('input', function () { filtro.q = this.value.trim(); render(); });
    $('#fCat').addEventListener('change', function () { filtro.cat = this.value; syncChips(); render(); });
    $('#fGrade').addEventListener('change', function () { filtro.grado = this.value; render(); });
    $('#fSort').addEventListener('change', function () { filtro.orden = this.value; render(); });
    $('#fMax').addEventListener('input', function () { filtro.max = Number(this.value); $('#fMaxOut').textContent = '$' + this.value; render(); });
    $('#grid').addEventListener('click', function (e) {
      var c = e.target.closest('.card'); if (c && c.dataset.id) abrirFicha(c.dataset.id);
    });
    $('#accountBtn').addEventListener('click', function () { perfil ? abrirCuenta('perfil') : abrirAuth('login'); });
    $('#adminShortcut').addEventListener('click', function () { abrirAdmin('resumen'); });
    $('#writeReview').addEventListener('click', abrirResena);
    $('#chatBtn').addEventListener('click', function () { if (dock) cerrarDock(); else { hiloActivo = null; abrirDock(); } });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
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
      var q = e.target.closest('.quick button');
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
      var btn = $('button[type=submit]', form); busy(btn, true, 'Enviando…');
      try {
        await api.crearOferta({
          user_id: perfil.id, nombre: perfil.nombre, correo: perfil.correo, titulo: titulo,
          categoria: $('#sCat').value, grado: $('#sGrade').value, precio_esperado: esperado,
          ubicacion: $('#sLoc').value, descripcion: $('#sDesc').value.trim() || 'Sin detalles adicionales.',
          estado: 'pendiente'
        });
        busy(btn, false); form.reset();
        toast('Oferta enviada. Te respondemos en menos de 24 horas.');
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
  }
})();
