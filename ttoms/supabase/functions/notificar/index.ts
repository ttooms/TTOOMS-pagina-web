// ============================================================
// TTOMS — Función de correo (opcional, paso 7 del README)
// Envía los anuncios de publicaciones nuevas y las respuestas
// a las ofertas. Usa Resend (https://resend.com), plan gratis.
//
// Desplegar:
//   supabase functions deploy notificar --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set CORREO_DE="Ttoms <hola@tudominio.com>"
// ============================================================

const RESEND = Deno.env.get('RESEND_API_KEY') ?? '';
const DE = Deno.env.get('CORREO_DE') ?? 'Ttoms <onboarding@resend.dev>';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function plantilla(asunto: string, cuerpo: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F2F5F3;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#17211F">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #D9E1DD;border-radius:16px;overflow:hidden">
        <tr><td style="padding:22px 26px;border-bottom:1px solid #D9E1DD">
          <span style="font-size:19px;font-weight:600;letter-spacing:.01em">Ttoms</span>
          <span style="font-size:11px;color:#849690;letter-spacing:.12em;border:1px solid #C5D1CC;border-radius:4px;padding:1px 5px;margin-left:6px">SV</span>
        </td></tr>
        <tr><td style="padding:26px">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;line-height:1.25">${asunto}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#5B6C67;white-space:pre-line">${cuerpo}</p>
        </td></tr>
        <tr><td style="padding:16px 26px;border-top:1px solid #D9E1DD;font-size:12px;color:#849690">
          Recibís este correo porque activaste las alertas de Ttoms.
          Podés cambiarlas o desactivarlas desde Mi cuenta en el sitio.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405, headers: cors });

  try {
    const { destinatarios, asunto, cuerpo } = await req.json();

    if (!Array.isArray(destinatarios) || !destinatarios.length || !asunto || !cuerpo) {
      return new Response(JSON.stringify({ error: 'Faltan destinatarios, asunto o cuerpo' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (!RESEND) {
      return new Response(JSON.stringify({ error: 'Falta la clave RESEND_API_KEY' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const html = plantilla(asunto, cuerpo);
    let enviados = 0;

    // De 40 en 40 para no pasarse de los límites del proveedor.
    for (let i = 0; i < destinatarios.length; i += 40) {
      const lote = destinatarios.slice(i, i + 40);
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        // bcc mantiene privadas las direcciones entre los suscriptores
        body: JSON.stringify({ from: DE, to: [DE], bcc: lote, subject: asunto, html })
      });
      if (r.ok) enviados += lote.length;
      else console.error('Resend respondió', r.status, await r.text());
    }

    return new Response(JSON.stringify({ enviados }),
      { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
