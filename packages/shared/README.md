# @concreto/shared — Núcleo de Domínio

Domínio puro, **agnóstico de framework** (sem UI, sem rede). É a casa única e
testada das regras de engenharia e de negócio do laboratório, consumida de forma
idêntica pelo app mobile, pelo app web e pelas Edge Functions. **As regras de
domínio nunca são reimplementadas fora deste pacote** (DRY / SOLID).

## Conteúdo (Sprint S002)

| Módulo | Exporta |
|---|---|
| `engineering/mpa.ts` | `calcMpa`, `nominalAreaMm2` — conversão carga (kgf) → resistência (MPa) pelo **diâmetro nominal**. |
| `engineering/projection.ts` | `estimateF28`, `estimateF28Range` — projeção 7/14 → 28 dias (`f28 = fIdade / fator`). |
| `engineering/ranges.ts` | `ENGINEERING_RANGES`, `checkRange`, `checkSlumpTolerance` — faixas de sanidade (PRD §7.4, avisos **não bloqueantes**). |
| `engineering/rounding.ts` | `roundMpa` (2 casas), `roundKgf` (inteiro) — arredondamento único (PRD §7.3). |
| `state-machines/cp.ts` | Máquina de estados do corpo de prova (PRD §5.1) + `canRomper`. |
| `state-machines/laudo.ts` | Máquina de estados do laudo (PRD §5.2) + `canMarcarProntoAssinatura`, `canMarcarAssinado`. |
| `state-machines/transition.ts` | `canTransition(entity, from, to, context)` — entrada unificada. |
| `schemas/` | Schemas Zod de `Concretagem`, `Obra`, `Cliente`, `Ruptura`, `Laudo` e payloads das Edge Functions/RPCs (§5). |
| `constants/` | `FRATURA_TIPOS` (6 rótulos), `DEFAULT_PROJECTION_FACTORS`, `MOLDE_PRESETS`. |
| `messages/` | `MESSAGES` — catálogo PT (SPEC §3.0 + §5) + `messageForHttpStatus`/`messageForDomainCode`. |
| `errors.ts` | `DomainError` (carrega apenas o **código**; a mensagem PT vem do catálogo). |
| `enums.ts` | Espelho TS dos enums Postgres (`cp_status`, `laudo_status`, `tipo_fratura`, …). |

## Premissas assumidas

- **Fatores de projeção configuráveis:** `estimateF28` recebe os fatores por
  parâmetro (`fatores`), injetados pela camada de infra que lê `app_settings`
  (chaves `projection_factor_7d`/`_14d`). Os defaults
  (`DEFAULT_PROJECTION_FACTORS` = 7d 0.70 / 14d 0.90) são idênticos aos _seeds_
  de `supabase/migrations/0006_seed.sql`. Assim o domínio permanece puro
  (Inversão de Dependência) sem acoplar-se ao banco.
- **Guardas retornam código, não texto:** `GuardResult.reason` e
  `DomainError.code` são códigos estáveis (ex.: `CP_MANDATORIO_28D`); a UI
  resolve o texto PT via `MESSAGES` — fonte única da cópia.

## Scripts

```bash
pnpm --filter @concreto/shared typecheck   # tsc --noEmit (strict)
pnpm --filter @concreto/shared lint        # eslint
pnpm --filter @concreto/shared test        # vitest run
```
