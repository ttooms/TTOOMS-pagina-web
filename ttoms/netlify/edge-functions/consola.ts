// ============================================================
// TTOMS — Vista previa de cada consola (/c/<consola>)
// WhatsApp, Instagram y Facebook no ejecutan JavaScript: leen las
// etiquetas <meta> del HTML. Esta función pone en la página el
// título, el precio y la foto de la consola antes de enviarla.
// ============================================================
import type { Config, Context } from "@netlify/edge-functions";

const SUPABASE_URL = "https://hnifiotdasqjvjnagvbt.supabase.co";
// Clave pública (anon): es la misma que ya está en assets/config.js.
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWZpb3RkYXNxanZqbmFndmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDU4NjMsImV4cCI6MjEwNTUyMTg2M30.CTlFN9YUnItmtabnq0XHzzwknALlqJ4OtH2NVX4eOy4";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
const money = (n: unknown) => "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const GRADO: Record<string, string> = { S: "como nueva", A: "muy buena", B: "buena", C: "con marcas de uso" };

function meta(html: string, attr: "name" | "property", key: string, value: string) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*">`);
  const tag = `<meta ${attr}="${key}" content="${esc(value)}">`;
  return re.test(html) ? html.replace(re, () => tag) : html.replace("</head>", () => tag + "\n</head>");
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const pagina = await fetch(new URL("/index.html", url));
  let html = await pagina.text();
  const slug = decodeURIComponent(url.pathname.split("/")[2] || "");
  try {
    const q = `${SUPABASE_URL}/rest/v1/productos?select=id,titulo,precio,grado,categoria,descripcion,og_url,imagen_url,imagenes,slug,activo&slug=eq.${encodeURIComponent(slug)}&limit=1`;
    const r = await fetch(q, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
    const lista = r.ok ? await r.json() : [];
    const p = Array.isArray(lista) ? lista[0] : null;
    if (p) {
      const titulo = `${p.titulo} · ${money(p.precio)} · Ttoms`;
      const desc = `Grado ${p.grado} (${GRADO[p.grado] || ""}). Revisada, con serie verificada y garantía. La probás antes de pagar en San Salvador.`;
      const imagen = p.og_url || p.imagen_url || "https://ttoms.netlify.app/assets/og.jpg";
      const canon = `https://ttoms.netlify.app/c/${p.slug}`;
      html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(titulo)}</title>`);
      html = meta(html, "name", "description", desc);
      html = meta(html, "property", "og:title", titulo);
      html = meta(html, "property", "og:description", desc);
      html = meta(html, "property", "og:url", canon);
      html = meta(html, "property", "og:image", imagen);
      html = meta(html, "property", "og:type", "product");
      if (!p.og_url) {
        html = html.replace(/<meta property="og:image:width"[^>]*>\n?/, "").replace(/<meta property="og:image:height"[^>]*>\n?/, "");
      }
      html = html.replace(/<link rel="canonical" href="[^"]*">/, () => `<link rel="canonical" href="${esc(canon)}">`);
      const ld = {
        "@context": "https://schema.org", "@type": "Product", name: p.titulo, category: p.categoria,
        image: (p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen_url]).filter(Boolean),
        description: p.descripcion, itemCondition: "https://schema.org/UsedCondition",
        offers: { "@type": "Offer", price: Number(p.precio).toFixed(2), priceCurrency: "USD", url: canon,
          availability: p.activo ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          seller: { "@type": "Organization", name: "Ttoms" } }
      };
      html = html.replace("</head>", () => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n</head>`);
    }
  } catch (e) {
    console.error("vista previa", e);
  }
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" }
  });
};

export const config: Config = { path: "/c/*" };
