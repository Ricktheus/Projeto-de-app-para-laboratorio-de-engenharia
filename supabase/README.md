# Supabase — Fundação (Sprint S001)

Backend do **MVP Laboratório de Controle Tecnológico de Concreto**: schema,
enums, relacionamentos, RLS (Matriz RBAC), auditoria automática e
provisionamento de papéis (Auth). Escopo **exclusivo da Sprint S001** — o
núcleo de domínio (`packages/shared`), as RPCs de máquina de estado e os apps
chegam nas sprints seguintes.

## Estrutura

```
supabase/
├─ config.toml
├─ migrations/
│  ├─ 0001_enums.sql                 # F-S001-1: enums de domínio
│  ├─ 0002_tables.sql                # F-S001-1: tabelas, FKs, índices, updated_at
│  ├─ 0003_functions_and_triggers.sql# helpers RBAC, updated_at, no-hard-delete, auth trigger
│  ├─ 0004_audit.sql                 # F-S001-3: trigger de auditoria genérico
│  ├─ 0005_rls.sql                   # F-S001-2: RLS traduzindo a Matriz RBAC (§4.5)
│  └─ 0006_seed.sql                  # app_settings (fatores de projeção, limiares)
└─ tests/
   ├─ 01_audit_test.sql              # pgTAP: auditoria (old/new/user/motivo)
   ├─ 02_rls_test.sql                # pgTAP: RLS por papel (permitido + negado por tabela)
   └─ 03_auth_profile_test.sql       # pgTAP: 1:1 auth.users↔usuarios, cascade, check
```

## Como rodar (Supabase CLI + Docker)

```bash
supabase db reset                 # aplica todas as migrations de forma limpa e idempotente
supabase gen types typescript --local > packages/supabase/src/database.types.ts
supabase test db                  # roda a suíte pgTAP (supabase/tests/*.sql)
```

## Verificação sem Docker (Postgres local + pgTAP)

Quando o Docker/Supabase CLI não estão disponíveis, as mesmas migrations e
testes rodam contra um Postgres local emulando o ambiente Supabase (schema
`auth`, `auth.uid()`, papéis `anon`/`authenticated`/`service_role`). Aplicar
as migrations duas vezes comprova a idempotência; `pg_prove` roda a suíte
pgTAP. Resultado atual: **33/33 testes verdes**.

## Decisões de projeto (premissas documentadas)

1. **`audit_trigger` robusto (correção da §4.4).** O trecho ilustrativo da SPEC
   referenciava `new.motivo_descarte`/`new.motivo_expurgo`/`new.id`
   diretamente — o que só compila em tabelas que têm essas colunas e quebra em
   `DELETE` (onde `NEW` é nulo). A implementação deriva tudo dos snapshots
   `to_jsonb(old/new)`, então o **mesmo** trigger serve todas as tabelas
   críticas e todas as operações, preservando a intenção (grava
   `old_value/new_value/user_id/action/motivo`).

2. **Sem `DELETE` físico + cascade do Auth.** Retenção vitalícia é garantida por
   (a) RLS negando `DELETE` por padrão e (b) um trigger `prevent_physical_delete`
   em `clientes, obras, concretagens, corpos_prova, rupturas, laudos`.
   `usuarios` é **intencionalmente excluído** desse bloqueio para que
   `auth.users ON DELETE CASCADE` (F-S001-4) continue removendo o perfil; a
   inativação de usuário usa `ativo=false`.

3. **Provisionamento por metadata.** `handle_new_user` (trigger
   `on_auth_user_created`) cria o perfil 1:1 com `role` default `cliente`,
   lendo opcionalmente `role`/`is_admin`/`cliente_id` de `raw_user_meta_data`.
   Isso permite ao admin provisionar papéis internos e os 2 sócios engenheiros
   (`is_admin=true`) no convite, sem hardcode de e-mails.

4. **`SECURITY DEFINER` com `search_path` fixo** nos helpers de RBAC/auditoria
   (boa prática de segurança omitida na SPEC).

5. **Página pública / infra tables.** `ocr_attempts`, `email_events` e
   `app_settings` têm RLS habilitado **sem** policy permissiva (acesso só via
   `service_role` nas Edge Functions). A validação pública de laudo (US19) é
   uma Edge Function com `service_role` — fora do escopo S001.
