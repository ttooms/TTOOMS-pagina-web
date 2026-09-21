-- ============================================================
-- TTOMS — Base de datos completa
-- Pegá TODO este archivo en Supabase → SQL Editor → Run.
-- Se puede correr las veces que sea: si ya lo corriste antes,
-- solo agrega lo nuevo sin borrar nada.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFILES (una fila por usuario registrado)
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users on delete cascade,
  nombre      text not null default '',
  correo      text not null,
  rol         text not null default 'comprador' check (rol in ('comprador','admin')),
  alertas     jsonb not null default '{"nuevas":true,"bajadas":true,"ofertas":true,"resumen":false,"frecuencia":"inmediato"}'::jsonb,
  creado_en   timestamptz not null default now()
);
alter table public.perfiles add column if not exists nombre_completo text;
alter table public.perfiles add column if not exists departamento   text;
alter table public.perfiles add column if not exists telefono       text;

-- Al registrarse, se crea el perfil con lo que la persona llenó.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, nombre_completo, departamento, correo, alertas)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre',''), split_part(new.email,'@',1)),
    nullif(new.raw_user_meta_data->>'nombre_completo',''),
    nullif(new.raw_user_meta_data->>'departamento',''),
    new.email,
    coalesce(new.raw_user_meta_data->'alertas',
      '{"nuevas":true,"bajadas":true,"ofertas":true,"resumen":false,"frecuencia":"inmediato"}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ¿Quien consulta es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin');
$$;

-- Candado: nadie puede volverse administrador desde el sitio.
-- (Desde el SQL Editor de Supabase sí se puede, porque ahí no hay usuario del sitio.)
create or replace function public.proteger_rol()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null and not public.es_admin() then
    raise exception 'No autorizado a cambiar el rol';
  end if;
  if new.correo is distinct from old.correo and auth.uid() is not null and not public.es_admin() then
    new.correo := old.correo;
  end if;
  return new;
end;
$$;
drop trigger if exists candado_rol on public.perfiles;
create trigger candado_rol before update on public.perfiles
  for each row execute function public.proteger_rol();

-- ------------------------------------------------------------
-- 2. PRODUCTOS (su inventario)
-- ------------------------------------------------------------
create table if not exists public.productos (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  categoria    text not null default 'PlayStation',
  precio       numeric(10,2) not null check (precio >= 0),
  grado        text not null default 'A' check (grado in ('S','A','B','C')),
  ubicacion    text not null default 'San Salvador',
  incluye      text[] not null default '{}',
  descripcion  text not null default '',
  serie        text,
  envio        boolean not null default true,
  activo       boolean not null default true,
  imagen_url   text,
  video_url    text,
  creado_en    timestamptz not null default now()
);
create index if not exists productos_creado_idx on public.productos (creado_en desc);

-- ------------------------------------------------------------
-- 3. ÓRDENES
-- ------------------------------------------------------------
create table if not exists public.ordenes (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  user_id         uuid not null references auth.users on delete cascade,
  correo          text,
  producto_id     uuid references public.productos on delete set null,
  titulo_producto text,
  monto           numeric(10,2) not null,
  metodo_pago     text not null,
  metodo_entrega  text not null,
  nota            text,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','pagada','entregada','cancelada')),
  creado_en       timestamptz not null default now()
);
alter table public.ordenes add column if not exists nombre_cliente text;
alter table public.ordenes add column if not exists punto_entrega  text;

-- Candado: un cliente no puede crear una orden ya "entregada".
create or replace function public.sanear_orden()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    new.estado := 'pendiente';
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists candado_orden on public.ordenes;
create trigger candado_orden before insert on public.ordenes
  for each row execute function public.sanear_orden();

-- ------------------------------------------------------------
-- 4. OFERTAS (consolas que la gente les quiere vender)
-- ------------------------------------------------------------
create table if not exists public.ofertas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  nombre          text,
  correo          text,
  titulo          text not null,
  categoria       text not null default 'PlayStation',
  grado           text not null default 'A',
  precio_esperado numeric(10,2) not null,
  ubicacion       text,
  descripcion     text,
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','cotizada','aceptada','rechazada')),
  cotizacion      numeric(10,2),
  creado_en       timestamptz not null default now()
);

create or replace function public.sanear_oferta()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    new.estado := 'pendiente';
    new.cotizacion := null;
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists candado_oferta on public.ofertas;
create trigger candado_oferta before insert on public.ofertas
  for each row execute function public.sanear_oferta();

-- ------------------------------------------------------------
-- 5. MENSAJES (chat)
-- ------------------------------------------------------------
create table if not exists public.mensajes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  producto_id    uuid references public.productos on delete set null,
  autor          text not null check (autor in ('cliente','admin')),
  nombre_cliente text,
  texto          text not null check (char_length(texto) <= 2000),
  creado_en      timestamptz not null default now()
);
create index if not exists mensajes_hilo_idx on public.mensajes (user_id, producto_id, creado_en);

-- ------------------------------------------------------------
-- 6. RESEÑAS
--    "verificada" = la persona tiene al menos una compra entregada.
--    Lo calcula la base de datos, nadie lo puede marcar a mano.
-- ------------------------------------------------------------
create table if not exists public.resenas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users on delete cascade,
  nombre       text not null,
  departamento text,
  estrellas    int  not null check (estrellas between 1 and 5),
  texto        text not null check (char_length(texto) between 10 and 600),
  verificada   boolean not null default false,
  visible      boolean not null default true,
  creado_en    timestamptz not null default now()
);

create or replace function public.sanear_resena()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.es_admin() then
    new.user_id := auth.uid();
    new.visible := coalesce(old.visible, true);
    new.verificada := exists (
      select 1 from public.ordenes o where o.user_id = auth.uid() and o.estado = 'entregada'
    );
  end if;
  return new;
end;
$$;
drop trigger if exists candado_resena on public.resenas;
create trigger candado_resena before insert or update on public.resenas
  for each row execute function public.sanear_resena();

-- Cuando marcan una orden como entregada, la reseña de ese cliente pasa a verificada.
create or replace function public.verificar_resena()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.estado = 'entregada' then
    update public.resenas set verificada = true where user_id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists orden_entregada on public.ordenes;
create trigger orden_entregada after update of estado on public.ordenes
  for each row execute function public.verificar_resena();

-- ------------------------------------------------------------
-- 7. SEGURIDAD (RLS)
-- ------------------------------------------------------------
alter table public.perfiles  enable row level security;
alter table public.productos enable row level security;
alter table public.ordenes   enable row level security;
alter table public.ofertas   enable row level security;
alter table public.mensajes  enable row level security;
alter table public.resenas   enable row level security;

-- Perfiles
drop policy if exists perfil_propio_select on public.perfiles;
create policy perfil_propio_select on public.perfiles
  for select using (auth.uid() = id or public.es_admin());
drop policy if exists perfil_propio_update on public.perfiles;
create policy perfil_propio_update on public.perfiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists perfil_admin_update on public.perfiles;
create policy perfil_admin_update on public.perfiles
  for update using (public.es_admin());

-- Productos: todos ven los activos; solo administradores escriben.
drop policy if exists productos_lectura on public.productos;
create policy productos_lectura on public.productos
  for select using (activo or public.es_admin());
drop policy if exists productos_admin_insert on public.productos;
create policy productos_admin_insert on public.productos
  for insert with check (public.es_admin());
drop policy if exists productos_admin_update on public.productos;
create policy productos_admin_update on public.productos
  for update using (public.es_admin());
drop policy if exists productos_admin_delete on public.productos;
create policy productos_admin_delete on public.productos
  for delete using (public.es_admin());

-- Órdenes
drop policy if exists ordenes_select on public.ordenes;
create policy ordenes_select on public.ordenes
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists ordenes_insert on public.ordenes;
create policy ordenes_insert on public.ordenes
  for insert with check (auth.uid() = user_id);
drop policy if exists ordenes_admin_update on public.ordenes;
create policy ordenes_admin_update on public.ordenes
  for update using (public.es_admin());

-- Ofertas
drop policy if exists ofertas_select on public.ofertas;
create policy ofertas_select on public.ofertas
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists ofertas_insert on public.ofertas;
create policy ofertas_insert on public.ofertas
  for insert with check (auth.uid() = user_id);
drop policy if exists ofertas_admin_update on public.ofertas;
create policy ofertas_admin_update on public.ofertas
  for update using (public.es_admin());

-- Mensajes
drop policy if exists mensajes_select on public.mensajes;
create policy mensajes_select on public.mensajes
  for select using (auth.uid() = user_id or public.es_admin());
drop policy if exists mensajes_insert_cliente on public.mensajes;
create policy mensajes_insert_cliente on public.mensajes
  for insert with check (
    (auth.uid() = user_id and autor = 'cliente')
    or (public.es_admin() and autor = 'admin')
  );

-- Reseñas: todos leen las visibles; cada quien escribe/edita la suya;
-- administradores pueden ocultar o borrar.
drop policy if exists resenas_lectura on public.resenas;
create policy resenas_lectura on public.resenas
  for select using (visible or auth.uid() = user_id or public.es_admin());
drop policy if exists resenas_insert on public.resenas;
create policy resenas_insert on public.resenas
  for insert with check (auth.uid() = user_id);
drop policy if exists resenas_update on public.resenas;
create policy resenas_update on public.resenas
  for update using (auth.uid() = user_id or public.es_admin());
drop policy if exists resenas_delete on public.resenas;
create policy resenas_delete on public.resenas
  for delete using (auth.uid() = user_id or public.es_admin());

-- Chat en vivo (solo se agrega si no estaba)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes'
  ) then
    alter publication supabase_realtime add table public.mensajes;
  end if;
end $$;

-- ------------------------------------------------------------
-- 8. FOTOS Y VIDEOS
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists archivos_lectura on storage.objects;
create policy archivos_lectura on storage.objects
  for select using (bucket_id in ('productos','media'));
drop policy if exists archivos_admin_insert on storage.objects;
create policy archivos_admin_insert on storage.objects
  for insert with check (bucket_id in ('productos','media') and public.es_admin());
drop policy if exists archivos_admin_update on storage.objects;
create policy archivos_admin_update on storage.objects
  for update using (bucket_id in ('productos','media') and public.es_admin());
drop policy if exists archivos_admin_delete on storage.objects;
create policy archivos_admin_delete on storage.objects
  for delete using (bucket_id in ('productos','media') and public.es_admin());

-- ------------------------------------------------------------
-- 9. Las funciones de trigger no se llaman desde afuera
-- ------------------------------------------------------------
revoke execute on function public.crear_perfil()     from public, anon, authenticated;
revoke execute on function public.proteger_rol()     from public, anon, authenticated;
revoke execute on function public.sanear_orden()     from public, anon, authenticated;
revoke execute on function public.sanear_oferta()    from public, anon, authenticated;
revoke execute on function public.sanear_resena()    from public, anon, authenticated;
revoke execute on function public.verificar_resena() from public, anon, authenticated;
-- es_admin() sí queda ejecutable: las reglas de seguridad la usan en cada
-- consulta y solo responde si quien pregunta es administrador.

-- ============================================================
-- ÚLTIMO PASO — HACERSE ADMINISTRADORES (los dos)
-- Cada uno se registra primero en el sitio con su correo.
-- Después corran esto cambiando los correos por los suyos:
--
--   update public.perfiles set rol = 'admin'
--   where correo in ('correo-uno@ejemplo.com', 'correo-dos@ejemplo.com');
--
-- Verificar con:  select nombre, correo, rol from public.perfiles;
-- ============================================================
