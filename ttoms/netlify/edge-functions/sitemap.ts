// Mapa del sitio para Google: páginas fijas + cada consola publicada.
import type { Config } from "@netlify/edge-functions";

const SUPABASE_URL = "https://hnifiotdasqjvjnagvbt.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWZpb3RkYXNxanZqbmFndmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDU4NjMsImV4cCI6MjEwNTUyMTg2M30.CTlFN9YUnItmtabnq0XHzzwknALlqJ4OtH2NVX4eOy4";
const SITIO = "https://ttoms.netlify.app";

export default async () => {
  const fijas = ["/", "/procedencia.html", "/terminos.html", "/privacidad.html"];
  let consolas: { slug: string; creado_en: string }[] = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=slug,creado_en&activo=eq.true&order=creado_en.desc`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (r.ok) consolas = await r.json();
  } catch (_) { /* sin consolas */ }
  const urls = fijas.map((u) => `<url><loc>${SITIO}${u}</loc></url>`)
    .concat(consolas.filter((c) => c.slug).map((c) => `<url><loc>${SITIO}/c/${c.slug}</loc><lastmod>${String(c.creado_en).slice(0, 10)}</lastmod></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" }
  });
};

export const config: Config = { path: "/sitemap.xml" };
