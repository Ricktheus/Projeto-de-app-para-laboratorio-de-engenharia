# Edge Functions (Supabase / Deno)

Custom endpoints for the concrete-lab MVP (SPEC §5). Domain rules are imported
from `packages/shared` via the import map in `_shared/deno.json` — the fórmulas
and validators are never reimplemented here (DRY / SPEC §6.2).

## Functions (Sprint S004)

| Function | Método | Auth | Descrição |
|---|---|---|---|
| `ocr-nota-fiscal` | POST | JWT | Lê a foto da NF com GPT-4o-mini Vision e devolve os campos extraídos com confiança (SPEC §5.1). Rate limit de 3 tentativas por concretagem (`ocr_attempts`) e timeout de 10s. |
| `admin-provisionar-usuario` | POST | JWT (admin) | Cadastra clientes e usuários internos via `inviteUserByEmail` (F-S004-1). |

## Functions (Sprint S008)

| Function | Método | Auth | Descrição |
|---|---|---|---|
| `gerar-laudo-pdf` | POST | JWT (engenheiro) | Compõe o PDF travado do laudo `pronto_assinatura` (layout PRD §11: cabeçalho, dados cliente/obra, tabela `DATA\|QUADRA\|LOTE\|NF\|LACRE\|CP\|KGF\|MPa\|FCM` por idade, gráfico de resistência com linha do fck, considerações + ressalvas automáticas, assinaturas, QR). Aplica `ReadOnly=true, AllowPrinting=true, AllowCopy=false`, salva em `laudos/<id>/original.pdf` e preenche `pdf_original_url` + `codigo_verificacao` (SPEC §5.3). Gráfico: SVG (`packages/shared`) → `@resvg/resvg-wasm` → PNG → `@cantoo/pdf-lib`. |
| `upload-laudo-assinado` | POST (multipart) | JWT (engenheiro) | Recebe o PDF assinado (gov.br), salva em `laudos/<id>/assinado.pdf`, preenche `pdf_assinado_url`/`assinatura_rt_url` e publica `pronto_assinatura → assinado` **só se** o PDF for válido. 2ª assinatura (`pdf_elaborador`) opcional. Enfileira o e-mail `laudo_assinado` ao cliente (US24-CA1; envio é S009). Erros: 415 `ARQUIVO_INVALIDO`, 409 `SEM_PDF_ASSINADO` (SPEC §5.4). |

## Variáveis de ambiente (segredos — só no ambiente da função)

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — injetadas pelo runtime do Supabase.
- `OPENAI_API_KEY` — chave da OpenAI (somente `ocr-nota-fiscal`). Defina com:
  `supabase secrets set OPENAI_API_KEY=sk-...`
- `LAUDO_VERIFICATION_SECRET` — segredo do hash anti-fraude `codigo_verificacao = sha256(laudo_id + secret)` (somente `gerar-laudo-pdf`, SPEC §7.1).
- `PUBLIC_SITE_URL` — URL base pública para o QR de validação (`<site>/validar/<codigo>`); default `https://laboratorio.example.com`.

Nenhum segredo vai para o cliente (SPEC §7.1).

## Rodar localmente

```bash
supabase functions serve ocr-nota-fiscal --env-file supabase/functions/.env.local
supabase functions serve admin-provisionar-usuario --env-file supabase/functions/.env.local
supabase functions serve gerar-laudo-pdf --env-file supabase/functions/.env.local
supabase functions serve upload-laudo-assinado --env-file supabase/functions/.env.local
```

## Testes (Deno)

```bash
deno test supabase/functions/ocr-nota-fiscal/logic.test.ts
```

Cobre o rate limit de OCR (3 OK, 4ª ⇒ 429) e a montagem de `lowConfidenceFields`
(SPEC §7.2).
