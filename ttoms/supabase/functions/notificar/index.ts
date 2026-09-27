// ============================================================
// TTOMS — Función de correos ("notificar")
// Envía con la cuenta de Gmail del negocio (contraseña de aplicación)
// que el administrador guarda desde el Panel → Correos.
// También acepta los secretos SMTP_USER / SMTP_PASS si se prefieren.
//
// Tipos de aviso:
//   orden            → confirmación al comprador (LPC art. 21-B) + aviso a admins
//   entregada        → comprobante y garantía al comprador
//   oferta_nueva     → acuse al vendedor + aviso a admins
//   oferta_respuesta → cotización / aceptación / rechazo al vendedor
//   nuevo_producto   → suscriptores con "publicaciones nuevas"
//   baja_precio      → suscriptores con "bajadas de precio"
//   anuncio          → anuncio libre a suscriptores
//   chat             → "te respondimos en el chat" (máx. 1 cada 20 min)
//   prueba           → correo de prueba al administrador
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  (() => { try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default; } catch { return ''; } })();
const SITIO = (Deno.env.get('SITIO_URL') ?? 'https://ttoms.netlify.app').replace(/\/$/, '');
const WHATSAPP = Deno.env.get('WHATSAPP') ?? '50372830915';
const MARCA = 'Ttoms';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });

// ---------------- utilidades ----------------
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const money = (n: unknown) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (d?: string | null) => new Date(d || Date.now()).toLocaleDateString('es-SV', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/El_Salvador' });
const wa = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
const linkProducto = (p: { slug?: string | null }) => p?.slug ? `${SITIO}/c/${p.slug}` : SITIO;

type Bloque = { titulo: string; intro?: string; imagen?: string | null; filas?: [string, string][];
  parrafos?: string[]; boton?: { texto: string; url: string }; boton2?: { texto: string; url: string };
  pie?: string; };

function plantilla(b: Bloque) {
  const filas = (b.filas || []).map(([k, v]) =>
    `<tr><td style="padding:7px 0;color:#6B7D76;font-size:13px;width:38%;vertical-align:top">${esc(k)}</td>` +
    `<td style="padding:7px 0;font-size:14px;color:#13201C;vertical-align:top">${v}</td></tr>`).join('');
  const btn = (x?: { texto: string; url: string }, sec = false) => x ?
    `<a href="${esc(x.url)}" style="display:inline-block;margin:6px 8px 0 0;padding:12px 22px;border-radius:999px;` +
    `font-weight:600;font-size:15px;text-decoration:none;${sec ? 'background:#fff;color:#2A6D5E;border:1.5px solid #2A6D5E' : 'background:#2A6D5E;color:#F4FAF7'}">${esc(x.texto)}</a>` : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F3F6F4;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#13201C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #DCE4E0;border-radius:18px;overflow:hidden">
<tr><td style="background:#0F1A17;padding:18px 26px">
  <span style="display:inline-block;width:26px;height:26px;border-radius:8px;background:#8FE3C8;vertical-align:middle"></span>
  <span style="font-size:20px;font-weight:800;color:#fff;vertical-align:middle;margin-left:8px;letter-spacing:-.02em">${MARCA}</span>
  <span style="float:right;color:#8FE3C8;font-size:12px;line-height:26px;letter-spacing:.08em">CONSOLAS · SAN SALVADOR</span>
</td></tr>
${b.imagen ? `<tr><td style="padding:0"><img src="${esc(b.imagen)}" alt="" width="560" style="display:block;width:100%;max-height:320px;object-fit:cover"></td></tr>` : ''}
<tr><td style="padding:26px 26px 8px">
  <h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;letter-spacing:-.02em">${esc(b.titulo)}</h1>
  ${b.intro ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#46574F">${b.intro}</p>` : ''}
  ${filas ? `<table role="presentation" width="100%" style="border-top:1px solid #E6ECE9;border-bottom:1px solid #E6ECE9;margin:6px 0 16px">${filas}</table>` : ''}
  ${(b.parrafos || []).map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#46574F">${p}</p>`).join('')}
  <div style="margin:8px 0 18px">${btn(b.boton)}${btn(b.boton2, true)}</div>
</td></tr>
<tr><td style="padding:16px 26px 22px;border-top:1px solid #E6ECE9;font-size:12px;line-height:1.6;color:#83958E">
  ${b.pie ? esc(b.pie) + '<br>' : ''}
  ${MARCA} · Compra y venta de consolas en San Salvador · WhatsApp ${WHATSAPP.slice(-8, -4)}-${WHATSAPP.slice(-4)}<br>
  <a href="${SITIO}/terminos.html" style="color:#83958E">Términos</a> ·
  <a href="${SITIO}/privacidad.html" style="color:#83958E">Privacidad</a> ·
  <a href="${SITIO}/?cuenta=correos" style="color:#83958E">Cambiar o apagar mis correos</a>
</td></tr></table></td></tr></table></body></html>`;
}

// ---------------- envío ----------------
async function transporte() {
  const u = Deno.env.get('SMTP_USER'), p = Deno.env.get('SMTP_PASS');
  let cfg: Record<string, unknown> | null = null, tipo = 'smtp';
  if (u && p) cfg = { host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com', port: Number(Deno.env.get('SMTP_PORT') ?? 465), user: u, pass: p, nombre: MARCA };
  else {
    const r = await db.from('privado').select('clave, valor').in('clave', ['smtp', 'brevo']).order('editado_en', { ascending: false }).limit(1);
    const fila = (r.data || [])[0];
    if (fila) { cfg = fila.valor as Record<string, unknown>; tipo = fila.clave; }
  }
  if (!cfg?.user) return null;
  const nombre = String(cfg.nombre ?? MARCA).replace(/"/g, '');
  const de = `"${nombre}" <${cfg.user}>`;

  // Brevo: API por HTTPS, solo necesita una clave (sin contraseña de aplicación).
  if (tipo === 'brevo') {
    if (!cfg.key) return null;
    const correo = (x: string) => { const m = /<([^>]+)>/.exec(x); return (m ? m[1] : x).trim(); };
    const lista = (x: unknown) => ([] as string[]).concat((x as string[] | string) || []).filter(Boolean).map((e) => ({ email: correo(e) }));
    const t = {
      sendMail: async (m: { to?: unknown; bcc?: unknown; subject: string; html: string; replyTo?: string }) => {
        const body: Record<string, unknown> = { sender: { name: nombre, email: String(cfg!.user) }, to: lista(m.to), subject: m.subject, htmlContent: m.html };
        if (m.bcc) body.bcc = lista(m.bcc);
        if (m.replyTo) body.replyTo = { email: correo(m.replyTo) };
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST', headers: { 'api-key': String(cfg!.key), 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error(`Brevo respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
      }
    };
    return { t, de, cuenta: `${cfg.user} (Brevo)` };
  }

  if (!cfg.pass) return null;
  const port = Number(cfg.port ?? 465);
  const t = nodemailer.createTransport({
    host: String(cfg.host ?? 'smtp.gmail.com'), port, secure: port === 465,
    auth: { user: String(cfg.user), pass: String(cfg.pass) }
  });
  return { t, de, cuenta: String(cfg.user) };
}

type Tx = NonNullable<Awaited<ReturnType<typeof transporte>>>;

async function enviar(tx: Tx, tipo: string, ref: string, para: string, asunto: string, html: string, responder?: string) {
  try {
    await tx.t.sendMail({ from: tx.de, to: para, subject: asunto, html, replyTo: responder });
    await db.from('correos_log').insert({ tipo, ref, para, asunto, ok: true });
    return true;
  } catch (e) {
    await db.from('correos_log').insert({ tipo, ref, para, asunto, ok: false, error: String(e).slice(0, 500) });
    console.error('Fallo al enviar', tipo, para, e);
    return false;
  }
}

// Envío masivo con copia oculta (nadie ve los correos de los demás).
async function enviarMasivo(tx: Tx, tipo: string, ref: string | null, lista: string[], asunto: string, html: string) {
  let ok = 0;
  const unicos = [...new Set(lista.map((c) => c.toLowerCase().trim()).filter(Boolean))];
  for (let i = 0; i < unicos.length; i += 45) {
    const lote = unicos.slice(i, i + 45);
    try {
      await tx.t.sendMail({ from: tx.de, to: tx.de, bcc: lote, subject: asunto, html });
      ok += lote.length;
      await db.from('correos_log').insert({ tipo, ref, para: `${lote.length} suscriptores`, asunto, ok: true });
    } catch (e) {
      await db.from('correos_log').insert({ tipo, ref, para: `${lote.length} suscriptores`, asunto, ok: false, error: String(e).slice(0, 500) });
    }
  }
  return ok;
}

async function correosAdmin() {
  const r = await db.from('perfiles').select('correo').eq('rol', 'admin');
  return (r.data || []).map((x) => x.correo).filter(Boolean) as string[];
}
async function suscriptores(clave: 'nuevas' | 'bajadas') {
  const r = await db.from('perfiles').select('correo, alertas, rol').neq('rol', 'admin');
  return (r.data || []).filter((u) => u.alertas && u.alertas[clave]).map((u) => u.correo as string);
}

// ---------------- servidor ----------------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  // Quién llama (tiene que tener sesión iniciada)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: ud } = await db.auth.getUser(token);
  const uid = ud?.user?.id;
  if (!uid) return json({ error: 'Necesitás iniciar sesión' }, 401);
  const { data: yo } = await db.from('perfiles').select('id, rol, correo, nombre').eq('id', uid).maybeSingle();
  const admin = yo?.rol === 'admin';

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* vacío */ }
  const tipo = String(body.tipo ?? '');
  const id = body.id ? String(body.id) : '';

  const tx = await transporte();
  if (!tx) return json({ ok: false, motivo: 'sin-configurar', enviados: 0 });

  try {
    // ---------- prueba ----------
    if (tipo === 'prueba') {
      if (!admin) return json({ error: 'No autorizado' }, 403);
      const ok = await enviar(tx, 'prueba', uid, yo!.correo, `Prueba de correo de ${MARCA}`, plantilla({
        titulo: 'Los correos de Ttoms ya funcionan',
        intro: `Este es un correo de prueba enviado desde <b>${esc(tx.cuenta)}</b>. Si lo estás leyendo, los avisos automáticos ya salen.`,
        boton: { texto: 'Ir a la tienda', url: SITIO }
      }));
      return json({ ok, enviados: ok ? 1 : 0 });
    }

    // ---------- pedido nuevo ----------
    if (tipo === 'orden') {
      const { data: o } = await db.from('ordenes').select('*').eq('id', id).maybeSingle();
      if (!o) return json({ error: 'Pedido no encontrado' }, 404);
      if (o.user_id !== uid && !admin) return json({ error: 'No autorizado' }, 403);
      if (o.aviso_en) return json({ ok: true, ya: true });
      const { data: p } = await db.from('productos').select('titulo, slug, imagen_url, grado').eq('id', o.producto_id).maybeSingle();
      const comprobante = `${SITIO}/comprobante.html?o=${encodeURIComponent(o.codigo)}`;
      const filas: [string, string][] = [
        ['Pedido', `<b style="font-family:monospace">${esc(o.codigo)}</b>`],
        ['Consola', esc(o.titulo_producto)],
        ['Precio', `<b>${money(o.monto)}</b>${o.metodo_entrega === 'fuera' ? ' + envío (se acuerda)' : ''}`],
        ['Entrega', esc(o.punto_entrega || 'Se coordina por WhatsApp')],
        ['Pago', o.metodo_pago === 'transferencia' ? 'Transferencia bancaria' : 'Efectivo al recibirla'],
        ['Fecha', esc(fecha(o.creado_en))]
      ];
      if (o.nota) filas.push(['Horario que pediste', esc(o.nota)]);
      const okC = await enviar(tx, 'orden', o.id, o.correo, `Pedido ${o.codigo} confirmado · ${o.titulo_producto}`, plantilla({
        titulo: '¡Tu pedido está confirmado!',
        intro: `Hola ${esc(o.nombre_cliente || '')}, recibimos tu pedido. Te escribimos hoy mismo por WhatsApp${o.telefono ? ' al ' + esc(o.telefono) : ''} para acordar la hora de la entrega.`,
        imagen: p?.imagen_url, filas,
        parrafos: [
          '<b>Cómo sigue:</b> nos vemos en el punto que elegiste, encendés la consola, la probás con calma y pagás solo si estás conforme. Al entregártela te damos el comprobante con el número de serie y la garantía.',
          o.metodo_pago === 'transferencia' ? 'Si preferís transferir antes, los datos de la cuenta están en <b>Mi cuenta → Mis compras</b>. Poné el número de pedido en el concepto.' : ''
        ].filter(Boolean),
        boton: { texto: 'Escribirnos por WhatsApp', url: wa(`Hola, hice el pedido ${o.codigo} (${o.titulo_producto}). ¿Cuándo nos vemos?`) },
        boton2: { texto: 'Ver mi comprobante', url: comprobante },
        pie: 'Guardá este correo: es la confirmación de tu pedido (Ley de Protección al Consumidor, art. 21-B).'
      }));
      const admins = await correosAdmin();
      for (const a of admins) {
        await enviar(tx, 'orden_admin', o.id, a, `🛒 Pedido nuevo ${o.codigo}: ${o.titulo_producto} · ${money(o.monto)}`, plantilla({
          titulo: `Pedido nuevo: ${o.titulo_producto}`,
          intro: `${esc(o.nombre_cliente || o.correo)} quiere comprar. Escribile pronto para no perder la venta.`,
          imagen: p?.imagen_url,
          filas: [['Pedido', esc(o.codigo)], ['Cliente', esc(o.nombre_cliente || '')], ['Correo', esc(o.correo)],
            ['WhatsApp', esc(o.telefono || '—')], ['Entrega', esc(o.punto_entrega || '')], ['Pago', esc(o.metodo_pago)],
            ['Horario', esc(o.nota || '—')], ['Precio', money(o.monto)]],
          boton: o.telefono ? { texto: 'Escribirle por WhatsApp', url: `https://wa.me/503${String(o.telefono).replace(/\D/g, '').slice(-8)}?text=${encodeURIComponent(`Hola ${o.nombre_cliente || ''}, te escribimos de Ttoms por tu pedido ${o.codigo} (${o.titulo_producto}). ¿Qué día y hora te queda bien?`)}` } : undefined,
          boton2: { texto: 'Abrir el panel', url: `${SITIO}/?panel=ordenes` }
        }), o.correo);
      }
      await db.from('ordenes').update({ aviso_en: new Date().toISOString() }).eq('id', o.id);
      return json({ ok: okC, enviados: 1 + admins.length });
    }

    // ---------- pedido entregado ----------
    if (tipo === 'entregada') {
      if (!admin) return json({ error: 'No autorizado' }, 403);
      const { data: o } = await db.from('ordenes').select('*').eq('id', id).maybeSingle();
      if (!o) return json({ error: 'Pedido no encontrado' }, 404);
      const ok = await enviar(tx, 'entregada', o.id, o.correo, `Gracias por tu compra · Comprobante ${o.codigo}`, plantilla({
        titulo: '¡Gracias por comprar en Ttoms!',
        intro: `Hola ${esc(o.nombre_cliente || '')}, ya es tuya. Aquí está tu comprobante de compra con el número de serie: guardalo, es tu respaldo de que la adquiriste de forma legal.`,
        filas: [['Comprobante', `<b style="font-family:monospace">${esc(o.codigo)}</b>`], ['Consola', esc(o.titulo_producto)],
          ['Número de serie', esc(o.serie || 'Anotado en el comprobante')], ['Pagaste', money(o.monto)],
          ['Garantía hasta', o.garantia_hasta ? esc(fecha(o.garantia_hasta + 'T12:00:00')) : '—']],
        parrafos: ['Si algo falla dentro de la garantía, escribinos por WhatsApp con tu número de comprobante.',
          '¿Nos ayudás con una reseña? Tu compra ya está verificada y la reseña va a mostrar la marca <b>Compra verificada</b>.'],
        boton: { texto: 'Ver y descargar comprobante', url: `${SITIO}/comprobante.html?o=${encodeURIComponent(o.codigo)}` },
        boton2: { texto: 'Dejar mi reseña', url: `${SITIO}/?resena=1` }
      }));
      return json({ ok, enviados: ok ? 1 : 0 });
    }

    // ---------- oferta nueva ----------
    if (tipo === 'oferta_nueva') {
      const { data: o } = await db.from('ofertas').select('*').eq('id', id).maybeSingle();
      if (!o) return json({ error: 'Oferta no encontrada' }, 404);
      if (o.user_id !== uid && !admin) return json({ error: 'No autorizado' }, 403);
      if (o.aviso_en) return json({ ok: true, ya: true });
      const fotos = (o.imagenes || []) as string[];
      await enviar(tx, 'oferta_acuse', o.id, o.correo, `Recibimos tu oferta: ${o.titulo}`, plantilla({
        titulo: 'Recibimos tu consola para cotizar',
        intro: `Hola ${esc(o.nombre || '')}, te respondemos en menos de 24 horas con un precio.`,
        imagen: fotos[0],
        filas: [['Consola', esc(o.titulo)], ['Pedís', money(o.precio_esperado)], ['Serie', esc(o.serie || 'Pendiente')]],
        parrafos: ['<b>Para el día de la compra</b> traé tu DUI (o carné de residente) y, si la tenés, la factura o la caja con el mismo número de serie. Sin documento de identidad no podemos comprar: es lo que nos protege a los dos.'],
        boton: { texto: 'Ver mis ofertas', url: `${SITIO}/?cuenta=ofertas` },
        boton2: { texto: 'Leer la política de procedencia', url: `${SITIO}/procedencia.html` }
      }));
      const admins = await correosAdmin();
      for (const a of admins) {
        await enviar(tx, 'oferta_admin', o.id, a, `📥 Oferta: ${o.titulo} · pide ${money(o.precio_esperado)}`, plantilla({
          titulo: `Te ofrecen: ${o.titulo}`,
          intro: `${esc(o.nombre || o.correo)} (${esc(o.ubicacion || '')}) quiere venderte su consola.`,
          imagen: fotos[0],
          filas: [['Pide', money(o.precio_esperado)], ['Grado que declara', esc(o.grado)], ['Serie', esc(o.serie || '—')],
            ['Respaldo', esc(o.comprobante_origen || '—')], ['WhatsApp', esc(o.telefono || '—')], ['Detalle', esc(o.descripcion || '')],
            ['Fotos', String(fotos.length)]],
          boton: { texto: 'Responder en el panel', url: `${SITIO}/?panel=ofertas` }
        }), o.correo);
      }
      await db.from('ofertas').update({ aviso_en: new Date().toISOString() }).eq('id', o.id);
      return json({ ok: true });
    }

    // ---------- respuesta a una oferta ----------
    if (tipo === 'oferta_respuesta') {
      if (!admin) return json({ error: 'No autorizado' }, 403);
      const { data: o } = await db.from('ofertas').select('*').eq('id', id).maybeSingle();
      if (!o) return json({ error: 'Oferta no encontrada' }, 404);
      const { data: u } = await db.from('perfiles').select('alertas').eq('id', o.user_id).maybeSingle();
      if (u?.alertas && u.alertas.ofertas === false) return json({ ok: true, omitido: 'preferencia' });
      const textos: Record<string, [string, string, string]> = {
        cotizada: [`Te cotizamos tu ${o.titulo}`, `Revisamos las fotos y podemos pagarte <b>${money(o.cotizacion)}</b> por tu ${esc(o.titulo)}.`,
          'Si te sirve, escribinos por WhatsApp y acordamos el día para revisarla juntos y pagarte en el momento. Traé tu DUI.'],
        aceptada: [`Aceptamos tu oferta: ${o.titulo}`, `Nos quedamos con tu ${esc(o.titulo)} por <b>${money(o.cotizacion ?? o.precio_esperado)}</b>.`,
          'Escribinos por WhatsApp para acordar el día. Ese día la revisamos, firmamos el acta de compra y te pagamos. Traé tu DUI y, si la tenés, la factura o caja.'],
        rechazada: [`Sobre tu oferta: ${o.titulo}`, `Gracias por pensar en nosotros. Por ahora no podemos recibir tu ${esc(o.titulo)}.`,
          'Si querés ofrecernos otra consola, mandala desde la web cuando querás.']
      };
      const t = textos[o.estado];
      if (!t) return json({ ok: true, omitido: 'estado' });
      const ok = await enviar(tx, 'oferta_respuesta', o.id, o.correo, t[0], plantilla({
        titulo: t[0], intro: t[1], imagen: (o.imagenes || [])[0], parrafos: [t[2]],
        boton: o.estado === 'rechazada' ? { texto: 'Ir a la tienda', url: SITIO } :
          { texto: 'Responder por WhatsApp', url: wa(`Hola, me cotizaron ${o.titulo} por ${money(o.cotizacion ?? o.precio_esperado)}. Me interesa.`) }
      }));
      return json({ ok, enviados: ok ? 1 : 0 });
    }

    // ---------- publicación nueva / bajada de precio ----------
    if (tipo === 'nuevo_producto' || tipo === 'baja_precio') {
      if (!admin) return json({ error: 'No autorizado' }, 403);
      const { data: p } = await db.from('productos').select('*').eq('id', id).maybeSingle();
      if (!p || !p.activo) return json({ error: 'Producto no disponible' }, 404);
      const lista = await suscriptores(tipo === 'nuevo_producto' ? 'nuevas' : 'bajadas');
      if (!lista.length) return json({ ok: true, enviados: 0 });
      const baja = tipo === 'baja_precio';
      const antes = Number(body.antes || 0);
      const asunto = baja ? `Bajó de precio: ${p.titulo} ahora ${money(p.precio)}` : `Nueva en Ttoms: ${p.titulo} · ${money(p.precio)}`;
      const n = await enviarMasivo(tx, tipo, p.id, lista, asunto, plantilla({
        titulo: baja ? `${p.titulo} bajó de precio` : `Acaba de entrar: ${p.titulo}`,
        intro: baja && antes ? `Antes <s>${money(antes)}</s>, ahora <b>${money(p.precio)}</b>.` : `Grado ${esc(p.grado)} · <b>${money(p.precio)}</b>. Revisada y probada.`,
        imagen: p.imagen_url,
        parrafos: [esc(p.descripcion || ''), 'La probás antes de pagar en uno de nuestros puntos de San Salvador.'],
        boton: { texto: 'Ver fotos y comprar', url: linkProducto(p) },
        boton2: { texto: 'Preguntar por WhatsApp', url: wa(`Hola, vi ${p.titulo} (${money(p.precio)}). ¿Sigue disponible? ${linkProducto(p)}`) },
        pie: 'Recibís este aviso porque activaste las alertas de Ttoms.'
      }));
      return json({ ok: true, enviados: n });
    }

    // ---------- anuncio libre ----------
    if (tipo === 'anuncio') {
      if (!admin) return json({ error: 'No autorizado' }, 403);
      const asunto = String(body.asunto ?? '').slice(0, 140), cuerpo = String(body.cuerpo ?? '').slice(0, 4000);
      if (asunto.length < 4 || cuerpo.length < 10) return json({ error: 'Falta asunto o mensaje' }, 400);
      const lista = await suscriptores('nuevas');
      const n = await enviarMasivo(tx, 'anuncio', null, lista, asunto, plantilla({
        titulo: asunto, parrafos: esc(cuerpo).split(/\n{2,}/).map((x) => x.replace(/\n/g, '<br>')),
        boton: { texto: 'Ver el catálogo', url: `${SITIO}/#catalogo` },
        pie: 'Recibís este aviso porque activaste las alertas de Ttoms.'
      }));
      return json({ ok: true, enviados: n });
    }

    // ---------- respuesta en el chat ----------
    if (tipo === 'chat') {
      if (!admin) return json({ error: 'No autorizado' }, 403);
      const { data: m } = await db.from('mensajes').select('*').eq('id', id).maybeSingle();
      if (!m || m.autor !== 'admin') return json({ ok: true, omitido: 'mensaje' });
      const hace = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const { count } = await db.from('correos_log').select('id', { count: 'exact', head: true })
        .eq('tipo', 'chat').eq('ref', m.user_id).gte('enviado_en', hace);
      if ((count ?? 0) > 0) return json({ ok: true, omitido: 'reciente' });
      const { data: u } = await db.from('perfiles').select('correo, nombre').eq('id', m.user_id).maybeSingle();
      if (!u?.correo) return json({ ok: true, omitido: 'sin-correo' });
      const ok = await enviar(tx, 'chat', m.user_id, u.correo, 'Te respondimos en el chat de Ttoms', plantilla({
        titulo: 'Tenés una respuesta en el chat',
        intro: `Hola ${esc(u.nombre || '')}, te escribimos:`,
        parrafos: [`<span style="display:block;padding:12px 14px;background:#F3F6F4;border-radius:12px;color:#13201C">${esc(m.texto)}</span>`],
        boton: { texto: 'Abrir el chat', url: `${SITIO}/?chat=1` },
        boton2: { texto: 'Seguir por WhatsApp', url: wa('Hola, vi su respuesta en el chat de la web.') }
      }));
      return json({ ok, enviados: ok ? 1 : 0 });
    }

    return json({ error: 'Tipo de aviso desconocido' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
