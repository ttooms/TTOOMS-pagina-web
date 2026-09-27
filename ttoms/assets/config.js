/* ============================================================
   TTOMS — Configuración del sitio
   Este es el ÚNICO archivo que necesitan tocar para configurar.
   Después de guardar, suban el cambio a GitHub y Netlify
   publica solo en un minuto.
   ============================================================ */

window.TTOMS_CONFIG = {

  /* ---- 1. Conexión a Supabase ----
     Supabase → su proyecto → Project Settings → Data API (la URL)
     y → API Keys (la clave "anon public" o "publishable").
     Mientras estén vacías, el sitio muestra MODO DEMO. */
  supabaseUrl:  'https://hnifiotdasqjvjnagvbt.supabase.co',
  supabaseKey:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaWZpb3RkYXNxanZqbmFndmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDU4NjMsImV4cCI6MjEwNTUyMTg2M30.CTlFN9YUnItmtabnq0XHzzwknALlqJ4OtH2NVX4eOy4',

  /* ---- 2. Datos del negocio ---- */
  marca: 'Ttoms',
  ciudad: 'San Salvador, El Salvador',
  instagram: 'https://www.instagram.com/tooms.af',
  instagramUsuario: '@tooms.af',
  facebook: '',          // cuando creen la página, pegan el enlace aquí
  whatsapp: ['50372830915', '50379036666'],   // con 503 adelante, sin + ni espacios
  tiktok: '',
  correoContacto: '',

  sitio: 'https://ttoms.netlify.app',

  /* Ventas hechas ANTES de tener la web (por Instagram o WhatsApp).
     Se suman al contador "X consolas entregadas" de la portada.
     El contador aparece solo cuando el total es 1 o más. */
  ventasPrevias: 0,

  /* Días de garantía (también se usa en el comprobante). */
  garantiaDias: 15,

  /* ---- Identificación del comercio (Ley de Protección al Consumidor, art. 21-A) ----
     La ley pide que la tienda en línea muestre quién es el proveedor.
     Llenen estos datos: aparecen en el pie de página, en los Términos,
     en el comprobante de compra y en el acta. Lo que quede vacío no se muestra. */
  legal: {
    titular: '',            // nombre completo de la persona dueña del negocio (o razón social)
    documento: '',          // NIT o DUI del titular
    direccion: '',          // dirección para notificaciones y reclamos
    correo: '',             // correo para reclamos (puede ser el mismo del negocio)
    registroDefensoria: '', // número del Registro de Proveedores de Comercio Electrónico, cuando lo tengan
    notaFiscal: 'Comprobante interno de compraventa. No sustituye a un documento tributario electrónico (DTE).'
  },

  /* Frases de la cinta animada de arriba (agreguen o quiten las que quieran) */
  anuncios: [
    'Entregas en 6 puntos de San Salvador',
    'Probás antes de pagar',
    'Te compramos tu consola',
    'Consolas con serie verificada y procedencia legal',
    'Garantía de 15 días'
  ],

  /* ---- 3. Puntos de entrega en San Salvador ----
     Agreguen, quiten o cambien el orden libremente. */
  puntos: [
    'Texaco La Gloria',
    'Texaco Constitución',
    'Puma Constitución',
    'Puma de la Nacional',
    'Plaza El Salvador del Mundo',
    'Metrocentro San Salvador'
  ],
  /* Qué se le dice a quien está fuera de San Salvador */
  fueraDeSanSalvador: 'Fuera de San Salvador coordinamos la entrega por chat: punto intermedio o envío por encomienda.',

  /* ---- 4. Departamentos (para el registro) ---- */
  departamentos: [
    'San Salvador', 'La Libertad', 'Santa Ana', 'San Miguel', 'Sonsonate',
    'Ahuachapán', 'Usulután', 'La Paz', 'Chalatenango', 'Cuscatlán',
    'La Unión', 'San Vicente', 'Cabañas', 'Morazán'
  ],

  /* ---- 5. Video de fondo del inicio ----
     Suban el video a Supabase → Storage → bucket "media" y peguen el
     enlace público. Vacío = fondo animado suave. */
  heroVideo: '',
  heroPoster: '',

  /* ---- 6. Cobros ---- */
  pagos: {
    tarjeta: false,          // true cuando integren Wompi/N1CO
    transferencia: true,
    efectivo: true,
    // Los datos de la cuenta bancaria NO van aquí: están guardados en la base de
    // datos (tabla "ajustes") y solo los ven clientes con sesión, al apartar.
    costoEnvio: 0,           // 0 = se acuerda por chat
    proteccion: 0            // recargo porcentual; 0 = sin recargo
  },

  /* ---- 7. Correos automáticos ----
     La función ya está publicada en Supabase. La cuenta de Gmail que envía
     se configura desde el sitio: Panel → Correos. */
  funcionCorreo: 'https://hnifiotdasqjvjnagvbt.supabase.co/functions/v1/notificar'
};
