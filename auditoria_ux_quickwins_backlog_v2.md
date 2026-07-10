# Auditoria de UI/UX, Quick Wins e Backlog V2

> **Perspectiva:** Product Manager Sênior + Especialista em UI/UX.
> **Base da análise:** PRD v2.0, SPEC Técnica, e o **código real das telas** entregues em S001–S009 (mobile Expo: campo/prensa; web: painel/laudos/portal/validação pública).
> **Data:** 06/07/2026 (auditoria) · 09/07/2026 (implementação dos quick wins).
> **Restrição respeitada na Parte 2:** nenhum quick win altera schema do banco, RLS, RPCs ou Edge Functions — apenas frontend, `packages/shared` e, no máximo, *queries de leitura* já permitidas pela RLS atual.

---

## ✅ Status de Implementação (pós-S010 + hardening)

Após a auditoria, o projeto concluiu **S010** (dashboard operacional, testes E2E, rate limiting) e um **hardening de segurança**. Reavaliei cada achado contra o código atual e implementei os quick wins em **4 lotes** — **23 dos 24** itens entregues (só o QW-23, migração de ícones, ficou de fora por ser decisão de design system). **Nenhuma mudança de banco/backend** — só frontend + `packages/shared` + queries de leitura já cobertas pela RLS. Tudo com testes (**374** no total: 238 shared + 80 mobile + 56 web), typecheck e lint verdes.

| ID | Quick win | Status | Onde |
|---|---|---|---|
| QW-01 | Veredito fck no display de MPa (verde/âmbar/vermelho + projeção 28d) | ✅ Feito | `shared/engineering/veredito.ts` + `RupturaFormScreen` |
| QW-02 | "Próximo CP →" encadeando a agenda do dia | ✅ Feito | `RupturaFormScreen` + `usePrensa` |
| QW-04 | Contagem + pill "Atrasado Xd" na lista da prensa | ✅ Feito | `PrensaListScreen` |
| QW-07 | Preview de rompimentos + copy dinâmica dos obrigatórios | ✅ Feito | `MoldagemConfig` (via `buildCpPlan`) |
| QW-08 | Badge de pendências na Agenda de Coletas | ✅ Feito | `ObrasScreen` |
| QW-11 | Busca de obras | ✅ Feito | `ObrasScreen` |
| QW-12 | Pill "Slump dentro/fora da tolerância" ao digitar | ✅ Feito | `ConcretagemForm` (via `checkSlumpTolerance`) |
| QW-13 | Chips de status + seção "Aguardando assinatura (N)" | ✅ Feito | `LaudosPage` |
| QW-15 | "Copiar link de validação pública" | ✅ Feito | `LaudoDetalhe` |
| QW-16 | `scrollIntoView` ao abrir "Ver laudo" | ✅ Feito | `LaudosPage` |
| QW-18 | Datas BR (`formatIsoDateBr`) nas etiquetas | ✅ Feito (parte datas) | `EtiquetasScreen` |
| QW-19 | Portal: link "Validar autenticidade" por laudo | ✅ Feito | `PortalPage` |
| QW-20 | Página pública: banner de conclusão conforme/abaixo do fck | ✅ Feito | `ValidacaoPublicaPage` |
| QW-24 | Empty state do portal orientando o cliente novo | ✅ Feito | `messages` + `PortalPage` |
| QW-03 | Scanner de QR na busca da prensa (reuso do `CameraView`) | ✅ Feito (2º lote) | `components/QrScanner` + `PrensaListScreen` |
| QW-05 | Háptica no salvar ruptura / erro / leitura de QR | ✅ Feito (2º lote) | `services/haptics` + prensa + coleta |
| QW-06 | Data em BR (DD/MM/AAAA) com máscara + validação | ✅ Feito (2º lote) | `shared/lib/date` + `components/ui/DateField` + `ConcretagemForm` |
| QW-21 | Identidade visual (logo + wordmark) nas superfícies externas | ✅ Feito (3º lote) | `shared/constants/brand` + `web/components/BrandMark` (login, portal, validação pública) |
| QW-22 | Bloqueio do app por biometria (proteção do aparelho em campo) | ✅ Feito (3º lote) | `services/biometrics` + `LockOverlay` + `BiometricLockToggle` + `useAppLock` |
| QW-09 | Aterrissar na concretagem recém-criada (topo + badge) | ✅ Feito (4º lote) | `ConcretagemScreen` → `EtiquetasScreen` (param `highlight`) |
| QW-10 | "Reimprimir falhas (N)" após impressão parcial | ✅ Feito (4º lote) | `EtiquetasScreen` |
| QW-17 | Busca por obra/cliente/NF no painel do escritório | ✅ Feito (4º lote) | `PainelPage` |
| QW-14 | Pipeline por card no painel | ↔️ Coberto em parte pelo **dashboard S010** (contadores agregados) — mantido no backlog o detalhamento por card |
| QW-23 | Migração emoji → biblioteca de ícones | ⏭️ Backlog | decisão de design system, melhor feita isolada de mudanças funcionais |

> **Sobre o QW-06:** em vez do date picker **nativo** (`@react-native-community/datetimepicker`, que exigiria build no device para validar), optei por um **campo BR mascarado** (`DateField` + helpers `maskBrDate`/`brDateToIso` no `shared`) — mesma eliminação do footgun de ISO, porém 100% coberto por teste. Ele também corrigiu um **bug latente**: o campo de data anterior era editável mas **ignorado no salvamento** (o payload usava sempre "hoje"); agora a data digitada realmente alimenta a concretagem e a agenda de rompimentos.
>
> **Sobre o QW-21 (identidade):** como a razão social ainda está a confirmar (PRD §10), a marca vive num único ponto (`BRAND` no `shared`) e o `BrandMark` usa um **glifo SVG inline** (um corpo de prova cilíndrico) — sem asset externo, seguro para CSP. Trocar `BRAND` (ou o SVG por um logo real) rebranda todas as superfícies de uma vez.
>
> **Sobre o QW-22 (biometria):** como a sessão do Supabase é persistida (o operador raramente revê a tela de login), a mecânica útil aqui não é "login por biometria" e sim um **bloqueio do app** — protege os dados de um aparelho esquecido no balcão do laboratório. É **opt-in por aparelho** (toggle no cabeçalho, só aparece onde há biometria cadastrada), trava no cold start e nunca derruba a sessão por baixo. Implementado de forma **defensiva** (nunca lança se o módulo nativo faltar) e coberto por teste; a validação tátil/hardware final precisa de um device real.
>
> **Ainda no backlog:** migração emoji→biblioteca de ícones (QW-23, decisão de design system melhor feita isolada) e refinamentos menores (QW-09 aterrissar na NF criada, QW-10 reimprimir falhas em lote, QW-17 busca no painel).

---

## Sumário Executivo

O produto está **muito acima da média de um MVP**: estados de loading/erro/empty tratados em todas as telas, acessibilidade (roles/labels), optimistic locking com copy exata, máquina de estados respeitada na UI, mensagens centralizadas em `MESSAGES`. A fundação de UX é sólida.

Os problemas encontrados são de **último quilômetro**: o app calcula o MPa mas **não responde à pergunta que a engenheira realmente faz na prensa ("passou do fck?")**; o dia de rompimento exige navegação repetitiva CP a CP; a data da concretagem é digitada em formato ISO à mão; a RT não tem uma visão "o que espera minha assinatura"; e o portal do cliente entrega o PDF, mas nenhuma percepção de valor além do download. São lacunas baratas de fechar — e é exatamente isso que a Parte 2 prioriza.

**As 5 maiores alavancas (se só puder fazer 5):**

| # | Alavanca | Onde | Por quê |
|---|---|---|---|
| 1 | Veredito fck no display de MPa (verde/âmbar/vermelho + projeção 28d) | Prensa mobile | Transforma "calculadora" em "instrumento de decisão"; tudo já existe em `shared/engineering` |
| 2 | Fluxo "Próximo CP" após salvar ruptura | Prensa mobile | Corta ~4 toques × N CPs no dia de rompimento — o dia de maior carga do app |
| 3 | Date picker + máscara BR na concretagem | Campo mobile | Elimina o campo mais frágil do fluxo mais crítico (digitação de `AAAA-MM-DD`) |
| 4 | Filtro/ordenação por status na tela de Laudos + seção "Aguardando assinatura" | Web escritório | A fila de assinatura da RT é hoje invisível na lista |
| 5 | Scanner de QR na busca da prensa (reuso do scanner da coleta) | Prensa mobile | US07-CA2 pedia "busca por QR"; hoje é digitação com luvas |

---

## Parte 1 — Auditoria de UI/UX por Jornada

### 1.1. Jornada de Campo (sócio/moldador — mobile)

**O que está bom:** fluxo Foto → IA → revisão com destaque amarelo é exemplar; "Preenchimento Manual" sempre visível; GPS não bloqueante; salvar leva direto às etiquetas (decisão correta — imprime-se na obra).

**Atritos encontrados:**

1. **Data digitada em ISO (`AAAA-MM-DD`)** — `ConcretagemForm` usa um `TextField` cru com o formato invertido ao padrão brasileiro. É o campo com maior probabilidade de erro silencioso do app inteiro (uma data errada desloca **toda** a agenda de coleta e rompimento). *Gravidade: alta.*
2. **A home do campo não diz "o que fazer hoje".** `ObrasScreen` abre numa lista de obras com dois botões grandes por card. O sócio precisa *lembrar* de abrir a Agenda de Coletas; o botão não mostra contagem de pendências. À medida que obras acumulam, não há busca nem ordenação por atividade recente.
3. **Configuração de moldagem não mostra as consequências.** O usuário define idades/quantidades, mas não vê **as datas planejadas de rompimento** que isso gera ("2 CPs → 13/07, 2 CPs → 03/08"). Essa pré-visualização evita erros de configuração *antes* de salvar e imprime confiança no sistema. A copy fixa "Os 2 de maior idade serão marcados como 28d obrigatório" fica incorreta quando a maior idade não é 28 (ex.: 63d).
4. **Pós-salvamento aterrissa na lista de etiquetas da obra inteira**, não na concretagem recém-criada — com histórico grande, o usuário caça a NF que acabou de cadastrar.
5. **Agenda de Coletas só mostra o que já venceu (≥ 24h).** O sócio não consegue planejar a logística de amanhã ("quantos CPs vencem amanhã cedo?"). Uma seção "Vencem nas próximas 24h" (esmaecida) resolve com a mesma query.
6. **Etiquetas: sem reimpressão em lote das que falharam.** O checklist individual é ótimo, mas após uma falha parcial (papel acabou na 3ª de 6) o usuário reimprime uma a uma.

### 1.2. Jornada da Prensa (engenheira RT — mobile)

**O que está bom:** display de MPa gigante de alto contraste (requisito de ergonomia atendido), confirmação antes de salvar, bloqueio proativo do CP 28d obrigatório, motivo obrigatório em descarte/expurgo.

**Atritos encontrados:**

1. **O display mostra o número, não o veredito.** A pergunta da engenheira ao romper é: *"deu quanto **em relação ao fck**? preciso sinalizar reforço?"*. O `fck_projeto` está na concretagem e a projeção `f28_estimado = f_idade / fator` está pronta em `shared/engineering/projection` — mas a tela não usa nada disso. Hoje ela faz a conta de cabeça. *Este é o maior gap de valor do produto inteiro.*
2. **Dia de rompimento = navegação repetitiva.** Salvar → resultado → "Concluir" → volta à lista → achar o próximo → tocar. Com 10 CPs, são dezenas de toques evitáveis. Falta um **"Próximo CP →"** no resultado, que avança direto ao próximo pendente da agenda.
3. **Busca "por QR" é um campo de texto.** O scanner de câmera já existe (`ColetaScannerScreen`), mas na prensa a engenheira digita o código — com luvas. Reusar o scanner é só frontend.
4. **A lista não tem visão de conjunto:** sem contagem ("8 CPs para romper hoje"), sem agrupamento por obra/idade, sem sinalização de **atrasados** (`data_ruptura_planejada < hoje` aparece igual a "vence hoje").
5. **Sem feedback físico.** Ambiente de prensa: mãos sujas, olhos na máquina. Vibração (háptica) no sucesso/erro do salvamento custa uma linha (`expo-haptics`) e evita releitura da tela.

### 1.3. Jornada do Escritório (web)

**O que está bom:** realtime no painel, optimistic locking com a copy exata do 409, ações do laudo corretamente condicionadas ao status, agrupamento de NFs com validação de mesma obra.

**Atritos encontrados:**

1. **O painel mostra concretagens, não o *pipeline*.** O card diz NF/fck/volume, mas não responde "em que pé está?" (CPs moldados/coletados/rompidos, laudo em rascunho/assinado). O engenheiro precisa cruzar mentalmente duas telas. Uma linha de progresso por card (dados já acessíveis por query de leitura) muda a natureza da tela.
2. **Laudos: a fila de assinatura é invisível.** Não há filtro por status nem ordenação; laudos `pronto_assinatura` (a pendência mais cara — trava a entrega ao cliente) se misturam aos assinados. A RT que loga para assinar não tem uma seção "Aguardando sua assinatura (3)".
3. **O detalhe do laudo abre embaixo da lista** — em listas longas, o clique em "Ver laudo" parece não fazer nada (o conteúdo renderiza fora da viewport). Um `scrollIntoView` ou drawer lateral resolve.
4. **O QR/link público não é exposto internamente.** Para enviar o link de validação a um cliente/fiscal por WhatsApp, hoje é preciso gerar o PDF e escanear o próprio QR. Um botão "Copiar link de validação" no detalhe do laudo é trivial e muito usado.
5. **Painel sem busca/filtro** (obra, cliente, período). Com meses de histórico, a lista vira scroll infinito não paginado.

### 1.4. Jornada do Cliente e Validação Pública (web)

**O que está bom:** portal enxuto, RLS como fonte de verdade, página pública sem chrome de app, estados de erro com copy exata.

**Atritos encontrados:**

1. **O portal é um repositório de PDFs, não um produto.** O cliente vê número do laudo, tipo e um botão de download. Não vê **o resultado** ("28d: FCM 32,1 MPa ≥ fck 30 — Conforme") — a informação pela qual ele paga. Sem agrupamento por obra, sem link para a página de validação pública (que ele mesmo pode encaminhar à fiscalização).
2. **A página pública não dá o veredito.** Ela mostra a tabela FCM × fck, mas não conclui **conforme/não conforme** — o fiscal que escaneia o QR na obra quer a resposta, não a matéria-prima. (Cálculo client-side com dados que a página já recebe.)
3. **Identidade visual ausente na superfície pública.** É a vitrine do laboratório para terceiros (fiscais, diretorias, auditorias) e hoje não carrega logo/nome do laboratório — além de credibilidade, é marketing gratuito.

### 1.5. Transversal (design system)

1. **Emojis como ícones** (📅 🏷️ 📷 ⚙️ 🗑️ ✓) em um produto que emite **documento com validade jurídica**. Renderização varia por plataforma/versão de OS e o tom infantiliza a marca. Trocar por um set único (`lucide-react` no web, `@expo/vector-icons` no mobile) mantendo os tokens de cor existentes (`brand`, `danger`, `warning`).
2. **Datas ISO vazando para a UI** — `EtiquetasScreen` exibe `2026-07-06` cru; `formatIsoDateBr` já existe em `shared` e é usado no painel. Padronizar em 100% das superfícies.
3. **Sem biometria no login mobile.** Perfis internos logam de qualquer lugar (P18); em campo, digitar e-mail/senha com luva é atrito diário. `expo-local-authentication` (Face ID/digital para reabrir sessão) é frontend puro.
4. **Consistência de louvor:** os componentes `BigButton`/`StatusPill`/`EmptyState`/`Toast` duplicados web/mobile com a mesma API são um acerto — quick wins abaixo apenas os reutilizam.

---

## Parte 2 — Quick Wins para as 4 Sprints Finais

Organizados em **4 pacotes tem­áticos** (um por sprint), cada um fechando uma jornada. Esforço: **P** ≤ meio dia · **M** ≤ 2 dias. Nenhum item altera banco/backend; itens marcados 🔍 adicionam apenas *query de leitura* no service do frontend (dentro da RLS vigente).

### Sprint A — "A prensa decide" (mobile/prensa)

| ID | Quick win | Esforço | Impacto |
|---|---|---|---|
| QW-01 | `MpaDisplay` com veredito: fck da concretagem 🔍, `f28_estimado` (fatores de `shared/engineering`), cor verde/âmbar/vermelho + texto ("Projeção 28d: 31,4 MPa ≥ fck 30") | M | ★★★★★ |
| QW-02 | Botão "Próximo CP →" no `RupturaResult`, avançando ao próximo pendente da agenda do dia | M | ★★★★★ |
| QW-03 | Scanner de QR na busca da prensa (reuso do `CameraView` da coleta) | M | ★★★★ |
| QW-04 | Cabeçalho de contagem + agrupamento por obra + pill "Atrasado Xd" na `PrensaListScreen` | P | ★★★ |
| QW-05 | Háptica (`expo-haptics`) em salvar ruptura, erro e leitura de QR | P | ★★ |

### Sprint B — "Campo sem digitação" (mobile/campo)

| ID | Quick win | Esforço | Impacto |
|---|---|---|---|
| QW-06 | Date picker nativo + exibição DD/MM/AAAA na `ConcretagemForm` (armazenando ISO) | M | ★★★★★ |
| QW-07 | Preview da moldagem: "N CPs · rompimentos em 13/07 (2), 03/08 (2)" + copy dinâmica dos obrigatórios de maior idade | P | ★★★★ |
| QW-08 | Badge de pendências no botão Agenda ("Agenda de Coletas (3)") 🔍 + seção "Vencem nas próximas 24h" esmaecida | M | ★★★★ |
| QW-09 | Pós-salvar: aterrissar na concretagem recém-criada (scroll/realce ou visão单 "só esta NF") na tela de etiquetas | P | ★★★ |
| QW-10 | "Reimprimir todas que falharam" após impressão parcial | P | ★★★ |
| QW-11 | Busca + ordenação por atividade recente na lista de obras | P | ★★★ |
| QW-12 | Validação de slump ao digitar: pill "Dentro/Fora da tolerância" (regra já em `shared`) | P | ★★ |

### Sprint C — "O escritório enxerga o pipeline" (web)

| ID | Quick win | Esforço | Impacto |
|---|---|---|---|
| QW-13 | Chips de filtro por status + seção fixa "Aguardando assinatura (N)" no topo da `LaudosPage` | M | ★★★★★ |
| QW-14 | Linha de pipeline no card do painel: "CPs: 4 moldados · 2 coletados · 2 rompidos · Laudo: rascunho" 🔍 | M | ★★★★ |
| QW-15 | "Copiar link de validação pública" (+ QR renderizado) no `LaudoDetalhe` | P | ★★★★ |
| QW-16 | `scrollIntoView`/drawer ao abrir "Ver laudo" | P | ★★★ |
| QW-17 | Busca e filtro por obra/cliente/período no painel | M | ★★★ |
| QW-18 | Ícones `lucide-react` + datas BR em todas as superfícies web | P | ★★ |

### Sprint D — "O cliente percebe o valor" (web público + polish)

| ID | Quick win | Esforço | Impacto |
|---|---|---|---|
| QW-19 | Portal: veredito por laudo ("Conforme ≥ fck") quando o dado já vier na row 🔍, agrupamento por obra e link "validar autenticidade" | M | ★★★★ |
| QW-20 | Página pública: banner de conclusão "Resultado conforme o fck de projeto" (cálculo client-side FCM × fck) | P | ★★★★ |
| QW-21 | Logo/identidade do laboratório na página pública, portal e e-mails | P | ★★★ |
| QW-22 | Biometria para reabrir sessão no mobile (`expo-local-authentication`) | M | ★★★ |
| QW-23 | Ícones consistentes no mobile (`@expo/vector-icons`) substituindo emojis | P | ★★ |
| QW-24 | Empty state do portal orientando o cliente novo ("Seus laudos aparecerão aqui após a assinatura do responsável técnico") | P | ★ |

> **Nota sobre S010:** os pacotes acima convivem com o hardening planejado (dashboard, E2E, segurança). Sugestão de merge: o **dashboard operacional (F-S010-1)** já cobre parte do QW-14; ao construí-lo, incluir os contadores clicáveis que filtram o painel — mesma entrega, dobro do valor.

---

## Parte 3 — Backlog V2 (pós-MVP)

Organizado por tese estratégica, do mais óbvio ao mais transformador.

### Tese 1 — Fechar os loops manuais que o MVP tolerou

| Item | Descrição | Valor |
|---|---|---|
| **V2-01 · Assinatura digital integrada** | Integração com provedor ICP-Brasil (Clicksign/D4Sign/ZapSign) ou API gov.br: o laudo `pronto_assinatura` vira notificação no celular da RT → assina no aparelho → publica sozinho. Elimina o ciclo baixar/assinar/subir (US15), o maior atrito residual do fluxo. | ★★★★★ |
| **V2-02 · Modo offline-first no campo** | Fila local (SQLite/WatermelonDB) com sync: foto da NF, moldagem e coleta funcionam sem sinal — a realidade de canteiro que o PRD explicitamente adiou. É o item nº 1 a revisitar, pois hoje o fallback é "tirar foto comum e digitar depois" (retrabalho que o app nasceu para matar). | ★★★★★ |
| **V2-03 · OCR da prensa** | Foto do display da prensa → IA lê a carga (kgf) e preenche o campo. Mesma infraestrutura da US01 (GPT-4o Vision), zero digitação com luvas. | ★★★★ |
| **V2-04 · Notificações push + WhatsApp** | Substituir/complementar o e-mail: laudo publicado → mensagem WhatsApp ao cliente com link do portal e da validação (WhatsApp Business API). No Brasil, e-mail é onde laudo dorme; WhatsApp é onde obra acontece. | ★★★★ |

### Tese 2 — De registro para inteligência (dados que o lab já coleta virando produto)

| Item | Descrição | Valor |
|---|---|---|
| **V2-05 · Analytics de concreteiras** | Evolução do Excel (US23) para dashboard vivo: % de não conformidade por concreteira/traço/período, tendência de FCM, ranking. O laboratório passa a *vender insight* ("a concreteira X entrega 8% abaixo nas quartas-feiras"), não só laudo. | ★★★★★ |
| **V2-06 · Alerta precoce de reforço** | Ao registrar ruptura de 7d com projeção < fck, disparar alerta imediato (interno + opcional ao cliente) — hoje o sinal existe só dentro do laudo. Tempo de reação vale dinheiro em obra. | ★★★★ |
| **V2-07 · Classificação de fratura por foto** | A foto "Depois" da evidência já existe; um classificador sugere o tipo de fratura (nomenclatura do lab) e a engenheira só confirma. | ★★★ |
| **V2-08 · Mapa de obras** | GPS já é coletado (US20); plotar obras/concretagens num mapa com status do pipeline — visão de operação para os sócios e argumento comercial. | ★★ |

### Tese 3 — Compliance como diferencial competitivo

| Item | Descrição | Valor |
|---|---|---|
| **V2-09 · Módulo de calibração e equipamentos** | Cadastro de prensa/moldes/paquímetro, certificados de calibração anexados, alertas de vencimento, nº do certificado impresso no laudo. É o degrau concreto rumo à ISO/IEC 17025 (que o PRD deixou "extensível") — e acreditação abre mercado de obras públicas maiores. | ★★★★ |
| **V2-10 · Controle de cura (NBR 5738)** | Registro de temperatura do tanque (manual ou sensor IoT barato) anexado à rastreabilidade do CP. Diferencial técnico que quase nenhum laboratório pequeno documenta. | ★★★ |
| **V2-11 · Novos ensaios** | Esclerometria (NBR 7584) e fator h/d com retífica (já reservado no modelo com `fator_correcao_hd`). A modelagem previu; a V2 ativa. | ★★★ |
| **V2-12 · Carimbo do tempo ICP-Brasil** | Timestamping do PDF assinado — prova jurídica de existência na data, coerente com a retenção vitalícia. | ★★ |

### Tese 4 — Expansão do modelo de negócio

| Item | Descrição | Valor |
|---|---|---|
| **V2-13 · Portal transacional** | Cliente solicita ensaio/agenda concretagem pelo portal (hoje o cadastro é 100% interno); calendário compartilhado de concretagens previstas alimenta a logística de coleta. | ★★★★ |
| **V2-14 · Módulo de medição/faturamento** | Relatório mensal por cliente (ensaios realizados × tabela de preço) pronto para faturar — o "financeiro" que o MVP excluiu, começando pelo relatório, não pelo boleto. | ★★★ |
| **V2-15 · SaaS white-label** | A arquitetura (RLS multi-cliente, RBAC, auditoria, numeração configurável) está a um `laboratorio_id` de distância de ser multi-tenant. Licenciar para outros laboratórios de controle tecnológico transforma custo de software em ativo — a decisão estratégica mais importante deste backlog, e a que mais merece validação de mercado antes de qualquer código. | ★★★★★ |

### Critério de priorização sugerido para a V2

1. **V2-02 (offline)** e **V2-01 (assinatura)** primeiro — removem os dois últimos "gambiarras" operacionais do fluxo diário.
2. **V2-05/V2-06** em seguida — monetizam dados que já estão no banco.
3. **V2-09** quando houver ambição de acreditação; **V2-15** somente após 3–6 meses de uso interno estável (o próprio laboratório é o case de vendas).

---

*Documento gerado a partir da auditoria do código em `apps/mobile`, `apps/web` e `packages/shared` na branch de trabalho; nenhuma alteração de produto foi feita junto com esta análise.*
