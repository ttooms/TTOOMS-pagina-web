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
| Publicar consola con varias fotos y video | Panel → **Publicar** |
| Editar fotos, precio o descripción | Panel → **Inventario** → **Editar** |
| Copiar el enlace de una consola para WhatsApp o Instagram | Panel → **Inventario** → **Copiar enlace** (o botón **Compartir** en la ficha) |
| Ver pedidos, escribirle al cliente por WhatsApp | Panel → **Pedidos** |
| Confirmar una entrega (manda el comprobante por correo) | Panel → **Pedidos** → **Entregada** |
| Responder consolas que les ofrecen | Panel → **Ofertas recibidas** |
| Registrar una compra con DUI y serie, e imprimir el acta | Panel → **Ofertas recibidas** → **Registrar compra**, o Panel → **Actas de compra** |
| Activar correos, mandar anuncios, ver envíos | Panel → **Correos** |
| Ocultar o borrar una reseña | Panel → **Reseñas** |
| Contestar mensajes | Botón **Chat** (arriba) |

**Cada vez que compren una consola, llenen el acta** con el vendedor presente
(nombre, DUI, serie), imprímanla y fírmenla con huella. Guarden la copia
firmada 10 años. Es su respaldo ante el art. 214-A del Código Penal
(receptación). Al publicar esa consola, elijan el acta en **Viene del acta**:
la serie completa y el número de acta salen en el comprobante del comprador.

**Después de cada entrega, márquenla como Entregada.** La consola sale del
catálogo, suma al contador de la portada, activa la marca *Compra verificada*
en la reseña del cliente y le llega su comprobante con serie y garantía.

## Cambios en `assets/config.js`

Se editan en GitHub (lápiz ✏️ → Commit) y Netlify publica solo:

- Facebook y WhatsApp cuando los tengan (`facebook`, `whatsapp`)
- Puntos de entrega (`puntos`)
- Identificación del negocio para la ley (`legal`: titular, NIT o DUI, dirección, correo)
- Ventas hechas antes de la web, para el contador (`ventasPrevias`)
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

## Correos automáticos

La función `notificar` ya está publicada en Supabase. Envía desde el Gmail del
negocio con una **contraseña de aplicación** de Google (se crea en
myaccount.google.com/apppasswords con la verificación en 2 pasos activa).
Se pega una sola vez en Panel → **Correos**; desde ahí mismo se manda una prueba
y se ve el registro de envíos. Gmail permite unos 500 correos por día.

Los correos de **confirmar cuenta** y **recuperar contraseña** los manda
Supabase aparte: para que no fallen, en Supabase → Authentication → Emails →
SMTP Settings pongan `smtp.gmail.com`, puerto `465`, el mismo Gmail y la misma
contraseña de aplicación.

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
| No llegan correos | Panel → **Correos**: revisar el registro; si dice *Invalid login*, la contraseña de aplicación está mal |
| El enlace de WhatsApp sale sin foto | La consola se publicó antes de esta versión: Editar → Guardar cambios la regenera |
