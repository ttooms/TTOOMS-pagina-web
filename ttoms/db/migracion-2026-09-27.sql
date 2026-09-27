-- ============================================================
-- TTOMS — Migración del 27 de septiembre de 2026
-- Compra directa, varias fotos, enlace propio por consola,
-- procedencia lícita (actas de compra), contador de ventas
-- y correos automáticos.
-- Se puede correr las veces que sea: no borra datos.
-- ============================================================

-- ------------------------------------------------------------
-- 12. PRODUCTOS: varias fotos, enlace propio y vista previa
-- ------------------------------------------------------------
alter table public.productos add column if not exists imagenes   text[] not null default '{}';
alter table public.productos add column if not exists slug       text;
alter table public.productos add column if not exists og_url     text;
alter table public.productos add column if not exists vendido_en timestamptz;

create or replace function public.slugificar(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(
    lower(translate(coalesce(t, ''), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')),
    '[^a-z0-9]+', '-', 'g')), ''), 'consola');
$$;

create or replace function public.preparar_producto()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- El enlace se crea una sola vez y no cambia aunque cambie el título,
  -- así los enlaces ya compartidos siguen funcionando.
  if new.slug is null or new.slug = '' then
    new.slug := left(public.slugificar(new.titulo), 48) || '-' || substr(replace(new.id::text, '-', ''), 1, 5);
  end if;
  -- La portada siempre es la primera foto.
  if coalesce(cardinality(new.imagenes), 0) = 0 and new.imagen_url is not null then
    new.imagenes := array[new.imagen_url];
  end if;
  if coalesce(cardinality(new.imagenes), 0) > 0 then
    new.imagen_url := new.imagenes[1];
  end if;
  -- Fecha de venta para el contador público.
  if new.activo then
    new.vendido_en := null;
  elsif tg_op = 'UPDATE' and old.activo and new.vendido_en is null then
    new.vendido_en := now();
  end if;
  return new;
end;
$$;
drop trigger if exists preparar_producto on public.productos;
create trigger preparar_producto before insert or update on public.productos
  for each row execute function public.preparar_producto();

-- Rellena el enlace y las fotos de lo que ya estaba publicado.
update public.productos set imagenes = imagenes where slug is null or cardinality(imagenes) = 0;
create unique index if not exists productos_slug_idx on public.productos (slug);

-- Número de serie COMPLETO de cada consola: privado, solo administradores.
-- (En la web pública solo se muestran los últimos 4 dígitos.)
create table if not exists public.productos_origen (
  producto_id uuid primary key references public.productos on delete cascade,
  serie       text,
  acta_id     uuid,
  notas       text,
  editado_en  timestamptz not null default now()
);
alter table public.productos_origen enable row level security;
drop policy if exists origen_admin on public.productos_origen;
create policy origen_admin on public.productos_origen
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ------------------------------------------------------------
-- 13. OFERTAS: declaración de procedencia lícita
-- ------------------------------------------------------------
alter table public.ofertas add column if not exists serie              text;
alter table public.ofertas add column if not exists comprobante_origen text;
alter table public.ofertas add column if not exists telefono           text;
alter table public.ofertas add column if not exists declaracion_en     timestamptz;
alter table public.ofertas add column if not exists aviso_en           timestamptz;
alter table public.ofertas add column if not exists acta_id            uuid;

alter table public.ofertas drop constraint if exists ofertas_estado_check;
alter table public.ofertas add constraint ofertas_estado_check
  check (estado in ('pendiente','cotizada','aceptada','rechazada','comprada'));

create or replace function public.sanear_oferta()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    if new.declaracion_en is null then
      raise exception 'Falta aceptar la declaración de procedencia lícita.';
    end if;
    new.declaracion_en := now();   -- la hora la pone el servidor, no el navegador
    new.estado := 'pendiente';
    new.cotizacion := null;
    new.user_id := auth.uid();
    new.aviso_en := null;
    new.acta_id := null;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 14. ACTAS DE COMPRA (cuando ustedes compran una consola)
--     Prueba de buena fe ante el art. 214-A del Código Penal
--     (receptación). Solo administradores. Se guardan 10 años.
-- ------------------------------------------------------------
create sequence if not exists public.actas_seq;
create table if not exists public.actas_compra (
  id                  uuid primary key default gen_random_uuid(),
  numero              text not null unique default (
                        'AC-' || to_char(now() at time zone 'America/El_Salvador', 'YYYY') || '-' ||
                        lpad(nextval('public.actas_seq')::text, 4, '0')),
  oferta_id           uuid references public.ofertas on delete set null,
  vendedor_nombre     text not null check (char_length(vendedor_nombre) >= 5),
  documento_tipo      text not null default 'DUI' check (documento_tipo in ('DUI','Carné de residente','Pasaporte')),
  documento_numero    text not null,
  vendedor_telefono   text,
  vendedor_domicilio  text,
  articulo            text not null,
  serie               text not null check (char_length(serie) >= 4),
  accesorios          text,
  estado_fisico       text,
  comprobante_origen  text,
  verificaciones      jsonb not null default '{}'::jsonb,
  monto               numeric(10,2) not null check (monto >= 0),
  metodo_pago         text,
  lugar               text,
  fecha               timestamptz not null default now(),
  notas               text,
  creado_por          uuid default auth.uid(),
  creado_en           timestamptz not null default now(),
  constraint dui_valido check (documento_tipo <> 'DUI' or documento_numero ~ '^[0-9]{8}-[0-9]$')
);
create index if not exists actas_serie_idx on public.actas_compra (lower(serie));
alter table public.actas_compra enable row level security;
drop policy if exists actas_admin on public.actas_compra;
create policy actas_admin on public.actas_compra
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ------------------------------------------------------------
-- 15. ÓRDENES: compra directa (sin apartados)
-- ------------------------------------------------------------
alter table public.ordenes add column if not exists telefono       text;
alter table public.ordenes add column if not exists serie          text;
alter table public.ordenes add column if not exists pagada_en      timestamptz;
alter table public.ordenes add column if not exists entregada_en   timestamptz;
alter table public.ordenes add column if not exists garantia_hasta date;
alter table public.ordenes add column if not exists aviso_en       timestamptz;

-- El precio, el título y el correo los pone la base, no el navegador.
create or replace function public.sanear_orden()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  p record;
  abiertas int;
begin
  if auth.uid() is not null and not public.es_admin() then
    new.estado := 'pendiente';
    new.user_id := auth.uid();
    new.serie := null; new.pagada_en := null; new.entregada_en := null;
    new.garantia_hasta := null; new.aviso_en := null;

    select id, titulo, precio, activo into p from public.productos where id = new.producto_id;
    if p.id is null or not p.activo then
      raise exception 'Esta consola ya se vendió o no está disponible.';
    end if;
    new.monto := p.precio;
    new.titulo_producto := p.titulo;
    new.correo := coalesce((select correo from public.perfiles where id = auth.uid()), new.correo);

    if exists (select 1 from public.ordenes o
               where o.user_id = auth.uid() and o.producto_id = new.producto_id and o.estado = 'pendiente') then
      raise exception 'Ya tenés un pedido abierto de esta consola. Te escribimos para coordinar la entrega.';
    end if;
    select count(*) into abiertas from public.ordenes o where o.user_id = auth.uid() and o.estado = 'pendiente';
    if abiertas >= 3 then
      raise exception 'Tenés 3 pedidos abiertos. Escribinos por WhatsApp para completarlos antes de hacer otro.';
    end if;
  end if;
  return new;
end;
$$;

-- Al marcar pagada o entregada: la consola sale del catálogo, se copia la
-- serie al comprobante y se fija la fecha límite de la garantía.
create or replace function public.al_cambiar_orden()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  dias int;
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'pagada' then
      new.pagada_en := coalesce(new.pagada_en, now());
    end if;
    if new.estado = 'entregada' then
      new.entregada_en := coalesce(new.entregada_en, now());
      select coalesce((valor->>'dias')::int, 15) into dias from public.ajustes where clave = 'garantia';
      new.garantia_hasta := coalesce(new.garantia_hasta,
        (now() at time zone 'America/El_Salvador')::date + coalesce(dias, 15));
      if new.serie is null then
        select serie into new.serie from public.productos_origen where producto_id = new.producto_id;
      end if;
    end if;
    if new.estado in ('pagada','entregada') and new.producto_id is not null then
      update public.productos set activo = false where id = new.producto_id and activo;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists al_cambiar_orden on public.ordenes;
create trigger al_cambiar_orden before update of estado on public.ordenes
  for each row execute function public.al_cambiar_orden();

-- ------------------------------------------------------------
-- 16. CONTADOR PÚBLICO ("X consolas entregadas")
-- ------------------------------------------------------------
create or replace function public.estadisticas_publicas()
returns json
language sql
stable
security definer set search_path = public
as $$
  select json_build_object(
    'entregadas', (select count(*) from public.ordenes where estado = 'entregada'),
    'vendidas',   (select count(*) from public.productos where vendido_en is not null)
  );
$$;
revoke execute on function public.estadisticas_publicas() from public;
grant execute on function public.estadisticas_publicas() to anon, authenticated;

-- ------------------------------------------------------------
-- 17. CORREOS: configuración privada y registro de envíos
-- ------------------------------------------------------------
-- "privado" no tiene reglas de lectura: solo la función de correo
-- (que corre en el servidor) puede leerla. Ni los administradores
-- pueden ver la contraseña desde la web: solo reemplazarla.
create table if not exists public.privado (
  clave      text primary key,
  valor      jsonb not null,
  editado_en timestamptz not null default now()
);
alter table public.privado enable row level security;
revoke all on public.privado from anon, authenticated;

create table if not exists public.correos_log (
  id         bigserial primary key,
  tipo       text not null,
  ref        text,
  para       text,
  asunto     text,
  ok         boolean not null default true,
  error      text,
  enviado_en timestamptz not null default now()
);
create index if not exists correos_log_idx on public.correos_log (tipo, ref, enviado_en desc);
alter table public.correos_log enable row level security;
drop policy if exists correos_log_admin on public.correos_log;
create policy correos_log_admin on public.correos_log
  for select to authenticated using (public.es_admin());

create or replace function public.guardar_correo_envio(usuario text, clave_app text, nombre text default 'Ttoms')
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  if usuario !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Correo no válido'; end if;
  if char_length(replace(coalesce(clave_app, ''), ' ', '')) < 12 then
    raise exception 'La contraseña de aplicación tiene 16 letras';
  end if;
  insert into public.privado (clave, valor, editado_en)
  values ('smtp', jsonb_build_object(
    'host', 'smtp.gmail.com', 'port', 465,
    'user', lower(trim(usuario)), 'pass', replace(clave_app, ' ', ''),
    'nombre', coalesce(nullif(trim(nombre), ''), 'Ttoms')), now())
  on conflict (clave) do update set valor = excluded.valor, editado_en = now();
end;
$$;
revoke execute on function public.guardar_correo_envio(text, text, text) from public, anon;
grant execute on function public.guardar_correo_envio(text, text, text) to authenticated;

create or replace function public.estado_correo()
returns json
language sql
stable
security definer set search_path = public
as $$
  select case when public.es_admin() then
    coalesce((select json_build_object('configurado', true, 'usuario', valor->>'user', 'editado_en', editado_en)
              from public.privado where clave = 'smtp'), json_build_object('configurado', false))
  else null end;
$$;
revoke execute on function public.estado_correo() from public, anon;
grant execute on function public.estado_correo() to authenticated;

-- ------------------------------------------------------------
-- 18. Las funciones de trigger no se llaman desde afuera
-- ------------------------------------------------------------
revoke execute on function public.preparar_producto() from public, anon, authenticated;
revoke execute on function public.al_cambiar_orden()  from public, anon, authenticated;
revoke execute on function public.sanear_orden()      from public, anon, authenticated;
revoke execute on function public.sanear_oferta()     from public, anon, authenticated;

-- ------------------------------------------------------------
-- 19. Número de acta en el comprobante del comprador
-- ------------------------------------------------------------
alter table public.ordenes add column if not exists acta_numero text;

create or replace function public.al_cambiar_orden()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  dias int;
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'pagada' then
      new.pagada_en := coalesce(new.pagada_en, now());
    end if;
    if new.estado = 'entregada' then
      new.entregada_en := coalesce(new.entregada_en, now());
      select coalesce((valor->>'dias')::int, 15) into dias from public.ajustes where clave = 'garantia';
      new.garantia_hasta := coalesce(new.garantia_hasta,
        (now() at time zone 'America/El_Salvador')::date + coalesce(dias, 15));
      if new.serie is null then
        select serie into new.serie from public.productos_origen where producto_id = new.producto_id;
      end if;
      if new.acta_numero is null then
        select a.numero into new.acta_numero
        from public.productos_origen po join public.actas_compra a on a.id = po.acta_id
        where po.producto_id = new.producto_id;
      end if;
    end if;
    if new.estado in ('pagada','entregada') and new.producto_id is not null then
      update public.productos set activo = false where id = new.producto_id and activo;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.al_cambiar_orden() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 20. Correos con Brevo (alternativa a la contraseña de aplicación de Gmail)
-- ------------------------------------------------------------
create or replace function public.guardar_brevo(clave_api text, correo text, nombre text default 'Ttoms')
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  if correo !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then raise exception 'Correo no válido'; end if;
  if coalesce(clave_api, '') !~ '^xkeysib-' then raise exception 'La clave de Brevo empieza con xkeysib-'; end if;
  insert into public.privado (clave, valor, editado_en)
  values ('brevo', jsonb_build_object('key', trim(clave_api), 'user', lower(trim(correo)),
    'nombre', coalesce(nullif(trim(nombre), ''), 'Ttoms')), now())
  on conflict (clave) do update set valor = excluded.valor, editado_en = now();
  delete from public.privado where clave = 'smtp';
end;
$$;
revoke execute on function public.guardar_brevo(text, text, text) from public, anon;
grant execute on function public.guardar_brevo(text, text, text) to authenticated;

create or replace function public.estado_correo()
returns json
language sql
stable
security definer set search_path = public
as $$
  select case when public.es_admin() then
    coalesce((select json_build_object('configurado', true, 'usuario', valor->>'user', 'proveedor',
                case clave when 'brevo' then 'Brevo' else 'Gmail' end, 'editado_en', editado_en)
              from public.privado where clave in ('smtp','brevo') order by editado_en desc limit 1),
             json_build_object('configurado', false))
  else null end;
$$;
