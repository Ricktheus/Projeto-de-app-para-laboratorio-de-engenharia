# Edge Functions (Supabase / Deno)

Custom endpoints for the concrete-lab MVP (SPEC §5). Domain rules are imported
from `packages/shared` via the import map in `_shared/deno.json` — the fórmulas
and validators are never reimplemented here (DRY / SPEC §6.2).

## Functions (Sprint S004)

| Function | Método | Auth | Descrição |
|---|---|---|---|
| `ocr-nota-fiscal` | POST | JWT | Lê a foto da NF com GPT-4o-mini Vision e devolve os campos extraídos com confiança (SPEC §5.1). Rate limit de 3 tentativas por concretagem (`ocr_attempts`) e timeout de 10s. |
| `admin-provisionar-usuario` | POST | JWT (admin) | Cadastra clientes e usuários internos via `inviteUserByEmail` (F-S004-1). |

## Variáveis de ambiente (segredos — só no ambiente da função)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — injetadas pelo runtime do Supabase.
- `OPENAI_API_KEY` — chave da OpenAI (somente `ocr-nota-fiscal`). Defina com:
  `supabase secrets set OPENAI_API_KEY=sk-...`

Nenhum segredo vai para o cliente (SPEC §7.1).

## Rodar localmente

```bash
supabase functions serve ocr-nota-fiscal --env-file supabase/functions/.env.local
supabase functions serve admin-provisionar-usuario --env-file supabase/functions/.env.local
```

## Testes (Deno)

```bash
deno test supabase/functions/ocr-nota-fiscal/logic.test.ts
```

Cobre o rate limit de OCR (3 OK, 4ª ⇒ 429) e a montagem de `lowConfidenceFields`
(SPEC §7.2).
