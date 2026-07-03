-- =====================================================================
-- Migration 0002 — Tables & relationships (F-S001-1)
-- =====================================================================
-- Lifetime traceability: critical tables use soft-delete (`ativo`) and
-- versioning instead of physical deletes (enforced in 0003/0005).
-- `updated_at` on `concretagens` and `laudos` supports optimistic locking.
--
-- NOTE: tables are declared in FK-dependency order (parents before
-- children) because a single migration executes top-to-bottom. The DDL in
-- SPEC §4.2 lists `usuarios` first for readability, but `usuarios.cliente_id`
-- references `clientes`, so `clientes` must exist first.
--
-- Idempotent: `create table if not exists`.
-- =====================================================================

-- ---------- clientes ----------
create table if not exists clientes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  cnpj         varchar(18) unique,                        -- formatted 00.000.000/0000-00
  email        text,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- usuarios (1:1 with auth.users) ----------
create table if not exists usuarios (
  id           uuid primary key references auth.users(id) on delete cascade,
  nome         text not null,
  email        text not null unique,
  role         user_role not null default 'cliente',
  is_admin     boolean not null default false,            -- true for the 2 engineer partners
  cliente_id   uuid references clientes(id),              -- only when role = 'cliente'
  ativo        boolean not null default true,             -- soft-disable
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- cliente_id may only be set for client users (F-S001-4 edge case)
  constraint chk_usuarios_cliente_id check (cliente_id is null or role = 'cliente')
);

-- ---------- obras ----------
create table if not exists obras (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes(id),
  nome          text not null,
  sigla         text not null,
  endereco      text,
  contato       text,
  gps_latitude  numeric(10,7),
  gps_longitude numeric(10,7),
  criado_por    uuid not null references usuarios(id),
  ativo         boolean not null default true,            -- soft-delete (lifetime retention)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint uq_obra_sigla_por_cliente unique (cliente_id, sigla)
);

-- ---------- concretagens ----------
create table if not exists concretagens (
  id                  uuid primary key default gen_random_uuid(),
  obra_id             uuid not null references obras(id),
  data_concretagem    date not null,
  nf_numero           text not null,
  nf_foto_url         text,
  fck_projeto         numeric(5,2) not null,              -- MPa, captured from NF (NOT calculated)
  volume_m3           numeric(6,2) not null,
  concreteira         text,
  -- Slump stored in MM (convert cm->mm on entry)
  slump_projeto       numeric(5,1),
  slump_tolerancia    numeric(5,1),
  slump_medido        numeric(5,1),
  -- Mould / basis for the MPa calculation
  diametro_nominal_mm numeric(5,1) not null default 100,  -- 100 (100x200) | 150 (150x300)
  altura_nominal_mm   numeric(5,1) not null default 200,
  -- Optional report / numbering fields
  quadra              text,
  lote                text,
  traco               text,
  placa_caminhao      text,
  lacre_caminhao      text,
  aditivo             text,
  cadastrado_por      uuid not null references usuarios(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now() -- optimistic locking
);

-- ---------- corpos_prova ----------
create table if not exists corpos_prova (
  id                     uuid primary key default gen_random_uuid(),
  concretagem_id         uuid not null references concretagens(id),
  codigo_rastreio        text not null unique,            -- QR Code
  data_moldagem          date not null,
  idade_alvo_dias        int not null,                    -- free: 3|7|14|28|63|91...
  data_ruptura_planejada date not null,
  status                 cp_status not null default 'moldado',
  mandatorio_28d         boolean not null default false,  -- 2 CPs of greatest age
  coleta_atrasada        boolean not null default false,  -- derived: collected > 24h
  motivo_descarte        text,                            -- required on discard/purge
  coletado_por           uuid references usuarios(id),
  coletado_em            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------- rupturas (1:1 with corpos_prova) ----------
create table if not exists rupturas (
  id                  uuid primary key default gen_random_uuid(),
  corpo_prova_id      uuid not null unique references corpos_prova(id),
  data_ruptura_real   date not null default current_date,
  peso_g              numeric(7,1),
  diametro_mm         numeric(5,1),                       -- measured (traceability)
  altura_mm           numeric(5,1),                       -- measured (traceability)
  diametro_nominal_mm numeric(5,1) not null,              -- basis for calculation
  fator_correcao_hd   numeric(4,2) not null default 1.00, -- future capping/retifica
  carga_ruptura_kgf   numeric(9,0) not null,              -- integer KGF
  mpa_calculado       numeric(6,2) not null,              -- 2 decimals
  tipo_fratura        tipo_fratura not null,
  motivo_expurgo      text,
  executado_por       uuid not null references usuarios(id),
  created_at          timestamptz not null default now()
);

-- ---------- evidencia_fotos (internal; never on the client report) ----------
create table if not exists evidencia_fotos (
  id           uuid primary key default gen_random_uuid(),
  ruptura_id   uuid not null references rupturas(id),
  tipo         text not null check (tipo in ('antes', 'depois')),
  storage_path text not null,                             -- private 'evidencias' bucket
  created_at   timestamptz not null default now()
);

-- ---------- laudos ----------
create table if not exists laudos (
  id                        uuid primary key default gen_random_uuid(),
  cliente_id                uuid not null references clientes(id),
  obra_id                   uuid not null references obras(id),
  tipo_laudo                laudo_tipo not null,
  numero                    text not null,                -- e.g. N°003AGEHAB / CT001-T2-CP1
  versao                    int not null default 1,
  substitui_laudo_id        uuid references laudos(id),
  codigo_verificacao        text not null unique,         -- anti-fraud hash (public QR)
  status                    laudo_status not null default 'rascunho',
  data_emissao              date,
  pdf_original_url          text,
  pdf_assinado_url          text,                         -- required for 'assinado'
  assinatura_rt_url         text,                         -- RT (required to publish)
  assinatura_elaborador_url text,                         -- 2nd signature (optional)
  criado_por                uuid not null references usuarios(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now() -- optimistic locking
);

-- ---------- laudo_concretagens (1 report per NF, or grouped NFs of same obra) ----------
create table if not exists laudo_concretagens (
  laudo_id       uuid not null references laudos(id),
  concretagem_id uuid not null references concretagens(id),
  primary key (laudo_id, concretagem_id)
);

-- ---------- audit_log ----------
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references usuarios(id),
  action     audit_action not null,
  table_name text not null,
  record_id  uuid not null,
  old_value  jsonb,
  new_value  jsonb,
  motivo     text,
  created_at timestamptz not null default now()
);

-- ---------- ocr_attempts (OCR rate limit: max 3 per concretagem/draft) ----------
create table if not exists ocr_attempts (
  id              uuid primary key default gen_random_uuid(),
  concretagem_ref text not null,                          -- concretagem id OR draft key
  user_id         uuid not null references usuarios(id),
  success         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------- email_events (retry log, US24-CA5) ----------
create table if not exists email_events (
  id           uuid primary key default gen_random_uuid(),
  evento       text not null,                             -- laudo_assinado | pronto_assinatura | ...
  destinatario text not null,
  payload      jsonb,
  status       text not null default 'pendente',          -- pendente | enviado | falhou
  tentativas   int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- app_settings (projection factors, thresholds) ----------
create table if not exists app_settings (
  key        text primary key,                            -- 'projection_factor_7d', 'ocr_confidence_min'...
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Foreign-key indexes (Postgres does not create these automatically) ----------
create index if not exists idx_usuarios_cliente_id       on usuarios (cliente_id);
create index if not exists idx_obras_cliente_id          on obras (cliente_id);
create index if not exists idx_obras_criado_por          on obras (criado_por);
create index if not exists idx_concretagens_obra_id      on concretagens (obra_id);
create index if not exists idx_concretagens_cadastrado_por on concretagens (cadastrado_por);
create index if not exists idx_corpos_prova_concretagem  on corpos_prova (concretagem_id);
create index if not exists idx_rupturas_executado_por    on rupturas (executado_por);
create index if not exists idx_evidencia_fotos_ruptura   on evidencia_fotos (ruptura_id);
create index if not exists idx_laudos_cliente_id         on laudos (cliente_id);
create index if not exists idx_laudos_obra_id            on laudos (obra_id);
create index if not exists idx_laudos_substitui          on laudos (substitui_laudo_id);
create index if not exists idx_laudo_concretagens_conc   on laudo_concretagens (concretagem_id);
create index if not exists idx_audit_log_record          on audit_log (table_name, record_id);
create index if not exists idx_audit_log_user            on audit_log (user_id);
