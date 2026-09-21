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
  whatsapp: '',          // cuando tengan número: '5037XXXXXXX' (sin + ni espacios)
  tiktok: '',
  correoContacto: '',

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
    banco: 'Banco Agrícola',
    cuenta: '',              // número de cuenta para transferencias
    aNombreDe: '',           // a nombre de quién está la cuenta
    costoEnvio: 0,           // 0 = se acuerda por chat
    proteccion: 0            // recargo porcentual; 0 = sin recargo
  },

  /* ---- 7. Correos de anuncios (opcional, ver README) ---- */
  funcionCorreo: ''
};
