# Prompt de Desenvolvimento de Sprint (comando `/go`)

> **Como usar:** este é o prompt para instruir o agente desenvolvedor a construir **uma** sprint por vez, a partir de `SPEC_TECNICA.md` e `sprints.json`.
> Para rodar outra sprint, troque apenas o **Sprint alvo** no bloco abaixo (ex.: `S002`, `S003`…). O restante do prompt permanece igual.
> **Sprint alvo desta execução:** `S001` — Fundação Supabase, RBAC e Auditoria.

---

## PROMPT (copie a partir daqui)

Você atuará como **Agente Desenvolvedor Sênior** responsável por entregar **exatamente uma sprint** do projeto "MVP Laboratório de Controle Tecnológico de Concreto". Sua entrega é **incremental e cirúrgica**: implemente apenas o escopo da sprint alvo, sem adiantar features de sprints futuras.

### 0. Sprint alvo

* **Construa EXATAMENTE a Sprint `S00`** ("Sprint 00") como definida em `sprints.json` (campo `id: "S00"`) e na seção correspondente de `SPEC_TECNICA.md` (§2, §3 e §4).
* Entregue **todas** as features desta sprint e **nada além delas**. 
* Se identificar que uma feature depende de algo fora do escopo desta sprint, **pare e reporte** — não invente a dependência nem antecipe outra sprint.

### 1. Fontes de verdade (leia antes de codar; em caso de conflito, esta é a ordem de prioridade)

1. **`SPEC_TECNICA.md`** — arquitetura, modelos de dados (DDL, enums, RLS, triggers, RPCs), contratos de API, árvore de diretórios, mensagens de erro exatas e critérios de aceite. **Fonte primária de implementação.**
2. **`sprints.json`** — escopo, features, `criterios_aceite` e `edge_cases` da sprint alvo (formato legível por máquina; deve bater com a SPEC).
3. **`PRD_MVP.md`** — contexto de negócio, regras, RBAC, máquinas de estado e fórmulas. Use para entender o "porquê".
4. **`MEMORIA_PROJETO.md`** — **diretrizes de código obrigatórias** (resumidas na §2 abaixo). Se existir `CLAUDE.md` na raiz, ele tem precedência sobre as diretrizes gerais.
5. **`revisao_critica_prd.md`** — origem dos edge cases; consulte para enriquecer o tratamento de erros.

> Não presuma nada. Se a SPEC for omissa em um detalhe técnico, adote o padrão de mercado mais seguro e escalável e **documente a premissa** no PR/relatório final (não invente silenciosamente).

### 2. Diretrizes de código obrigatórias (não negociáveis)

* **Idioma:** código, nomes de variáveis/funções/tipos e comentários em **inglês**; toda UI e mensagens ao usuário (incl. respostas da IA) em **português**.
* **Nomenclatura:** `snake_case` no banco (tabelas/colunas/enums/funções); `camelCase`/`PascalCase` no TypeScript. TypeScript em modo **strict**; proibido `any` implícito.
* **Qualidade:** código limpo, modular, DRY e SOLID. Regras de domínio (cálculos, guardas de estado) ficam em `packages/shared` e **nunca** são reimplementadas nos apps.
* **Ergonomia mobile:** telas de campo/prensa com botões grandes (≥56dp) e alto contraste (uso com luvas/mãos sujas).
* **Sem modo offline:** o app exige internet.
* **Segurança por padrão:** RLS habilitado em todas as tabelas com **negação por padrão**; segredos apenas em variáveis de ambiente das Edge Functions, nunca no cliente.
* **Lint/format:** o código deve passar em ESLint + Prettier conforme configurado no repositório.

### 3. Implementação e verificação de cada feature

Para **cada** feature da sprint alvo:

1. Implemente o **caminho feliz** de todos os `criterios_aceite`.
2. Implemente **todos** os `edge_cases` (caminho triste), incluindo os códigos e **mensagens de erro exatas** definidos na SPEC (ex.: 401/403/404/409/429/500, validação de campos, RLS negando acesso).
3. Garanta os **estados de UI** quando houver interface: `Loading` (botão `disabled` + spinner, sem dupla submissão), `Success`, `Error` (sem perder o input do usuário) e `Empty` (com CTA).
4. Escreva os **testes mínimos** exigidos pela SPEC §7.2 aplicáveis a esta sprint (para `S001`: testes **pgTAP** de RLS por papel — ao menos 1 caso permitido e 1 negado por tabela crítica; e verificação de que o trigger de auditoria grava `old_value`/`new_value`).

### 4. Ciclo de execução autônoma (executor → revisor)

Trabalhe em ciclo fechado de auto-avaliação:

* **Executor:** implementa a feature.
* **Revisor/gerente:** valida contra os `criterios_aceite` e `edge_cases`, roda os comandos de verificação (§5) e confere que as mensagens de erro e estados de UI aparecem exatamente como especificado.
* Se qualquer critério falhar, **corrija e revalide** antes de prosseguir. Só avance para a próxima feature quando a atual estiver 100% verde. **Não** devolva a sprint com critérios pendentes.

### 5. Comandos de verificação (adapte ao que a sprint entrega)

Rode o **melhor conjunto de validação disponível** e cole a saída no relatório. Para a Sprint `S001` (banco/infra, sem UI ainda):

* `supabase db reset` — todas as migrations aplicam de forma limpa e idempotente.
* `supabase gen types typescript` — gera os tipos consumidos por `packages/supabase` sem erro.
* Testes **pgTAP** de RLS/auditoria passam.
* `pnpm -w typecheck` / `pnpm -w lint` passam (nas partes já existentes do monorepo).

> Para sprints com aplicativo executável (S003+), a condição inclui: **app rodando localmente sem erros** e `build`/`typecheck` verdes.

### 6. Definition of Done (checklist de encerramento)

A sprint só está concluída quando **todos** os itens abaixo forem verdadeiros:

* [ ] Todas as features da sprint alvo implementadas — e **nenhuma** feature fora do escopo.
* [ ] Todos os `criterios_aceite` e `edge_cases` de cada feature implementados e verificados.
* [ ] Mensagens de erro e estados de UI exatamente como na SPEC (quando houver interface).
* [ ] Testes mínimos da SPEC §7.2 aplicáveis à sprint escritos e **passando**.
* [ ] Comandos de verificação da §5 executados com sucesso (saída anexada).
* [ ] Lint e typecheck verdes; sem `any` implícito.
* [ ] Nenhuma regra de domínio duplicada (respeito a DRY/SOLID).
* [ ] Premissas assumidas documentadas.

### 7. Git e entrega

* Desenvolva na branch **`claude/vibrant-clarke-ng4aq0`** (crie localmente a partir da base se necessário). **Não** faça push para outra branch sem permissão explícita.
* Commits pequenos e descritivos, um por feature ou por unidade lógica coerente.
* Faça push da branch designada ao final. **Não** abra Pull Request a menos que seja explicitamente solicitado.

### 8. Formato do relatório final (o que me devolver)

1. **Resumo da sprint** entregue (1–2 frases).
2. **Tabela feature × status** (`F-S001-1` … `F-S001-4`), marcando cada `criterio_aceite`/`edge_case` como ✅ implementado/verificado.
3. **Saída dos comandos de verificação** (§5).
4. **Arquivos criados/alterados** (lista).
5. **Premissas assumidas** (se houver).
6. **Pendências/bloqueios** conhecidos (se houver) — nunca silenciosos.

## PROMPT (fim)
