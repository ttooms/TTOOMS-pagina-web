# Ttoms — sitio de compra y venta de consolas

Sitio estático (HTML, CSS y JavaScript) + Supabase para usuarios, productos,
órdenes, ofertas, chat y reseñas. Se publica en Netlify.

```
index.html                 la página
assets/config.js           ÚNICO archivo que editan para configurar
assets/styles.css          estilos
assets/app.js              lógica
db/schema.sql              base de datos (copia de lo que ya está aplicado)
supabase/functions/        correos de anuncios (opcional)
netlify.toml               configuración de Netlify
```

## Lo que ya está hecho

- **Supabase**: proyecto `ttoms` creado y con toda la base aplicada
  (tablas, seguridad por filas, candados anti-trampa, buckets de fotos y videos).
  URL: `https://hnifiotdasqjvjnagvbt.supabase.co`
- **Claves**: ya están puestas en `assets/config.js`.
- **Netlify**: proyecto `ttoms` creado, sin contraseña, esperando el primer deploy.
  Dirección: `https://ttoms.netlify.app`

## Lo que falta (15 minutos)

### 1. Subir el código a GitHub
Repositorio: `https://github.com/ttooms/TTOOMS-pagina-web`

**Add file → Upload files** → arrastrar **el contenido** de esta carpeta
(index.html, assets, db, supabase, netlify.toml, README.md) → **Commit changes**.

### 2. Conectar Netlify al repositorio
Netlify → proyecto **ttoms** → **Project configuration** → **Build & deploy** →
**Link repository** → GitHub → `TTOOMS-pagina-web`.
Build command: vacío. Publish directory: `.` (ya viene en `netlify.toml`).

A partir de ahí, **cada cambio en GitHub se publica solo** en un minuto.

*Atajo si quieren verlo ya*: Netlify → proyecto **ttoms** → pestaña **Deploys** →
arrastrar la carpeta al recuadro de "drag and drop". Sube al instante, pero sin
la ventaja de actualizarse solo.

### 3. Ajustes de Supabase (obligatorio)
- **Authentication → Sign In / Providers → Email**: apagar **Confirm email**
  para que la gente entre apenas se registra.
- **Authentication → URL Configuration → Site URL**: `https://ttoms.netlify.app`
  Sin esto, el enlace de "olvidé mi contraseña" no lleva a su sitio.

### 4. Hacerse administradores (los dos)
Cada uno se registra en el sitio publicado con su correo. Después, en
Supabase → **SQL Editor**:

```sql
update public.perfiles set rol = 'admin'
where correo in ('correo-uno@ejemplo.com', 'correo-dos@ejemplo.com');
```

Cerrar sesión, volver a entrar, y aparece **Panel de administrador**.

---

## Uso diario (sin tocar código)

| Qué | Dónde |
|---|---|
| Publicar consola con foto y video | Panel → **Publicar** |
| Cambiar precio, marcar vendida, borrar | Panel → **Inventario** |
| Ver quién apartó qué y dónde | Panel → **Órdenes** |
| Confirmar una entrega | Panel → **Órdenes** → **Entregada** |
| Responder consolas que les ofrecen | Panel → **Ofertas recibidas** |
| Ocultar o borrar una reseña | Panel → **Reseñas** |
| Contestar mensajes | Botón **Chat** (arriba) |

**Después de cada entrega, márquenla como Entregada.** Eso le pone la marca
*Compra verificada* a la reseña de ese cliente. Es lo que más confianza genera:
esa marca la pone la base de datos, no se puede poner a mano.

## Cambios en `assets/config.js`

Se editan en GitHub (lápiz ✏️ → Commit) y Netlify publica solo:

- Facebook y WhatsApp cuando los tengan (`facebook`, `whatsapp`)
- Puntos de entrega (`puntos`)
- Cuenta bancaria para transferencias (`pagos.cuenta`, `pagos.aNombreDe`)
- Video de fondo del inicio (`heroVideo`)
- Nombre de la marca (`marca`)

> La clave que está en `config.js` es la **anon / publishable**: es pública por
> diseño y puede estar en GitHub. La que **nunca** se comparte ni se pega en
> ningún lado es la `service_role` / `secret`.

## Video de fondo

Graben sus consolas con el celular: 10–20 s, horizontal, sin audio, menos de 8 MB
(se comprime gratis en freeconvert.com/video-compressor). Supabase → **Storage** →
bucket `media` → **Upload** → copian la URL pública → `heroVideo` en `config.js`.
No usen videos de otras personas de YouTube o TikTok.

## Correos de anuncios (opcional)

Supabase ya manda solo los de confirmación y recuperar contraseña. Para los
anuncios de publicaciones nuevas: cuenta gratis en resend.com y

```bash
npm install -g supabase
supabase login
supabase link --project-ref hnifiotdasqjvjnagvbt
supabase functions deploy notificar --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_xxx
```

Peguen la URL de la función en `funcionCorreo` de `config.js`. Mientras tanto, el
panel tiene un botón para copiar los correos de los suscriptores.

## Cobro con tarjeta

Hoy el sitio trabaja con efectivo en la entrega y transferencia. Para tarjeta se
necesita cuenta de comercio en **Wompi** (Banco Agrícola) o **N1CO** (Cuscatlán).
Cuando la tengan aprobada, se pone `pagos.tarjeta: true` y se conecta la pasarela
con verificación del pago del lado del servidor.

## Si algo falla

| Síntoma | Causa |
|---|---|
| Barra amarilla de "modo demostración" | `config.js` sin claves, o no se subió el cambio |
| "No pudimos cargar el catálogo" | Revisar que el proyecto de Supabase esté activo |
| No aparece el panel de administrador | Falta el `update ... rol = 'admin'` o volver a iniciar sesión |
| No suben las fotos | El usuario no es administrador todavía |
| Recuperar contraseña lleva a otro lado | Falta la **Site URL** del paso 3 |
