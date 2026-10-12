# Plano do Novo Aplicativo — Rastro

> **Status:** plano de produto e de arquitetura. Nada aqui foi implementado.
> **Versão:** v1.1 · 12/10/2026
> **Base:**
> - `PRD_MVP.md` v2.0 (P1–P25), `roteiro_entrevista_laboratorio.md` (o que a engenheira definiu), `MEMORIA_PROJETO.md`, `revisao_critica_prd.md`, `SPEC_TECNICA.md`, `AUDITORIA_POS_S008.md`, `auditoria_ux_quickwins_backlog_v2.md`;
> - o código atual (`apps/`, `packages/`, `supabase/`);
> - a foto `WhatsApp Image 2026-05-26 at 19.36.54.jpeg`: CP rompido no topo, ainda marcado a canetão vermelho, às 19:35, em Aparecida de Goiânia-GO.
>
> **Como foi feito:** três conceitos concorrentes (cockpit operacional, AI-native e produto premium/SaaS) foram avaliados por dois juízes, um com olhar de RT/normas e outro de produto/tecnologia. Os dois escolheram o **cockpit operacional**. Este plano parte dele, enxerta o que os outros dois tinham de melhor, descarta o que foi rejeitado e corrige os erros apontados (seção 13).
>
> **Convenções:**
> - **[ENG]**: decisão da engenheira, que não reabrimos;
> - **[PROP]**: proposta nova, que precisa de aceite;
> - **[ext]**: referência normativa ou técnica de fora dos documentos, a confirmar;
> - **[Qn]**: depende da pergunta *n* da seção 14.
>
> **Revisão:** v1.1 — revisão adversarial (normas, fidelidade, viabilidade técnica)

---

## 0. Resumo executivo

**O problema.** O app atual não é ruim por dentro. Ele é ruim por fora.
- O domínio está correto e testado: 238 testes em `packages/shared`, cerca de 172 asserções pgTAP em `supabase/tests/01–13`, RPCs transacionais, RLS, auditoria e versionamento de laudo.
- O que parece "simples e feio" é a camada visual e o PDF:
  - uma cor só (o azul padrão do Tailwind);
  - fonte do sistema;
  - cerca de 25 emojis como ícones, inclusive nas fraturas;
  - a ergonomia de luva da prensa aplicada ao escritório;
  - 4 telas que mostram "vazio" mesmo havendo dados;
  - um único gráfico no app inteiro;
  - um laudo em Helvetica 8pt sem logo.
- E nenhuma tela responde **"o que eu faço agora e em que pé está cada CP"**.

**A proposta.** **Rastro** é o cockpit operacional do laboratório. Cada corpo de prova (CP) nasce com um código, uma janela de prazo e uma linha do tempo que vai da betoneira ao laudo assinado. As principais mudanças:

1. **A home de cada pessoa é "Hoje / Amanhã", não um cadastro.**
   - sócio de campo: a rota de coletas;
   - prensa: a lista do dia ordenada pela janela que fecha primeiro;
   - escritório: a caixa de exceções;
   - RT: a fila de assinatura.
2. **Um botão, "Bipar", resolve tudo.** O QR do CP abre a ação certa para o estado dele. A **conciliação** ("4 de 6 bipados") impede que um CP suma sem decisão registrada.
3. **O laudo é consequência, e é o produto.**
   - O rascunho se completa sozinho no último rompimento.
   - O Estúdio mostra a prévia, que é o próprio PDF.
   - O conteúdo é congelado num **snapshot imutável**.
   - O PDF sai num layout único redesenhado. O original é PDF/A-2b se a engenheira aceitar trocar a trava de edição por PAdES + QR [Q2]; a conformidade do arquivo **assinado** é verificada no S0.
   - A **validação pública** lê do snapshot e oferece "Conferir arquivo".
   - A assinatura gov.br é guiada e **verificada** (PAdES, e o arquivo assinado contém byte a byte o original).
4. **Duas ergonomias sobre um design system próprio.**
   - **Campo/Bancada:** luva, sol, 56–88 dp.
   - **Escritório:** denso, com tabelas, painel lateral e Ctrl+K.
   - Identidade "Concreto & Sinalização": grafite, neutros de concreto e amarelo sinalização com a regra *amarelo = aja agora*. Nenhum emoji.
5. **IA só onde há transcrição ou julgamento visual, nunca nos números legais.**
   - Leitura completa da NF: chave DANFE lida de forma determinística, mais Claude Haiku 5.5 com validação cruzada.
   - Sugestão de fratura em **modo sombra**, nunca pré-selecionada.
   - Copiloto de concreteiras, depois da virada.
   - MPa, FCM, projeção, datas e cláusulas do laudo são **determinísticos**.

**Por que assim.** Os cinco gargalos da entrevista, na ordem da engenheira, são todos de **caminho e de tempo**:
1. coleta depois de 24h;
2. canetão;
3. transcrição da NF;
4. fraude no PDF;
5. entrega travada na RT.

Uma operação logística com relógio resolve isso melhor do que telas mais bonitas sobre a mesma lógica de cadastro.

**[PROP]** A ordem de construção não é a dos gargalos. O laudo e a assinatura (4 e 5) vêm primeiro porque o canetão (2) depende do teste da etiqueta. A coleta (1) ganha um paliativo imediato, o "plano de amanhã v0" por e-mail (10.2), até a agenda completa da F3.

**Como.** Reescrevemos as interfaces e o PDF e **evoluímos o backend no lugar**: o mesmo Supabase, migrations 0019+ **em expansão/contração** (nada que os apps atuais usam é renomeado ou fechado antes da virada) e o `packages/shared` mantido. Os apps novos convivem com os atuais no padrão estrangulador e substituem um papel de cada vez. O S0 confirma se os apps atuais estão de fato em uso operacional (10.1).

**Quando** (3 devs, mais um 2º dev React Native a partir da F3; designer em meio período; RT com 6–8 h por semana no S0–F1 e 2 h depois. Com 2 devs e a RT a 2 h/semana, o cronograma é o da 10.1):

| Marco | Semana | O que entrega |
|---|---|---|
| **M1** | ~8 (≈ 2 meses) | Laudo novo, snapshot, validação v2 e assinatura verificada, **em produção**, com a conferência no LaudoDetalhe atual adaptado e os dados dos apps atuais (ou importados, se o S0 mostrar que não estão em uso); apps atuais com a nova identidade (cor, tipografia, ícones) |
| **M2** | ~14 (≈ 3,5 meses) | Estúdio, Central de Operações e Portal do cliente |
| **M3** | ~22 (≈ 5,5 meses) | Novo app de Campo e Bancada: fim do canetão, da ficha e do WhatsApp |
| **M4** | ~26 (≈ 6 meses) | Virada completa, depois de 2 semanas de operação paralela com a Tarcal |
| Fase 5 | até ~30 (≈ 7 meses) | Inteligência: análise de concreteiras, copiloto e fratura visível |

**Antes de escrever código (Sprint 0):**
- testar o assinador gov.br com o PDF e validar o PDF **assinado** com veraPDF (PDF/A-2b), registrando o resultado;
- iniciar o teste da etiqueta em água saturada de cal, com leituras nos dias 7 e 28 (decisão provisória no Gate 2) e continuação até 91 dias (maior idade oferecida);
- confirmar se `apps/web` e `apps/mobile` estão em uso operacional (10.1);
- confirmar e decidir a região do projeto Supabase;
- fazer o workshop das perguntas bloqueantes (seção 14). A principal é o diâmetro: o PRD calcula com o **nominal**, a NBR 5739 [ext] usa o **medido**.

---

## 1. Diagnóstico do app atual

### 1.1 Por que parece simples e feio

| Sintoma | Onde | Efeito |
|---|---|---|
| Tokens rasos: só `brand #1d4ed8` (blue-700 do Tailwind), sem escala de neutros, elevação ou tipografia | `apps/web/tailwind.config.ts`; `apps/mobile/tailwind.config.js` nem define `warning`, mas `TextField.tsx:23`, `NumericInput.tsx:25` e `RupturaFormScreen.tsx:313/326/330` usam | Visual de template; o destaque amarelo do OCR (US01-CA2) praticamente não aparece |
| Fonte do sistema e tamanhos soltos no código (`fontSize: 18`, `48`…) | `apps/web/src/index.css`, telas mobile | Sem identidade, sem hierarquia |
| Cerca de 25 emojis como ícones, inclusive as 6 fraturas (🔺🔻🌗💥↘️⚡) | `apps/mobile/src/features/fratura/FraturaPicker.tsx`, `EmptyState.tsx` | Tom amador num produto que emite documento jurídico |
| Ergonomia de luva (56px/18px) aplicada ao escritório: navegação em botões gigantes, coluna única `max-w-4xl` | `apps/web/src/components/AppShell.tsx`, `ManagementNav.tsx` | "Celular esticado" no desktop |
| Só cartões, sem tabela, paginação ou drawer; o detalhe do laudo abre **embaixo** da lista | `LaudosPage.tsx`, `LaudoDetalhe.tsx` | Baixa densidade e navegação ruim |
| **4 placeholders que mostram vazio fixo**: web `/campo`, web `/prensa`, mobile `painel`, mobile `portal` | `apps/web/src/features/campo/CampoPage.tsx`, `features/prensa/PrensaPage.tsx`, `apps/mobile/src/app/painel.tsx`, `app/portal.tsx` | O cliente com laudos vê "Nenhum laudo disponível" |
| Um único gráfico no app (`ResistenciaChart.tsx`, só no detalhe do laudo) | — | Nada mostra andamento, tendência ou comparação |
| PDF montado à mão em `pdf-lib`, Helvetica 8–9pt, "logo placeholder", "Eng. — CREA" fixo, tabela fora da matriz do PRD §11, QR só na última página | `supabase/functions/gerar-laudo-pdf/pdf.ts` | O "feio" mais caro, porque é o que o cliente mostra ao fiscal |
| Portal é só um repositório de PDF | `apps/web/src/features/portal/PortalPage.tsx` | Nenhum valor percebido além do WhatsApp |
| Nenhuma tela responde "em que pé está cada NF"; tempo real só no Painel; `refetchOnWindowFocus: false` | `apps/web/src/main.tsx`, `concretagens-service.ts:170` | Dados velhos no Dashboard e em Laudos |

### 1.2 Erros de operação que o app novo precisa corrigir (alguns já no app atual)

1. **Fuso horário.** Todo "hoje" é calculado em UTC: `toISOString().slice(0,10)` no mobile, `toUtcDayNumber` no shared, `current_date` nas RPCs e o default `current_date` de `rupturas.data_ruptura_real` (0002). O `pg_cron` também roda em UTC: o job `cps-pendentes-coleta-diario` (0017), comentado como "09:00", dispara às 06:00 em Goiás. Em Goiás, depois das 21h, o dia vira. Isso desloca a data padrão da concretagem e **afrouxa em 3h a trava do CP mandatório**. A foto é das 19:35: o laboratório trabalha à noite.
2. **Prazo de coleta.**
   - `coleta_atrasada` usa `created_at` (AUD M3) e não a hora real da moldagem.
   - A janela tem largura zero: a agenda mostra CPs com ≥ 24h e a ressalva vale para > 24h.
3. **Agenda.** Hoje só mostra o que já venceu. A engenheira pediu um plano **gerado no fim do dia para o dia seguinte, com rota**.
4. **Rótulo do veredito.** `packages/shared/src/engineering/veredito.ts:97` diz *"Abaixo do fck — avaliar reforço"*. Isso põe na boca do laboratório uma decisão que é do projetista. Além disso, conformidade é avaliação de lote pela NBR 12655 [ext], não de um CP.
5. **Acesso.** `ROLE_ALLOWED_AREAS.eng_lab` em `packages/shared/src/auth/navigation.ts` não inclui `campo`: a RT não consegue coletar CPs pelo app.
6. **Brechas de RLS** (AUD 4.2-2):
   - `rupt_write FOR ALL` deixa inserir ruptura com MPa arbitrário;
   - `cp_insert` aceita CP já com status `rompido`;
   - `laudos_eng_all` permite alterar status, número e código direto;
   - `evid_rw` permite DELETE;
   - a unicidade do número do laudo só existe dentro da RPC.
7. **H4 (snapshot).** `validar-laudo` lê o banco vivo. Ao iniciar uma correção, o QR antigo passa a mostrar a v2 em rascunho.
8. **Assinatura não verificada.** `upload-laudo-assinado` só confere `%PDF-` e o sha256. O PDF sai criptografado com senha de proprietário, que o assinador gov.br pode recusar e que o PDF/A não admite.
9. **Foto da NF descartada.** `nf_foto_url` nunca é preenchido e não existe bucket para ela.
10. **OCR raso.** Só 5 campos (`packages/shared/src/concretagem/ocr-form.ts`), sem template Tarcal, sem `responseSchema`, com confiança autodeclarada pelo modelo, em `gemini-2.0-flash` (`supabase/functions/ocr-nota-fiscal/gemini.ts`).

### 1.3 O que se aproveita, o que se refaz

| Ativo | Caminho | Decisão |
|---|---|---|
| Engenharia (MPa, projeção, faixas, veredito, arredondamento) | `packages/shared/src/engineering/*` | **Manter.** Os vetores do laudo real são a âncora (21.977 kgf → 27,44 MPa). Trocar os rótulos de `veredito.ts`. |
| Máquinas de estado e `canTransition` | `packages/shared/src/state-machines/*` | **Manter.** O laudo ganha `em_conferencia`; o CP ganha `mandatorio` (o `mandatorio_28d` só sai na migration de contrato, depois do M4). |
| Moldagem (plano de CPs, atalhos, cm→mm) | `packages/shared/src/concretagem/molding.ts` | **Manter + estender** com calendário de dias úteis e feriados. |
| Consolidação, modelo do laudo, gráfico | `packages/shared/src/laudo/{consolidacao,pdf-report,chart-svg}.ts` | **Manter.** `pdf-report` vira o JSON do snapshot e a entrada do template Typst. |
| Ressalvas | `packages/shared/src/laudo/ressalvas.ts` | **Manter a lógica, refazer o texto-base.** O parágrafo padrão atual (`CONSIDERACOES_FINAIS_PADRAO`) diz que os CPs foram "moldados, curados e ensaiados [...] conforme a ABNT NBR 5739": cita a norma errada para moldagem e cura e declara uma conformidade que não existe (diâmetro nominal, coleta tardia). Cláusula-base nova, a aprovar pela RT na biblioteca [Q17]: *"Corpos de prova moldados e curados segundo a ABNT NBR 5738; abatimento segundo a ABNT NBR 16889; ensaio de compressão segundo a ABNT NBR 5739, ressalvados os desvios indicados abaixo. Os resultados referem-se exclusivamente às amostras ensaiadas."* Enquanto a Q1 não migrar para o diâmetro medido, entra a ressalva fixa: *"Resistência calculada com a área da seção nominal (d = 100 mm), e não com a média dos diâmetros medidos prevista na NBR 5739."* |
| Validação pública | `packages/shared/src/laudo/validacao-publica.ts` | **Refatorar:** ler o snapshot e mostrar a última versão assinada. |
| Agendas de coleta e prensa | `packages/shared/src/coleta/agenda.ts`, `prensa/agenda.ts` | **Reescrever** como modelo de janelas (abre/fecha) em fuso local. |
| Datas e métricas | `packages/shared/src/lib/date.ts`, `dashboard/metrics.ts` | **Corrigir** para `America/Sao_Paulo`. |
| Comparativo concreteira × fck | `packages/shared/src/export/comparativo.ts` | **Manter.** Também vira ferramenta tipada do copiloto. |
| Aviso de carga em kN, marca d'água | `packages/shared/src/prensa/{carga,watermark}.ts` | **Manter.** `carga.ts` só tem o limiar de 1.000 kgf (e o comentário "1 kN ≈ 102 kgf"); o botão [Converter] é novo e usa 1000/9,80665 (`KGF_TO_NEWTON` de `engineering/mpa.ts`). |
| CNPJ | `packages/shared/src/lib/cnpj.ts` | **Estender** para o CNPJ alfanumérico (IN RFB 2.229/2024 [ext], emitido desde 07/2026): A–Z/0–9 nas 12 primeiras posições e DV pela regra nova. Hoje o código remove tudo que não é dígito e rejeitaria esses CNPJs. |
| Navegação por papel, templates de e-mail em texto | `packages/shared/src/auth/navigation.ts`, `email/templates.ts` | **Descartar no app novo.** |
| Migrations 0001–0018, RPCs `SECURITY DEFINER`, triggers de auditoria e de anti-DELETE, pgTAP | `supabase/migrations/`, `supabase/tests/` | **Manter e evoluir** com 0019+, só para frente e em expansão/contração até o M4 (8.4). |
| `exportar-excel` | `supabase/functions/exportar-excel/` | **Manter.** Corrigir o banner, que mostra o UUID da obra. |
| `ocr-nota-fiscal` | `supabase/functions/ocr-nota-fiscal/` | **Substituir** por `ia-nf`. Mantém o rate limit e o contrato `{fields, lowConfidenceFields}`. O adaptador Gemini fica como reserva, com o modelo fixado por `GEMINI_MODEL` (o padrão `gemini-2.0-flash` pode já ter sido aposentado; ver 10.2). |
| `gerar-laudo-pdf` | `supabase/functions/gerar-laudo-pdf/` | **Trocar o renderizador** (pdf-lib → Typst). Mantém `buildLaudoReport`, `verification.ts` e a guarda de "RASCUNHO". |
| `upload-laudo-assinado`, `validar-laudo`, `enviar-email`, `admin-provisionar-usuario` | `supabase/functions/*` | **Refatorar** (seção 8.4). |
| Driver de impressora ESC/POS + BLE | `apps/mobile/src/services/printer/{escpos,ble,encoding}.ts` | **Refatorar** num adaptador de protocolo definido pela impressora homologada no S0 (candidatos: ESC/POS, TSPL, CPCL, ZPL), com impressora lembrada e transporte BLE com MTU negociado (8.5). Requisito de homologação: BLE GATT, não só SPP clássico, para funcionar no iOS. |
| Padrões de UI: `DashboardCard`, `LoadingButton`, `StatusPill`, `QrScanner`, optimistic locking 409 | `apps/web/src/features/dashboard/DashboardCard.tsx`, `components/ui/*`, `apps/mobile/src/components/QrScanner.tsx`, `ConcretagemEditForm.tsx` | **Manter o conceito** e reimplementar no novo kit. |
| Telas de `apps/web` e `apps/mobile` | — | **Substituir** por persona, em estrangulador. Continuam vivas como rollback até a virada, **se** o S0 confirmar que estão em uso operacional (10.1). |

---

## 2. Visão e princípios de produto

### 2.1 Visão

> **"Nenhum CP perdido, nenhuma coleta fora da janela, nenhum laudo parado esperando alguém que não sabe que ele está pronto."**

O laboratório vende um **número de resistência confiável, entregue a tempo de a obra decidir**. Tudo o que ameaça esse número acontece no caminho do CP:

| O que acontece no caminho | Efeito |
|---|---|
| Coleta tardia | Prejudica a cura |
| Canetão | Permite trocar CPs entre obras |
| Transcrição | Introduz erro |
| WhatsApp | Atrasa a entrega |
| PDF adulterável | Abre espaço para fraude |

O Rastro trata o laboratório como **uma operação logística com relógio**.

### 2.2 Princípios (cada um com sua consequência no produto)

1. **O CP é a espinha.**
   - Todo CP tem uma linha do tempo de eventos que só cresce (`cp_eventos`).
   - Agenda, alertas, quadro e laudo são **derivados** desses eventos por views.
   - *Consequência:* não existe "status solto" editado à mão.
2. **Hoje primeiro.** A home é uma lista priorizada de ações com hora. *Consequência:* somem a home "Lista de obras" e o dashboard de 4 números.
3. **Um bipe resolve.** O QR é a entrada universal. *Consequência:* o "Bipar" fica no centro da barra de abas e há tabela de ação por estado (4.8).
4. **O relógio fica visível.** Todo prazo vira contador ("libera 07:10", "janela fecha 14:30", "pronto há 5h"). *Consequência:* o componente `SlaTimer` aparece em todas as superfícies, e a cor muda por limiar, nunca por gosto.
5. **Nada se perde em silêncio.** Toda etapa física fecha com conciliação, e qualquer divergência exige decisão registrada.
6. **Ergonomia por contexto, não por plataforma.**
   - Bancada: luva, tema escuro, alvos ≥ 72 dp.
   - Campo: sol, alvos ≥ 56 dp.
   - Escritório: densidade.
   - Portal: clareza.
7. **Números legais são determinísticos.**
   - MPa, FCM, projeção, idade, janelas e cláusulas vêm de `packages/shared` e das RPCs.
   - A IA só **sugere**, e toda sugestão tem decisão humana registrada.
8. **Medir de verdade.**
   - Nenhuma medida é pré-preenchida nem repetida do CP anterior.
   - O app grava d1, d2 e h de cada CP.
   - A norma não vira chave de configuração: diâmetro, tolerâncias de idade e temperatura de cura são fatos fixos no código; o laboratório só pode *estreitá-los*, com aprovação registrada da RT.
9. **Prudência jurídica diante do cliente.**
   - Nenhum número aparece ao cliente antes da assinatura da RT.
   - A comparação com o fck é **factual**, sem cor nem veredito, até a engenheira aprovar [Q18].
   - Resultado baixo vira **tarefa interna** "comunicar cliente", nunca notificação automática.
10. **Hora local e tempo real por padrão.**
    - Todo "hoje" usa `America/Sao_Paulo`.
    - Tudo que muda de estado aparece ao vivo.
11. **As decisões da engenheira são restrições** (2.3).

### 2.3 Restrições [ENG] e como o Rastro as respeita

| Decisão da engenheira | No Rastro |
|---|---|
| **Sem modo offline** | Exige conexão. Sem sinal, há três recursos: (a) rascunho local do formulário e da foto da NF; (b) cache **de leitura** do plano das 18:00; (c) etiquetas pré-impressas de reserva [Q10]. Não há sincronização bidirecional. A proposta "offline-first" do backlog UX (V2-02) fica descartada. |
| **Sem fotos no laudo do cliente** | Fotos ficam só no **Anexo Técnico de Evidências** (PDF interno, sob demanda, gerado na W9 a partir da F2·S5). A RLS impede o cliente de ver qualquer foto. |
| **Assinatura gov.br PAdES manual pela RT** | Fluxo guiado no celular e no desktop, com verificação automática do arquivo devolvido. Sem automação por API. |
| **PDF com bloqueio de edição e cópia (3ª camada anti-fraude)** | **Conflita com o PDF/A-2b**, que proíbe criptografia (ISO 19005 [ext]). Decisão da engenheira no S0 [Q2]: (a) PDF/A-2b sem senha, com a integridade em PAdES + snapshot + QR + Conferir arquivo [PROP]; ou (b) PDF 1.7 com senha de proprietário, sem PDF/A. O teste do assinador no S0 cobre os dois. |
| **Impressora térmica BLE com etiqueta QR impermeável** | Adaptador de protocolo, impressora lembrada e teste em água com cal iniciado no S0: 28 dias para decidir, continuação até 91 dias para confirmar (maior idade oferecida). |
| **Entrada manual na prensa (integração com prensa e balança no backlog)** | Teclado numérico grande na tela **do celular** [ENG]; tablet só com aceite [Q3]. Voz e foto do display ficam como experimento posterior. |
| **Layout único do laudo; varia só o logo e os resultados** | Um template Typst. Nenhum texto gerado por IA no laudo. Nenhuma caixa de "resumo" com veredito. |
| **Tarcal cliente fixo diário, NF padronizada, numeração pelo nº da NF** | Modelo Tarcal na leitura da NF, atalho de moldagem por cliente e série de numeração "NF". |
| **Excel mensal concreteira × fck** | Mantido no mesmo formato (`exportar-excel`) desde a F2 (W16 Relatórios), antes de o escritório antigo ser desligado. Geração automática no dia 1 é [PROP/Q28]. |
| **Laudo pré-pronto é a killer feature** | Rascunho atualizado a cada ruptura, Estúdio com checklist e snapshot. |
| **Botões grandes na prensa** | Bancada com alvos de 72 dp, teclas de 72–88 dp (88 dp no tablet) e MPa em 96 pt. |
| **Retenção vitalícia, sem exclusão física** | Anti-DELETE mantido, export frio WORM mensal e teste de restauração trimestral. |
| **Cadastro só interno** | Convites criados pelo laboratório; sem auto-cadastro. |
| **Uma assinatura (RT) basta; a 2ª é opcional** | A 2ª assinatura vai no **mesmo PDF**; por convenção, o elaborador assina antes e a RT por último. Ambos respondem pelo que assinam. |

### 2.4 Anti-objetivos (v1)

- Modo offline.
- Leitura automática de prensa ou balança.
- Layout customizável.
- App nativo para o cliente.
- ISO 17025.
- Financeiro e faturamento.
- Billing, onboarding e white-label SaaS.
- Copiloto e roteirização paga antes da virada.

---

## 3. Personas e jornadas redesenhadas

### 3.1 Papéis = papel + capacidades

Hoje `role` e `is_admin` se misturam (`usuarios`), e as concretagens dependem de `is_admin`. No Rastro, **papel** diz o que a pessoa faz e **capacidades** dizem o que ela pode autorizar. Os dois vão no JWT por um Custom Access Token Hook.

| Persona | Papel | Capacidades típicas | Superfície principal |
|---|---|---|---|
| Sócio de campo / moldador | `campo` | criar obra e concretagem, imprimir etiqueta, coletar, descartar CP `moldado` próprio; `numerar` [Q4] | App Rastro, modo Campo (Sol) |
| **Laboratorista** (novo; a foto sugere outro operador às 19:35, e o laudo tem campo "Laboratorista") [Q3] | `laboratorista` | romper, fotografar, descartar com motivo, **sugerir** expurgo, registrar temperatura do tanque. **Não** expurga nem assina | App Rastro, modo Bancada |
| Engenheira de laboratório (RT, CREA) | `engenheiro` | `assinar`, `expurgar`, `admin`, `conferir`, **`romper`**, **`coletar`** (é isso que lhe dá o trabalho de campo e de laboratorista) | App (Bancada, Campo, Assinar) + Escritório |
| Engenheiro de escritório (elaborador) | `engenheiro` | `conferir`, `numerar`, `admin`, `assinar_2a`; `assinar` como RT substituto só se [Q20]. **Sem** `romper` nem `coletar` (matriz RBAC do PRD) | Escritório (+ app para aprovar) |
| Cliente: gestor | `cliente_admin` | ver todas as obras da empresa, convidar colegas | Portal |
| Cliente: residente ou fiscal contratado | `cliente_membro` | ver só as obras às quais foi convidado | Portal |
| Fiscal / auditor externo | sem conta | validar o laudo e conferir o arquivo | Página pública `/v/{codigo}` |

### 3.2 Um dia do sócio de campo

| Hora | No Rastro | Hoje |
|---|---|---|
| **18:00 da véspera** | E-mail (push se [Q14]) "Plano de amanhã: 4 coletas · primeira libera 07:10 · 1 em risco". Abre a lista ordenada pela hora de liberação. | Memória e agenda lotada |
| **06:50** | **Hoje.** Cartão "Próxima ação": *Coletar 6 CPs · JARDINS · libera 07:10*. Botão **Navegar** abre Maps ou Waze. | — |
| **07:15, na obra** | **Bipar CPs desta obra:** 0/6 → 6/6, com vibração a cada bipe. Bipar um CP de outra obra dá erro forte: "CP de AGEHAB-Q17". Bipar antes de 24h bloqueia: "Libera às 07:10" [ext NBR 5738; Q6]. | Canetão, risco de troca |
| **07:22** | Falta um CP. O app **não deixa concluir a parada** sem uma de três decisões: etiqueta ilegível → digitar código curto; CP danificado → descartar com motivo e foto; ficou na obra → reagendar. | O CP sumia sem registro |
| **08:30, caminhão da Tarcal** | **Nova concretagem:** foto da NF → a chave DANFE e a IA preenchem cerca de 12 campos → slump → moldagem "2×7+2×28" com calendário → 4 etiquetas no molde. Meta de **≤ 90 s de interação**. | Ficha de papel → foto → WhatsApp → Excel |
| **Sem sinal** | Rascunho local mais foto; "as etiquetas serão impressas quando o envio concluir". Contingência: etiqueta pré-impressa [Q10]. | Foto comum e cadastro depois [ENG] |
| **16:00** | "Meu dia": 12 moldados, 18 coletados, 0 fora da janela. | — |

### 3.3 Um dia na prensa (laboratorista ou RT)

| Hora | No Rastro |
|---|---|
| **13:30** | Na Bancada (celular; tablet se aprovado [Q3]): "Romper hoje 42 · 3 com janela fechando antes das 15:00". A fila vem ordenada pela **janela que fecha primeiro**, com os pares juntos. |
| **13:35–19:40** | Loop por CP:<br>1. Bipar.<br>2. Foto "antes": o app lê o QR **na própria foto** e confere se é o CP carregado.<br>3. d1, d2, h e peso, sem pré-preenchimento.<br>4. Romper e digitar a carga em kgf. O MPa aparece em 96 pt, com % do fck e projeção para 28d nas idades iniciais.<br>5. Escolher a fratura num dos 6 desenhos técnicos.<br>6. Foto "depois".<br>7. **Registrar e próximo**, com 5 s para desfazer. |
| **Ao fechar um par** | Cartão com o FCM da idade e a dispersão entre os dois CPs. Se a projeção para 28d ficar abaixo do fck, vai um **alerta interno** para a RT. |
| **Uma vez por dia** | Registra, por tanque, a temperatura atual e a **máxima e a mínima** desde a última leitura (termômetro de máx./mín. ou datalogger). Máxima ou mínima fora de 23 ± 2 °C [ext NBR 5738/9479] gera alerta e vincula os CPs em cura no período. |
| **19:40** | **Fechar bancada:** 42/42, 0 pendentes, "9 laudos ficaram completos → foram para conferência". |

### 3.4 RT assinando

- **07:30.** Na tela **Assinar (3)**, cada cartão mostra:
  - cliente, obra e NFs;
  - FCM por idade contra o fck (só números);
  - anomalias e as decisões tomadas;
  - "Campos da NF lidos por IA: 11 · conferidos por [sócio] · editados no escritório: 1".
- **Para cada laudo:**
  1. **Ver PDF.**
  2. **Assinar no gov.br** pelo navegador do sistema.
  3. **Compartilhar → Rastro.**
  4. O Rastro verifica e publica. O cliente recebe e-mail.
- **Meta:** < 2 min de interação por laudo.
- **Antes do app nativo (Fase 1),** o mesmo fluxo funciona na web responsiva: baixar, assinar e enviar o arquivo pelo seletor.

### 3.5 Engenheiro de escritório

- **08:00.** Abre a **Central de Operações**. O quadro mostra o andamento por NF, os alertas de prazo e "9 laudos completos aguardando conferência (o mais antigo há 12h)".
- **No Estúdio:**
  - J/K percorre a fila.
  - O número já vem gerado.
  - Ressalvas e considerações saem de **regras** sobre cláusulas aprovadas.
  - Uma anomalia "par 28d diverge" pede decisão: manter, ou pedir expurgo à RT.
  - **Enviar para assinatura** congela o snapshot.
- **Durante o dia:** trata a caixa de **Exceções** (NF com campo duvidoso, cadastro tardio, CP não conciliado, ruptura fora da janela) e cadastra clientes, contatos e obras.

### 3.6 Cliente e fiscal

- **Cliente.**
  - Recebe o e-mail "Laudo N°004AGEHAB disponível".
  - No portal, a página da **obra** mostra:
    - andamento sem números antes da assinatura ("12 CPs moldados em 13/10 · 7d ensaiados em 20/10 · laudo final previsto em 11/11"). Por padrão, as idades intermediárias só saem no laudo final; o parcial é emitido **quando solicitado** [ENG];
    - os resultados assinados;
    - a curva com a linha do fck;
    - a grade **quadra × lote** (obras horizontais do tipo AGEHAB);
    - o **Dossiê da obra** (índice + ZIP dos PDFs assinados).
- **Fiscal.**
  - Escaneia o QR e vê "Autêntico · versão vigente · assinado por [nome] em 21/10/2026 07:41".
  - Pode arrastar o PDF recebido para **Conferir arquivo**. O hash é calculado no navegador e o arquivo não é enviado.

### 3.7 Quem é avisado de quê

| Evento | Quem | Canal padrão | Quando |
|---|---|---|---|
| Plano do dia seguinte | Sócio, RT, laboratorista | E-mail (push [Q14]) | 18:00 locais |
| Coleta libera / janela fecha em 2h / passou da janela | Sócio (+ RT se passou) | In-app + e-mail (push [Q14]) | Contínuo |
| Janela de ruptura fecha em 2h e o CP não foi rompido | Bancada | Destaque na fila + in-app | 2h antes |
| Projeção 7d/14d < fck | RT + escritório | In-app + e-mail | Imediato. **Não é enviada automaticamente ao cliente**: cria a tarefa "avaliar comunicação ao cliente" para a RT, com prazo e registro da decisão (o dever de comunicar é juízo profissional da RT, não regra do software) |
| Laudo completo (cobertura fechou) | Escritório | Fila do Estúdio + resumo diário | Imediato |
| Pronto para assinatura | RT | E-mail + in-app | Imediato |
| Laudo assinado e publicado | Contatos do cliente com acesso à obra | E-mail HTML (WhatsApp [Q15]) | Imediato |
| Resultado < fck publicado | **Ninguém automaticamente.** Cria a tarefa "comunicar cliente" para a RT | In-app | Na publicação |

---

## 4. Arquitetura de informação e mapa de telas

### 4.1 Modelo mental: 4 objetos, 4 lentes

| | O que é |
|---|---|
| **Objeto: CP** | O átomo: código, estado, janelas e linha do tempo |
| **Objeto: Concretagem/NF** | A mãe dos CPs, com o andamento agregado |
| **Objeto: Laudo** | Cobertura, versão, snapshot e assinatura |
| **Objeto: Obra** | O lugar: cliente, contatos e GPS |
| **Lente: Hoje** | O que fazer agora |
| **Lente: Quadro** | Onde está cada coisa |
| **Lente: Linha do tempo** | O que aconteceu e o que vai acontecer |
| **Lente: Mapa** | Onde fica |

**Estados derivados** (views, sem colunas editáveis):
- Aguardando liberação (< 24h);
- **Coletar** (janela aberta);
- **Coleta fora da janela**;
- Em cura;
- **Romper hoje**;
- **Ruptura atrasada**;
- Aguardando outras idades;
- **Laudo completo / em conferência**;
- Aguardando assinatura;
- Assinado;
- Entregue (aberto pelo cliente).

Os estados formais continuam os do backend: CP `moldado/coletado/rompido/descartado/expurgado`; laudo `rascunho/em_conferencia/pronto_assinatura/assinado/substituido`.

### 4.2 Superfícies

| Superfície | Tecnologia | Quem usa | Navegação |
|---|---|---|---|
| **App Rastro** (Android primeiro, iOS também) | Expo (SDK atual) | Sócio, laboratorista, RT; escritório para aprovar | Abas por papel com **Bipar** central. Barra de status operacional (sinal, impressora, hora local). **Voltar sempre visível**. |
| **Modo Bancada** (mesmo app; **celular na vertical** como layout v1 obrigatório [ENG]; tablet de 10–11" na horizontal só se o S0 provar ganho e houver aceite [Q3]) | Expo | Laboratorista, RT | Tela única de loop; no tablet, a fila à esquerda; no celular, a fila recolhida no cabeçalho |
| **Rastro Escritório** (web desktop-first, responsiva) | React 19 + Vite | Engenheiros, admin | Sidebar recolhível, Ctrl+K, drawer, atalhos |
| **Portal do cliente** (web responsiva) | Mesmo app web, rotas `/portal` | Contatos do cliente | Obras · Laudos · Próximos laudos |
| **Validação pública** `/v/{codigo}` | HTML leve renderizado no **host web do laboratório** (função serverless) a partir do JSON da `validar-laudo` v2, em **domínio do laboratório** | Qualquer pessoa | Página única |

### 4.3 Mapa de telas: App Rastro (nativo)

| # | Tela | Persona | Conteúdo |
|---|---|---|---|
| N1 | Login / desbloqueio | Internos | E-mail e senha, "Esqueci a senha" (não existe no mobile atual), biometria na reabertura, MFA para quem assina |
| N2 | **Hoje (Campo)** | Sócio, RT | Próxima ação com `SlaTimer`; coletas em ordem de liberação; alternância Hoje/Amanhã; alertas (5.1) |
| N3 | **Hoje (Lab)** | Laboratorista, RT | Rupturas por janela; atrasos; fila de assinatura (só RT); alertas internos; "Abrir Bancada" |
| N4 | **Bipar** | Todos | Câmera contínua; ação conforme o estado (4.8); "digitar código curto" |
| N5 | **Nova concretagem** (5 passos) | Sócio, RT | NF → Revisar → Slump → Moldagem com calendário → Etiquetas (5.2) |
| N6 | **Coleta com conciliação** | Sócio, RT | Contagem "x de y" por parada e resolução de faltantes (5.3) |
| N7 | Obras (lista/mapa) e Obra | Sócio, RT | Busca, nova obra (GPS opcional), **editar e inativar** (US21, não existe no mobile atual), concretagens com barra de andamento |
| N8 | Concretagem (detalhe) | Sócio, RT | Foto da NF; campos (somente leitura para o sócio depois de salvar); grade de CPs; **reimprimir etiqueta**; **descartar CP moldado** com motivo e foto (não existe hoje) |
| N9 | Linha do tempo do CP | Internos | Eventos com ator, hora e local; janelas; resultado |
| N10 | Importar fotos do dia (sem sinal) | Sócio | Fotos de NF da galeria agrupadas por EXIF/GPS → rascunhos para confirmar; hora de moldagem proposta; `cadastro_tardio` |
| N11 | **Bancada** | Laboratorista, RT | Loop de ruptura (5.4) |
| N12 | Fechar bancada | Laboratorista, RT | Rompidos, pendentes com motivo, laudos completados, anomalias, temperatura do tanque |
| N13 | **Assinar** | RT, elaborador | Fila, resumo, PDF, gov.br guiado, retorno por Compartilhar, verificação (5.6) |
| N14 | Exceções (mobile) | RT | Expurgos sugeridos, CPs não conciliados, alertas precoces |
| N15 | Impressora | Sócio | Parear, **lembrar a última** (hoje `usePrinterSession.ts` não lembra), imprimir teste, material |
| N16 | Eu | Todos | Perfil, "Meu dia", biometria, notificações, tema |

### 4.4 Mapa de telas: Rastro Escritório (web)

| # | Tela | Conteúdo |
|---|---|---|
| W1 | **Central de Operações** (home) | KPIs ao vivo; **Quadro** com colunas por estágio e cartões por NF; trilho de alertas de prazo; atividade ao vivo; visões Quadro / Tabela / Linha do tempo |
| W2 | Concretagens | Tabela densa (TanStack Table): paginação no servidor, filtros salvos, `NfPipelineBar` por linha. Drawer com Resumo · CPs · Linha do tempo · NF (foto + campos com origem) · Evidências · Laudo · Auditoria. Edição com optimistic locking |
| W3 | Rastreio de CP | Busca por código, NF ou obra; linha do tempo |
| W4 | Agenda | Semana de coletas e rupturas, feriados (nacional, GO, Aparecida de Goiânia), domingos marcados, carga da prensa nos próximos 14 dias |
| W5 | **Exceções** | Caixa única de tudo o que exige decisão humana, com ação inline e responsável |
| W6 | Laudos | Colunas: Completo → Em conferência → Aguardando assinatura → Assinado → Entregue, com "pronto há Xh" |
| W7 | **Estúdio do laudo** | Fila · prévia que é o PDF · checklist (5.5) |
| W8 | **Assinatura (web)** | Baixar pendentes (ZIP); **arrastar N PDFs assinados**, cada um casado com o laudo pelo código embutido; resultado da verificação |
| W9 | Evidências | Galeria por CP/NF; gerar o **Anexo Técnico de Evidências** (interno, acesso registrado) |
| W10 | Clientes, Contatos & Obras | CRUD completo: editar, desativar, reenviar convite (falta hoje); N contatos por cliente com acesso por obra; grade quadra×lote |
| W11 | Equipe & Responsáveis | Usuários, papéis, capacidades, CREA, nº da ART por contrato ou por período (ART múltipla) [Q12] |
| W12 | Auditoria | `audit_log` com diff antes/depois, filtros, verificação dos resumos diários (8.6) |
| W13 | Configurações | Identidade do laboratório; tolerância interna de coleta (T, Q6); tolerâncias de ruptura e de temperatura do tanque **fixas pela norma** (exibidas, não editáveis; só estreitáveis com aprovação da RT); fatores de projeção; faixas de triagem interna; feriados; séries de numeração; **biblioteca de cláusulas aprovadas pela RT**; canais de notificação; liga/desliga por recurso de IA; prensa e calibração [Q20] |
| W14 | Ctrl+K | Busca CP, NF, obra ou laudo e executa ações; leitor de QR USB funciona como teclado |
| W15 | Concreteiras (Fase 5) | fcm, Sd, CV e n por concreteira × classe × idade; distribuição dos exemplares; Excel v2; copiloto |
| W16 | Relatórios (F2) | **Excel mensal concreteira × fck [ENG]** pelo `exportar-excel` atual, com os mesmos filtros de hoje (período, concreteira, fck, obra) |

### 4.5 Portal e páginas públicas

| # | Tela | Conteúdo |
|---|---|---|
| P1 | Primeiro acesso | Convite, definir senha, logo do laboratório |
| P2 | Início | Cartões por obra: laudos novos, próximo laudo previsto, CPs em cura (sem valores) |
| P3 | **Obra** | Linha do tempo das concretagens (data, quadra, lote, NF); grade quadra×lote; curva das idades assinadas com a linha do fck tracejada e neutra; laudos |
| P4 | Laudo | Versão web renderizada **do snapshot** (os mesmos números do PDF); baixar o PDF assinado; versões; copiar link de validação |
| P5 | Próximos laudos | Data prevista do laudo final de cada NF (maior idade + SLA de conferência e assinatura); idades intermediárias aparecem como "ensaiadas em 20/10 · resultado no laudo final", com o botão **"Solicitar laudo parcial"**, que cria tarefa interna (o parcial sai quando solicitado [ENG] e custa uma assinatura da RT) |
| P6 | Dossiê da obra | Período → índice em PDF + ZIP dos assinados |
| P7 | Equipe da empresa | O `cliente_admin` convida e define o acesso por obra |
| V1 | **Validação pública** | Selo (Autêntico · vigente / Substituído, com link para a vigente / Não encontrado), signatário, laudo completo do snapshot, **Conferir arquivo**, baixar o PDF assinado [Q19] |

### 4.6 Etiqueta (a "tela" física)

**Formato:** 50×30 mm, aplicada em **dois tempos com o mesmo código** [PROP/Q9]:
- **E1:** no molde, impressa na moldagem;
- **E2:** impressa na desforma ou na coleta e aplicada na **lateral** do CP, **fora da faixa central** (ex.: terço inferior), para não interferir na medida dos diâmetros à meia altura.

**Conteúdo:**
- QR com correção de erro **nível H** e carga curta (`R1:7KQ4M2XH`);
- código curto legível ao lado (`JARD·0412·3/4`) em Barlow 700 de cerca de 5 mm;
- sigla da obra, data e **hora** de moldagem, **idade-alvo em destaque**, NF e selo "M" quando o CP for mandatório.

**Renderização:** raster, então os acentos funcionam. Etiquetas antigas `CP-<hex>` continuam sendo lidas. A compatibilidade vale nos dois sentidos: até a virada, o `codigo_rastreio` dos CPs novos é o próprio payload curto (`R1:…`), para o app antigo também os encontrar (9.3).

### 4.7 Telas que deixam de existir

- Home "lista de obras".
- Dashboard de 4 números.
- Os 4 placeholders.
- "Agenda de coletas" com o que já venceu.
- Lista e detalhe de laudo empilhados.

### 4.8 Bipe universal: o que acontece ao bipar

| Estado do CP | Contexto | Ação |
|---|---|---|
| `moldado`, < 24h da moldagem | Campo | **Bloqueia:** "Libera às 07:10 (em 1h20)" [ext NBR 5738: ≥ 24h na fôrma; aceite operacional em Q6]. Desforma antecipada só como caso especial: RT autoriza com motivo e o fato entra no laudo. **Exceção:** CPs com idade-alvo ≤ 1 d seguem procedimento próprio definido pela RT (ex.: moldados no laboratório, ou transporte no molde) e não passam por essa trava [Q7] |
| `moldado`, janela aberta, obra da parada | Campo | Marca coletado (vibração curta) e conta na conciliação |
| `moldado`, depois do fim da janela [Q6] | Campo | Aviso âmbar "vai gerar ressalva: coletado 27h após a moldagem"; registra o atraso em horas |
| `moldado`, de outra obra | Campo | **Erro forte** (vibração longa, tom grave, vermelho): "CP de AGEHAB-Q17" |
| `coletado`, janela de ruptura aberta | Bancada | Carrega o CP no loop |
| `coletado`, antes da janela, não mandatório | Bancada | Âmbar "Antecipado em 2d: registrar?" com motivo em chips [ENG] |
| `coletado`, mandatório, antes da idade | Bancada | **Bloqueado [ENG]:** cadeado, "Libera em 10/11 08:30", sem contorno |
| `rompido` / `descartado` / `expurgado` | Qualquer | Linha do tempo (somente leitura) |
| Código antigo `CP-<hex>` | Qualquer | Aceito |

---

## 5. Telas-chave em detalhe

### 5.1 N2 · Hoje (Campo), tema Sol

```
┌──────────────────────────────────────────────┐
│ HOJE · ter 13/10      Sinal ▮▮▯  Impressora ✓│
│ [ Hoje ] [ Amanhã ]                     07:02 │
├──────────────────────────────────────────────┤
│ ┌ PRÓXIMA AÇÃO ─────────────────────────────┐ │
│ │ Coletar 6 CPs · JARDINS (Tarcal)          │ │
│ │ Libera 07:10 · ressalva após 07:10 qua*   │ │
│ │ ░░░░░░░░░░  abre em 8 min                 │ │
│ │ [ NAVEGAR ]            [ BIPAR CPs ]      │ │
│ └───────────────────────────────────────────┘ │
│ COLETAS · 4 paradas (ordem: liberação/prazo)  │
│ 1  07:10  JARDINS      6 CPs  ●●●●●●          │
│ 2  08:05  AGEHAB-Q17   4 CPs  ●●●● (!) risco  │
│ 3  09:30  ALPHA        6 CPs  ●●●●●●          │
│ 4  10:15  REB-CENTRO   2 CPs  ●●              │
│ AVISOS · Impressora: rolo com ~40 etiquetas   │
├──────────────────────────────────────────────┤
│  Hoje    Obras    ( BIPAR )    NFs    Eu      │
└──────────────────────────────────────────────┘
 * fim da janela = tolerância T a confirmar [Q6]
```

**Ordenação:**
1. Hora de liberação (moldagem + 24h).
2. Fim da janela.
3. Distância em linha reta como desempate.

Sem otimizador pago: com 4 a 6 paradas, uma lista ordenada por prazo mais deep link para Maps ou Waze captura quase todo o valor. Se um dia precisar de rota otimizada, usar VROOM, OR-Tools ou a Route Optimization API do Google, que **tratam janelas de tempo**. O `optimizeWaypointOrder` não trata.

**Estados:**
- vazio: "Nenhuma coleta hoje", com a próxima de amanhã;
- carregando: esqueleto;
- sem sinal: faixa âmbar "mostrando o plano das 18:00 salvo no aparelho" (cache de leitura);
- coleta feita por outra pessoa: o item sai com animação e o toast diz "RT coletou JARDINS 07:12".

**Componentes:** `NextActionCard`, `SlaTimer`, `RouteList`, `CpDots`, `StatusBar`, `TabBar` com FAB.

### 5.2 N5 · Nova concretagem: captura e revisão da NF

```
Passo 1/5 NOTA FISCAL              Passo 2/5 REVISAR
┌──────────────────────────┐       ┌──────────────────────────────────┐
│ [visor; bordas detectadas│       │ NF 45.120 série 1   ✓ DANFE      │
│  e captura automática]   │       │ Emitente TARCAL     ✓ DANFE(CNPJ)│
│ Chave DANFE lida ✓       │       │ Emissão 13/10 · saída 07:52 ◆IA✓ │
│ Modelo Tarcal            │       │ fck 30 MPa              ◆IA✓     │
│ [Preenchimento manual]   │       │ Volume 8,0 m³           ◆IA✓     │
└──────────────────────────┘       │ Slump proj. 10 ± 2 cm   ◇IA confira│
                                   │ Traço T2 · Aditivo —    ◇IA confira│
 ✓ DANFE  = determinístico          │ Placa ABC1D23 ◆IA✓ Lacre 88812 ◆IA✓│
 ◆ IA ✓   = valor achado no texto   │ Obra sugerida: ALPHA (GPS+endereço)│
            lido no aparelho        │ ⚠ fck NF 30 = fck do elemento ✓   │
 ◇ confira= divergência/fora de     │ [Refazer foto]   [CONFIRMAR 12]   │
            faixa (borda tracejada) └──────────────────────────────────┘
```

**Regras:**
- **Chave de acesso da NF-e/DANFE** (44 posições, código de barras; pode conter letras na parte do CNPJ, conforme a IN RFB 2.229/2024 e a nota técnica de adaptação da NF-e [ext]), lida no aparelho de forma determinística: dá NF, série, CNPJ do emitente e ano/mês. A concreteira é identificada **pelo CNPJ**, e a mesma chave **bloqueia NF duplicada**.
- **Sem DANFE** (romaneio ou ticket de remessa): caminho só por LLM, com todos os campos tracejados até a conferência.
- **Confiança** vem de **validadores** e nunca da autodeclaração do modelo:
  - CNPJ numérico ou alfanumérico, com o DV pela regra nova;
  - fck dentro das classes usuais;
  - volume entre 0,1 e 20 m³ (`ranges.ts`);
  - data ≠ futuro;
  - placa no padrão Mercosul (AAA9A99) **ou** antigo (AAA9999);
  - sequência de NF da Tarcal;
  - ML Kit no aparelho encontrando o mesmo valor no texto da imagem.
- **Obrigatórios** (NF, fck, volume) bloqueiam o "Confirmar" enquanto estiverem tracejados e não tocados [ENG].
- **Prazos:** 10 s de timeout e 3 tentativas [ENG]. Se a nuvem demorar, o app oferece chips do texto lido no aparelho ("tocar no campo, tocar no chip").
- **Imagem guardada** no bucket `notas-fiscais`.
- **Alertas:**
  - R10: fck da NF ≠ fck de projeto do elemento;
  - registro factual do tempo entre o **início da mistura (1ª adição de água, do documento de entrega)** e a moldagem; aviso **interno** quando passar do limite de transporte e descarga da NBR 7212 [ext; Q12]. Nunca vira juízo sobre a concreteira no laudo sem cláusula aprovada.

**Passos 3–5:**
- **Slump:** entrada em cm, gravação em mm. Fora da tolerância do projeto gera aviso e ressalva [ENG].
- **Moldagem:**
  - atalhos e idades livres [ENG]; 2 mandatórios nas maiores idades [ENG/Q8];
  - **calendário** que avisa, por exemplo: "moldagem sex 13/11 → 7d cai em sex 20/11, feriado nacional (Consciência Negra)";
  - **hora de moldagem** = hora do "Salvar", editável para trás até um limite, com `cadastro_tardio` e justificativa [Q5].
- **Etiquetas:** impressora lembrada, checklist por etiqueta, timeout de 5 s, reimpressão sem duplicar o código [ENG].

**Meta:** ≤ 90 s de interação, da foto até "Concluir", sem contar o tempo de impressão.

### 5.3 N6 · Coleta com conciliação

```
┌───────────────────────────────────────────────┐
│ < Coletas   PARADA 2 de 4 · AGEHAB-Q17         │
│ Libera 08:05 · janela até 08:05 qua* ███░░░░░  │
├───────────────────────────────────────────────┤
│            BIPADOS  3 / 4                      │
│  ✓ AGEH·0098·1   7d    moldado 12/10 08:05     │
│  ✓ AGEH·0098·2   7d                            │
│  ✓ AGEH·0098·3  28d M                          │
│  ○ AGEH·0098·4  28d M   ← falta                │
│ [ câmera contínua, metade da tela ]            │
├───────────────────────────────────────────────┤
│ [ RESOLVER FALTANTE ]     [ CONCLUIR ] (bloq.) │
└───────────────────────────────────────────────┘
 Resolver: ( Etiqueta ilegível → código curto  )
           ( CP danificado → descartar: motivo + foto )
           ( Ficou na obra → reagendar          )
           ( Sem etiqueta → associar manualmente, com foto, confirmação da RT )
```

- **Imprimir E2 (lateral)** fica disponível na desforma, com o mesmo código [Q9].
- **Associação manual (transição do canetão):** busca **filtrada** pelos CPs pendentes da parada, foto obrigatória e confirmação da RT. **Nada de IA "lendo" o canetão** para escolher o CP.

### 5.4 N11 · Bancada (tema escuro; celular na vertical como layout v1, tablet na horizontal se aprovado)

```
┌─ BANCADA · Prensa 1 · ter 20/10 13:40 ───── Wi-Fi OK · Tanque hoje 23,4 °C ✓ ─┐
│ ROMPER HOJE  18/42           │ JARD·0412·1/4 · 7 dias · fck 30 · NF 45.120    │
│ [Todos][Tarcal][Outros]      │ Tarcal → Res. Jardins · Q12 L04 · 100×200       │
│ FECHA PRIMEIRO               │ Moldado 13/10 08:30 · janela 7d ±6h:            │
│ > JARD·0412·1  7d  ⏱14:30    │   20/10 02:30 → 14:30  [DENTRO · fecha em 50 min]│
│   JARD·0412·2  7d  ⏱14:30 par│ ┌─────────────────────┬────────────────────────┐ │
│   AGEH·0098·3 28d  ⏱08:05+1d │ │ d1      100,1 mm    │       27,44  MPa       │ │
│   REB·0033·2  14d  ATRASADA  │ │ d2       99,9 mm    │ ███████████░░ 91% fck  │ │
│   ...                        │ │ h       200,5 mm    │ aos 7d · Proj. 28d 39,2│ │
│                              │ │ Peso   3.712 g      │ (estimativa · interno) │ │
│ Fecham antes das 15:00: 3    │ │ ρ 2,36 g/cm³ ✓      │ carga 21.977 kgf       │ │
│                              │ └─────────────────────┴────────────────────────┘ │
│                              │  [ 7 ][ 8 ][ 9 ]   FRATURA                      │
│                              │  [ 4 ][ 5 ][ 6 ]   [Cabeça][ Face ][Parcial]    │
│                              │  [ 1 ][ 2 ][ 3 ]   [ Total][Cisalh][Trinca ]    │
│ [ FECHAR BANCADA ]           │  [ , ][ 0 ][ ⌫ ]   Foto antes ✓(QR ok) depois ○ │
│                              │  [ REGISTRAR E PRÓXIMO → JARD·0412·2 ]          │
└──────────────────────────────┴─────────────────────────────────────────────────┘
```

**No celular (layout v1 obrigatório, porque a engenheira disse que a digitação no celular atende [ENG]):** a fila fica recolhida num cabeçalho ("18/42 · próximo fecha 14:30"); o MPa continua em destaque; teclas de 72–88 dp; o loop corre em passos (medidas → carga → fratura → fotos). O tablet acima é evolução, se o S0 provar ganho e houver aceite [Q3].

**Loop:**

1. **Bipar.** Câmera do aparelho. Um leitor USB/BT funciona como teclado se o piloto provar necessidade.
2. **Foto "antes".** O app **decodifica o QR na própria foto** e bloqueia se não for o CP carregado. Marca d'água (data, hora, cidade, GPS) gerada por `packages/shared/src/prensa/watermark.ts`; sha256 e EXIF guardados.
3. **d1, d2 (ortogonais, medidos à meia altura, fora da etiqueta), h, peso.**
   - Teclas de 88 dp com espaçamento de 12 dp; máscara decimal ("1001" → 100,1).
   - **Nenhum pré-preenchimento e nenhum "repetir o anterior".**
   - Resolução de 0,1 mm [ext NBR 5739].
   - A massa específica é calculada ao vivo e alerta fora de 2,2–2,6 g/cm³ [ext/Q22]. Isso pega troca de CP e erro de digitação, e dá uma função ao campo peso.
4. **Carga em kgf.**
   - MPa ao vivo pelo `calcMpa` atual, com `tabular-nums`.
   - Abaixo de 1.000 kgf: "Parece kN? 215,5 kN = 21.975 kgf [Converter]" (fator 1000/9,80665 = 101,97, a partir de `KGF_TO_NEWTON` em `engineering/mpa.ts`; `carga.ts` só tem o limiar). A leitura original e a unidade digitada são guardadas.
   - Plausibilidade também no **MPa**: < 0,3·fck ou > 2,5·fck pede confirmação. O limiar em kgf sozinho não pega kN digitado num CP 150×300 de alta resistência (60 MPa ≈ 1.060 kN, que entraria como 1.060 kgf = 0,6 MPa sem aviso), e depois dos 5 s o erro só se corrige por expurgo.
5. **Leitura só interna.**
   - Fato: **"≥ fck"**. Faixas de **triagem interna**, definidas pela RT em `lab_settings` (padrão proposto: 95%): **"95–100% do fck"** (âmbar) e **"< 95% do fck · comunicar RT"** (vermelho), identificadas na tela como "critério interno do laboratório", sem relação com a aceitação da NBR 12655.
   - Idade inicial: **"Proj. Nd X MPa (estimativa)"**, com N = idade de controle do fck da concretagem (`idade_controle_fck`, 28 d por padrão; o projeto pode fixar outra, ex.: 63 d com CP III ou CP IV [Q8]).
   - As palavras "Conforme" e "avaliar reforço" não aparecem (seção 13).
6. **Fratura.**
   - **Desenhos técnicos** de 120 dp dos tipos da NBR 5739 (A–G [ext]), com o rótulo do laboratório como apelido (`packages/shared/src/constants/fratura.ts`). Grava-se, por ruptura, o **tipo da norma** além do rótulo interno, e o laudo imprime o tipo da norma (mapeamento aprovado pela RT [Q21]).
   - A sugestão por IA roda **em modo sombra** e não aparece na tela. Quando a concordância medida chegar a ≥ 85%, passa a aparecer como contorno, **nunca pré-selecionada**.
   - "Ruptura de Cabeça" (fratura no topo, como a da FOTO) dispara o aviso interno "verificar preparo das bases (retífica/capeamento)" [Q21].
7. **Foto "depois"** e **Registrar e próximo.**
   - Commit adiado de 5 s com "Desfazer"; bipar o próximo CP confirma na hora.
   - Depois disso o resultado é imutável (trigger da 0018). Erro posterior só se corrige por expurgo com motivo [ENG].
   - O app avança para o **par**.

**Janelas de idade** [ext NBR 5739, tabela de tolerâncias]: constantes em `packages/shared`, **somente leitura**. O laboratório só pode *estreitá-las*, com aprovação registrada da RT; nunca alargá-las.
- 24h ±0,5h; 3d ±2h; 7d ±6h; 28d ±24h; 63d ±36h; 91d ±48h;
- **simétricas em torno da hora nominal** (moldagem + idade);
- fora da janela: faixa vermelha, gravação de `idade_real_horas` e `dentro_janela=false`. O laudo **sempre** imprime a idade real e uma nota automática e não removível: *"CP ensaiado com X d Y h, fora da tolerância de ±Z h da NBR 5739 para N d"*. A RT aprova o texto da cláusula, não a existência da nota [Q7].
- *Atenção operacional:* com moldagem de manhã e prensa à tarde, um CP de 7d moldado às 08:30 fica fora de ±6h depois das 14:30. Por isso a fila é ordenada pela janela que fecha primeiro [Q7]. CPs de 3d (±2h) e 24h (±0,5h) exigem prensa no horário correspondente ao da moldagem: a agenda reserva a prensa por janela, não por turno.

**Estados especiais:**
- mandatório antes da idade: cadeado em tela cheia;
- descartar ou expurgar: no menu "…", com motivo. O laboratorista só **sugere** expurgo;
- sem sinal: "Registrar" desabilitado, digitação mantida, nova tentativa automática. A Bancada fica no Wi-Fi do laboratório.

**Meta:** ≤ 40 s **de interação** por CP. **Não inclui o carregamento**: a 0,45 ± 0,15 MPa/s [ext NBR 5739], um CP de 30 MPa leva de 50 a 100 s na prensa. A métrica nunca pode incentivar carregar mais rápido.

### 5.5 W7 · Estúdio do laudo (web)

```
┌ Laudos ▸ Estúdio ──────────────────────────────────────────────────────────────┐
│ FILA (9)         │ PRÉVIA (é o PDF)                      │ CHECKLIST           │
│> N°004AGEHAB 5h  │ ┌───────────────────────────────────┐ │ ✓ Cobertura 7d+28d  │
│  45120 Tarcal 3h │ │ [logo lab] RESULTADO DOS ENSAIOS  │ │ ✓ Nº N°004AGEHAB    │
│  45121 Tarcal 3h │ │ Relatório N°004AGEHAB · v1        │ │   (sequência; editar)│
│  ...             │ │ Cliente · Obra · ART nº · fck 30  │ │ ✓ NF conferida (IA→ │
│ Devolvidos (1)   │ │ DATA|QD|LT|NF|LACRE|CP|kgf/MPa/FCM│ │   sócio, 0 pend.)   │
│                  │ │ ...matriz por idade (PRD §11)...  │ │ ! Par 28d diverge   │
│ [Lote Tarcal]    │ │ Detalhe por CP: d, h, idade real, │ │   [Manter+motivo]   │
│                  │ │ data, fratura, preparo das bases  │ │   [Pedir expurgo RT]│
│                  │ │ [gráfico crescimento + linha fck] │ │ ✓ Ressalvas (1) regra│
│                  │ │ Considerações (cláusulas aprov.)  │ │ ✓ Conteúdo NBR 5739 │
│                  │ │ RT+CREA · Laboratorista · Moldador│ │ ✓ Prensa calibrada  │
│                  │ │ [QR] RASCUNHO — SEM VALIDADE  1/2 │ │ ◻ Agrupar NFs obra  │
│                  │ └───────────────────────────────────┘ │ [ENVIAR P/ ASSINAR] │
└──────────────────┴───────────────────────────────────────┴─────────────────────┘
```

**Prévia:** o `laudo-service` compila o Typst a partir de `buildLaudoReport` e o pdf.js exibe o resultado. Clicar num valor leva à origem (CP, NF, foto).

**Checklist determinístico:**
- **Cobertura:** guarda `CPS_PENDENTES`.
- **Número:**
  - sequência por cliente; para a Tarcal, o nº da NF [ENG];
  - unique no banco por `(laboratorio_id, cliente_id, numero, versao)`, só para números definitivos (8.4): a v2 herda o número; parcial e final da mesma NF diferenciam-se por sufixo (`45120-P7` / `45120`) [Q4];
  - "RASCUNHO" bloqueia.
- **Campos de IA:** nenhum ainda pendente.
- **Anomalias:**
  - R4 (amplitude entre os 2 CPs da idade acima de um limiar interno aprovado pela RT [Q22]). O anexo estatístico da NBR 5739 [ext] avalia o desempenho do ensaio sobre um conjunto de exemplares, não um par isolado: ele vira o **indicador mensal de CVe** no painel de qualidade;
  - R5 (7d > 28d);
  - massa específica;
  - ruptura fora da janela;
  - NFs agrupadas com fck diferentes.
- **Ressalvas e considerações:** **regra → cláusula da biblioteca aprovada** (`clausulas.condicao`). **Nenhum texto livre de IA.**
- **Conteúdo NBR 5739** [ext/Q16]:
  - dimensões, idade e data reais;
  - tipo de fratura (tipo da norma);
  - preparo das bases;
  - prensa e calibração.
- **Responsabilidade técnica** (Lei 6.496/77 e resoluções do Confea [ext]): nº da ART vigente (por contrato ou ART múltipla do período).
- **Signatários:** derivados dos eventos (quem moldou, quem rompeu).

**Ações:**
- **Enviar para assinatura:** `em_conferencia → pronto_assinatura`, congelamento do snapshot (JSON + sha256), PDF final (PDF/A-2b se aprovado em Q2), aviso à RT.
- **Devolvido pela RT:** volta a `em_conferencia` com o comentário.
- **Correção:** v2 com diff visual. A página pública segue mostrando a última **assinada**.

**Atalhos:** J/K, Shift+Enter (enviar), E (editar o campo focado).

**Medida:** horas entre "completo" e "enviado para assinatura".

### 5.6 N13 + W8 · Assinatura e verificação

```
┌───────────────────────────────────┐   ┌────────────────────────────────────────┐
│ < Hoje    ASSINAR (3)              │   │ VERIFICANDO O ARQUIVO ASSINADO          │
│ N°004AGEHAB · pronto há 11h        │   │ ✓ Assinatura PAdES (/ByteRange cobre    │
│ AGEHAB · 4 NFs · 7d+28d · 1 ressalva│  │   o arquivo inteiro)                    │
│ FCM 28d 32,4 · fck 30 (só números) │   │ ✓ Original preservado: primeiros N bytes│
│ NF: 11 campos IA, conferidos       │   │   = original.pdf (sha256 confere)       │
│ Anomalia: par 28d → mantido (motivo)│  │ ✓ Cadeia gov.br válida (AC Gov. Federal)│
│ [ VER PDF ]  [ ASSINAR NO GOV.BR ] │   │ ✓ Signatário: [nome], CPF ***.123.***-**│
│ ───────────────────────────────── │   │   = RT cadastrada (CREA-GO do cadastro) │
│ 45120 Tarcal · pronto há 3h  ...   │   │ ✓ Código de verificação confere         │
└───────────────────────────────────┘   │ [ PUBLICAR E AVISAR O CLIENTE ]         │
                                        └────────────────────────────────────────┘
```

**Fluxo no celular:**
1. "Assinar no gov.br" salva `N004AGEHAB_v1.pdf`.
2. Abre o assinador no **navegador do sistema** (Custom Tabs / SFSafariViewController). Não usar `ASWebAuthenticationSession`, que serve para OAuth e não para baixar arquivo.
3. A RT assina e volta pelo menu **Compartilhar → Rastro** (intent filter no Android, share extension no iOS).

**Na web:** "Baixar pendentes (ZIP)" e depois **arrastar N PDFs**. Cada arquivo é casado primeiro pelo QR e pelo `codigo_verificacao` impresso no rodapé; as palavras-chave do documento (`document(keywords: …)` do Typst, que vão para o XMP como `pdf:Keywords`) servem só de atalho, porque um assinador que reescreva o arquivo pode descartá-las.

**Verificação** (pyHanko no `laudo-service`):
- cada `/Sig` válida para a sua revisão; a **última** cobre o arquivo inteiro; entre revisões, só se admitem alterações de assinatura e anotação (análise de diferenças do pyHanko); o original é prefixo de todas;
- **prefixo:** `sha256(assinado[0:len(original)]) == sha256(original)`, porque a atualização incremental preserva o original;
- **cadeia:** a assinatura gov.br é *eletrônica avançada* (Lei 14.063/2020) e encadeia na **AC do Governo Federal**, **não** na raiz ICP-Brasil. O validador confia nessas raízes, ou consulta o validador do ITI (`validar.iti.gov.br`). Validar contra a ICP-Brasil rejeitaria assinaturas legítimas;
- **signatário:** nome e CPF vêm do certificado; o **CREA vem do cadastro** `responsaveis_tecnicos`, não da assinatura.

**Falhas:**
- "Arquivo sem assinatura";
- "Este PDF não é o N004 que o Rastro gerou";
- "Signatário diferente da RT": vale como 2ª assinatura se habilitada [Q20];
- se o assinador reescrever os bytes: verificação **parcial** (texto extraído + código embutido + número de páginas), marcada assim e auditada [Q2].

**2ª assinatura:** no **mesmo PDF**; **por convenção**, o elaborador assina antes e a RT por último, para que a assinatura dela cubra o arquivo final. Ambos respondem pelo que assinam.

**Meta:** < 2 min de interação por laudo.

### 5.7 V1 · Validação pública e W1 · Central (resumo)

**Validação.**
- HTML leve renderizado no host web do laboratório (função serverless) a partir do JSON que a `validar-laudo` v2 lê do **snapshot da última versão assinada**. Edge Function não serve HTML no domínio padrão `*.supabase.co` (a resposta vira `text/plain`); a alternativa é o domínio próprio do Supabase, pago (8.1). Carrega em < 1 s no 4G.
- Selo grande, signatário, versão (vigente ou substituída, com link), dados completos [ENG P25] e hash curto.
- **"Conferir arquivo":** SHA-256 calculado no navegador. As respostas são "idêntico ao emitido" ou "**diferente do emitido** (pode ter sido salvo novamente ou alterado; peça o original ao laboratório)", para evitar falso alarme de fraude.
- Limite de requisições persistente (tabela, não memória do isolate).
- Nunca mostra rascunho nem v2 não assinada.
- **Domínio do laboratório.** Exemplo: `laudos.<domínio-do-lab>.com.br/v/K7P2-9QXM-4T` (10 caracteres, 8.6).
- A rota antiga `/validar/:codigo` continua resolvendo para sempre, em **todos** os hosts já impressos em QR (8.8).

**Central de Operações.**
- KPIs clicáveis: em obra, em cura, romper hoje, para assinar, entregues hoje.
- Quadro com cartões **por NF** (`CpDots`, `SlaTimer`, responsável), que mudam de coluna com animação.
- Trilho de alertas e feed ao vivo ("14:22 laboratorista rompeu JARD·1").
- "Ao vivo · último evento há 12 s".
- **Meta:** responder em menos de 5 s "em que pé está cada NF".

---

## 6. Identidade visual e design system

### 6.1 Conceito: "Concreto & Sinalização"

O material do laboratório é cinza (concreto, aço, pó). A linguagem de segurança de obra é amarelo sobre preto. O Rastro usa:
- **neutros de concreto levemente quentes**;
- **grafite** para a estrutura;
- **amarelo sinalização** com regra rígida: **amarelo = você precisa agir agora**. Nunca é decoração. No máximo **um elemento amarelo por tela** (a próxima ação), fora os `CpDots`; os demais primários são grafite.

A **violeta** é reservada **exclusivamente** para "valor sugerido por IA, ainda não confirmado".

O laudo e o portal destacam a **marca do laboratório**. "Rastro" é o nome interno do sistema.

### 6.2 Paleta

As razões de contraste foram calculadas (WCAG 2.x). Texto normal exige ≥ 4,5:1. "Texto grande" é ≥ 24 px regular ou ≥ 18,66 px (14 pt) negrito. Elementos não textuais exigem ≥ 3:1.

**Neutros "Concreto"**

| Token | Hex | Uso |
|---|---|---|
| concreto-0 | `#FFFFFF` | superfície elevada (claro) |
| concreto-25 | `#FAFAF8` | fundo do app (claro) |
| concreto-50 | `#F3F3F0` | seções, zebra |
| concreto-100 | `#E7E7E2` | bordas suaves |
| concreto-200 | `#D2D2CB` | divisores (não é texto) |
| concreto-400 | `#8E8E86` | **só ícones** (3,3:1 sobre branco) |
| concreto-500 | `#6E6E67` | texto secundário (5,1:1 sobre branco; 4,9:1 sobre 25) |
| concreto-600 | `#55554F` | texto de apoio, estados terminais (7,2:1) |
| concreto-800 | `#2A2A27` | superfície 2 (escuro) |
| concreto-900 | `#1B1B19` | superfície (escuro) |
| concreto-950 | `#111110` | fundo da Bancada |
| grafite | `#17181A` | texto principal (17:1 sobre 25), sidebar, cabeçalho do laudo |

**Ação e marca**

| Token | Hex | Uso / contraste |
|---|---|---|
| sinal-500 | `#FFC21A` | só a ação do estado "aja agora" (a "Próxima ação", o Bipar com janela aberta, o Registrar da Bancada) e foco; os demais primários de Campo e Bancada são grafite. Grafite sobre ele: **11,0:1 (AAA)**. **Nunca texto amarelo sobre branco** (1,6:1) |
| sinal-600 | `#E6A800` | pressionado (8,4:1 sob grafite) |
| sinal-50 | `#FFF7D6` | linha "requer ação" |
| cobalto-600 | `#2F54EB` | só links, seleção e info (o primário do Escritório é grafite, para não repetir o "app azul" de hoje). 5,9:1 sobre branco; 5,1:1 sobre `#ECF0FE` |
| ia-600 | `#5B3FD9` | selo "IA · confira" (6,7:1 sobre branco; 5,7:1 sobre `#EFEBFF`), borda tracejada |

**Status semântico** (sempre com ícone e texto, nunca só cor)

| Status | Texto (claro) | Fundo | Contraste texto/fundo | Escuro (sobre `#1B1B19`) |
|---|---|---|---|---|
| ≥ fck / OK | `#157A45` | `#E3F5EA` | 4,75:1 | `#3DD68C` (9,2:1) |
| Atenção | `#A85A00` | `#FFF0DB` | 4,54:1 | `#FFA94D` (9,1:1) |
| Crítico / atrasado | `#B3261E` | `#FDE8E8` | 5,57:1 | `#FF6B6B` (6,2:1) |
| Info / em andamento | `#2F54EB` | `#ECF0FE` | 5,14:1 | `#7C9BFF` (6,6:1) |
| IA não confirmada | `#5B3FD9` | `#EFEBFF` | 5,70:1 | `#B3A4FF` (7,9:1) |
| Terminal (descartado, expurgado, substituído) | `#55554F` | `#F3F3F0` | ≥ 6:1 | `#9C9C94` (6,2:1) |

**Fases do CP** (paleta categórica dos `CpDots`, do quadro e da linha do tempo; a forma também muda)

| Fase | Cor | Forma | Contraste sobre branco |
|---|---|---|---|
| Em obra (moldado) | terra `#9C6B3F` | ponto cheio | 4,6:1 |
| Coletar / romper hoje | sinal `#FFC21A` **com contorno grafite de 1,5 px** | ponto cheio | contorno garante ≥ 3:1 |
| Em cura | água `#1590A8` | ponto vazado | 3,8:1 |
| Rompido, aguardando outras idades | `#55554F` | ponto cheio | 7,2:1 |
| Laudo (conferência/assinatura) | cobalto `#2F54EB` | quadrado | 5,9:1 |
| Assinado / entregue | `#1E9E5A` | check | 3,5:1 |
| Atrasado (sobreposição) | anel `#E5383B` | anel | ≈ 4,2:1 |

Validação de daltonismo (deuteranopia e protanopia) no S0 com simulador. Forma mais rótulo garantem leitura sem cor.

**Gráficos:** a linha do fck é **sempre neutra** (grafite tracejado, rotulada). Vermelho sugeriria uma reprovação que o laboratório não emite.

### 6.3 Temas por contexto e modo escuro

| Tema | Onde | Fundo | Característica |
|---|---|---|---|
| **Sol** | App Campo | `#FAFAF8` / `#FFFFFF` | Contraste máximo sob sol, bordas de 2 px, sem cinza claro em texto |
| **Bancada** | Modo prensa | `#111110` / `#1B1B19` | "Instrumento": MPa branco (18,9:1), só a próxima ação em amarelo, menos reflexo à noite |
| **Escritório** | Web interno | Claro por padrão; **escuro completo** opcional (`prefers-color-scheme` + seletor) | Denso, 3 níveis de superfície; primário grafite (`#17181A`, texto branco); amarelo só para ação urgente; cobalto só para links e seleção. No Figma do S0, o Escritório aparece lado a lado com o atual para o aceite do dono |
| **Portal** | Cliente e validação | Claro, com logo do laboratório | Espaçoso, linguagem simples |

O escuro é implementado por **tokens semânticos** (`bg`, `surface`, `surface-2`, `line`, `text`, `text-2`, `accent`, `ai`…) e não por `dark:` espalhado. Isso corrige a contradição atual: `index.html` declara `color-scheme: light dark`, mas só existe o claro.

### 6.4 Tipografia

| Família | Uso |
|---|---|
| **Barlow Semi Condensed** 600/700 | Números grandes (MPa, timers, KPIs), títulos, código curto. Nasceu da sinalização rodoviária: legível à distância e compacta |
| **IBM Plex Sans** 400/500/600 | Texto, tabelas, formulários; ótimos acentos pt-BR |
| **IBM Plex Mono** 500 | NF, chave DANFE, hashes, códigos de verificação |

Todas são OFL e vão embutidas no app (expo-font), na web e no PDF.

| Escala | Escritório (px) | Campo (sp) | Bancada (sp) |
|---|---|---|---|
| Legenda | 12/16 | 16/22 | 18/24 |
| Corpo / tabela | 13–14/20 | 18/26 | 20/28 |
| Rótulo | 13/18 600 | 20/26 600 | 24/30 600 |
| Título | 20–24 | 28 | 32 |
| Número de destaque | KPI 40 Barlow | Timer 40 Barlow | **MPa 96 Barlow 700**; input 40 |

Números sempre em `tabular-nums`, com vírgula decimal e ponto de milhar. Datas sempre em dd/mm e HH:mm **locais**.

### 6.5 Densidade, grid, forma

- **Grid** de 4 pt.
- **Alvos mínimos:**
  - Escritório: 32 px (linha de tabela de 36 px);
  - Campo: 56 dp;
  - Bancada: 72 dp (teclas de 88 dp, espaçamento ≥ 12 dp).
- **Raios:** 6 (Escritório), 12 (Campo), 16 (teclas da Bancada).
- **Elevação:** borda de 1 px e sombra muito sutil, em 3 níveis.
- **Layout web:**
  - sidebar de 240 px (recolhe para 64);
  - conteúdo fluido até 1600 px;
  - drawer de 480–640 px.
  - Acaba o `max-w-4xl`.

### 6.6 Iconografia e ilustração

- **Phosphor Icons:** Regular no Escritório, **Bold** em Campo e Bancada. **Zero emoji** (substitui os cerca de 25 atuais).
- **Set técnico próprio "Rastro"** (cerca de 18 ícones, traço de 2 px, grade de 24): CP cilíndrico, moldes 100×200 e 150×300, cone de slump, prensa, tanque, etiqueta QR, betoneira, NF/DANFE, laudo, selo de assinatura, cadeado de mandatório, janela de ruptura, termômetro do tanque.
- **Desenhos de fratura dos tipos da NBR 5739 (A–G [ext]):** silhuetas de cilindro com as linhas de ruptura, com os 6 rótulos do laboratório como apelidos. Como o mapeamento 6 → 7 não é um para um, o laudo imprime o **tipo da norma**, e só depois de o mapeamento ser aprovado pela RT [Q21]. 120 dp no seletor, 24 px em tabelas.
- **Estados vazios:** traço técnico monocromático, sem clip-art.

### 6.7 Componentes

| Grupo | Componentes |
|---|---|
| **Primitivos** (web: Radix/shadcn com código próprio; nativo: kit próprio) | Button (primário, secundário, ghost, destrutivo); Input; `NumericField` (máscara pt-BR); Select; Combobox; `DateTimeField` (fuso local); Tabs; Drawer/Sheet; Dialog; Toast com **Desfazer**; Tooltip; Skeleton; Badge |
| **Domínio** | `CpChip`; `CpDots`; `NfPipelineBar`; `SlaTimer` (ok → atenção → crítico, pulso sutil < 1h); `AgeStrip`; `CpTimeline`; `MpaReadout` (valor, % do fck, projeção, faixa de triagem interna); `BigKeypad`; `FracturePicker`; `ScanBar`/`ScanResultSheet`; `ReconciliationCounter`; `LabelPreview`; `ProvenanceChip` (DANFE / IA ✓ / IA confira / manual / editado); `SignatureVerificationCard`; `ChecklistItem`; `AuditDiff`; `EvidenceStrip` |
| **Dados** | `DataTable` (TanStack: ordenar, filtrar, fixar colunas, paginação no servidor); `KpiStrip`; `OpsBoard`; `StrengthChart` (curva e dispersão com a linha do fck); `QuadraLoteGrid`; Sparkline. Gráficos web com Recharts (já em `apps/web`) ou visx; nativo com Victory Native/Skia |
| **Padrão de estados** | Todo componente com dados trata **carregando, vazio, erro e ao vivo**, como o `DashboardCard` atual |
| **Documentação** | Storybook com todos os estados; regressão visual com Playwright |

### 6.8 Movimento, háptica, som

- **Durações:** 90 ms (micro), 160 ms (entrada), 240 ms (painéis); `cubic-bezier(0.2,0,0,1)`. Respeita `prefers-reduced-motion`.
- **Movimento só com informação:**
  - cartão mudando de coluna;
  - linha alterada por outra pessoa realçada em cobalto-50/info (fade de 1,2 s); é informação, não pede ação, então não usa amarelo;
  - selo de IA "assentando" de violeta para neutro ao ser aceito.
- **Na Bancada, número não anima.** O MPa aparece instantâneo.
- **Háptica e som** (configuráveis, porque a prensa é ruidosa):
  - bipe OK: pulso leve + tom agudo;
  - bipe errado: pulso longo + tom grave;
  - registro: pulso médio.

### 6.9 Acessibilidade

- AA em todo texto; **AAA** nos elementos críticos de Campo e Bancada (MPa, timers, botões).
- Foco visível: anel cobalto de 2 px com 2 px de offset.
- Leitura de tela nos rótulos dos `CpDots` e dos estados.
- Fonte escalável até 130% no app sem quebrar a Bancada.
- Testes com a **luva de malha da foto** e **sob sol** (S0 e S7).

### 6.10 O laudo PDF: conteúdo primeiro, depois layout

**Ordem:** primeiro fechamos o **conteúdo normativo** com a engenheira (S0, Q1, Q16), depois desenhamos.

**Layout único [ENG]** em A4 retrato, **PDF/A-2b se aprovado em Q2** (senão PDF 1.7 com permissões restritas, sem PDF/A):
1. **Cabeçalho em todas as páginas:** logo do laboratório, razão social, CNPJ, endereço; "Relatório N°…" em Barlow; fio de 0,75 pt.
2. **Identificação:** cliente, obra, endereço, contato, **nº da ART**, fck e idade de controle do fck, slump alvo ± tolerância, moldes, nº de CPs, concreteira, período de moldagem, normas de referência (NBR 5738, NBR 16889, NBR 5739).
3. **Matriz de resultados** fiel ao PRD §11:
   - `DATA | QUADRA | LOTE | NF | LACRE | CP | [kgf | MPa | FCM] por idade`;
   - Plex Sans 8 pt, algarismos tabulares;
   - CP expurgado tachado, com nota de rodapé;
   - com ≥ 5 idades, um segundo bloco (o layout continua único).
4. **Detalhamento por CP** [ext NBR 5739/Q16]: d médio, h, h/d (e fator, se h/d < 1,94 [ext]), **base de cálculo da área (medida/nominal)**, data e idade real do ensaio (com a nota obrigatória quando fora da tolerância, 5.4), carga, MPa, tipo de fratura (tipo da norma), preparo das bases.
5. **Gráfico de crescimento:** FCM por idade e pontos dos CPs, com a linha do fck neutra (geometria de `packages/shared/src/laudo/chart-svg.ts`, agora com texto).
6. **Considerações e ressalvas:** só cláusulas aprovadas, escolhidas por regra. A cláusula-base substitui o texto atual de `ressalvas.ts`, que cita a norma errada (1.3).
7. **Assinaturas:** área para a assinatura visível do gov.br da RT, com nome e CREA impressos; laboratorista e moldador por nome; elaborador opcional.
8. **Equipamento:** prensa e validade da calibração [Q20].
9. **Rodapé em todas as páginas:** QR curto, código legível, "Página X de Y", "Os resultados referem-se exclusivamente às amostras ensaiadas. Reprodução parcial proibida."

**O que fica fora:**
- **Sem fotos [ENG].**
- **Sem caixas de "Resumo FCM × fck".** Seriam veredito implícito, e a média de 2 CPs não é critério de aceitação da NBR 12655 [ext].
- **Sem texto gerado por IA.**

**Impressão:** legível em escala de cinza; a cor fica só nos filetes. Fontes embutidas; o `codigo_verificacao` vai em `document(keywords: …)` (XMP `pdf:Keywords`; o Typst não grava propriedades XMP próprias), no rodapé e no QR.

**Anexo Técnico de Evidências** (interno, sob demanda, registrado na auditoria): por CP, fotos antes/depois com marca d'água, sha256, EXIF, operador, linha do tempo e origem da fratura (escolhida; sugestão aceita ou não).

### 6.11 Por que não vai parecer "simples" nem "feio"

1. **Identidade própria** (grafite, amarelo sinalização, Barlow, ícones técnicos) no lugar do azul padrão com fonte do sistema e emojis.
2. **Informação viva**: timers, quadro em tempo real e linha do tempo, no lugar de listas estáticas.
3. **Três densidades**: o escritório ganha tabela, drawer, Ctrl+K e atalhos.
4. **Visualização de dados em todo lugar**: andamento por NF, curvas no portal, grade quadra×lote, carga da prensa.
5. **Bancada com cara de instrumento de medição.**
6. **O laudo vira peça de design**, porque é o que o cliente mostra ao fiscal.
7. **Nenhuma tela mente**: os 4 placeholders desaparecem.
8. **Processo:**
   - tokens no Figma → Style Dictionary → Tailwind v4 e tema nativo;
   - design QA em cada PR com interface;
   - regressão visual de telas e do PDF.

---

## 7. Inteligência artificial no produto

### 7.1 Regras de ouro

1. A IA **lê** (NF, foto) e **sugere** (fratura, campos), e, depois da virada, **responde perguntas** sobre dados.
   - Ela **nunca calcula** MPa, FCM, projeção, idade ou janelas.
   - Ela **nunca escreve texto do laudo**.
   - Ela **nunca muda estado**.
2. Toda saída é **JSON estruturado** contra um schema Zod (`output_config.format`), validado pelas faixas de `ranges.ts` e por validadores cruzados antes de aparecer.
3. Toda chamada vira uma linha em `ai_execucoes` (modelo, versão do prompt, hash das entradas, tokens, custo, latência).
4. Toda sugestão vira uma linha em `ai_sugestoes` (evidência, decisão, quem, quando, valor final).
5. **Invariante verificada por trigger e pgTAP:** nenhum campo legal recebe valor de origem IA sem uma decisão humana registrada.
6. **Nenhum fluxo trava esperando IA.** Cada recurso tem timeout, provedor reserva e caminho manual a um toque.
7. **Governança:**
   - liga/desliga por recurso (W13);
   - teto mensal com alertas em 50%, 80% e 100% (corte);
   - gate de avaliação no CI.

### 7.2 Recursos

Volume assumido para custos [Q25]: 200–350 NFs/mês, 1.000–2.000 CPs/mês, 200–350 laudos/mês. Preços Anthropic por milhão de tokens (entrada/saída): Haiku 5.5 US$ 0,10/0,50 (prompts até 100K tokens); Sonnet 5.5 US$ 2/10 (leitura de cache US$ 0,20); Opus 5.5 US$ 4/20 (leitura de cache US$ 0,20); Batch API com −50%.

| # | Recurso | Onde | Modelo | Revisão humana | Custo/mês | Fallback |
|---|---|---|---|---|---|---|
| 1 | **Leitura da NF** (cerca de 12 campos: chave DANFE, emissão, saída da usina e início da mistura se houver, fck, slump proj. ± tol, traço/produto, aditivo, volume, placa, lacre, endereço de entrega, tipo de cimento se houver) | Campo, passos 1–2 | Chave DANFE no aparelho (determinística) + **Claude Haiku 5.5** (`claude-haiku-5-5`, thinking desligado, effort `low`) com 3–5 NFs Tarcal de exemplo no prompt (sem premissa de cache). Escala para **Sonnet 5.5** (`between_tools`) quando os validadores reprovam um obrigatório, **só se couber no timeout de 10 s [ENG]**; senão vai direto aos chips do texto do aparelho. p95 do caminho Haiku → Sonnet medido no S0. ML Kit confere os valores no aparelho | Tela de revisão; tracejado = conferir; obrigatórios bloqueiam [ENG] | ≈ US$ 0,001–0,002/NF no Haiku; ~15% escalados a ~US$ 0,02 → **< US$ 3** | Gemini (adaptador `ocr-nota-fiscal/gemini.ts`, modelo fixado por `GEMINI_MODEL` e revalidado pelo gate de avaliação) → chips do texto do aparelho → manual. Limite de 3 tentativas [ENG] |
| 2 | Sugestão de obra e concreteira | Campo, passo 2 | **Determinístico**: CNPJ → concreteira; GPS + endereço de entrega → obra | Pré-marcada, editável | 0 | Manual |
| 3 | Conferência do QR na foto "antes" | Bancada | **Determinístico** (ML Kit/zxing) | Bloqueia se divergir | 0 | Bipe manual |
| 4 | **Sugestão de fratura** | Bancada | Sonnet 5.5 ou Haiku 5.5, **decidido por avaliação**, com 12–18 fotos de referência rotuladas pela RT em cache de 1 h (≈ 20–30k tokens de imagem; 7.3). No Opus 5.5 o thinking não desliga; no Haiku 5.5 pode ser desligado (`disabled`, effort ≤ `high`) e no Sonnet 5.5 via `between_tools` (effort ≤ `high`). A avaliação compara com e sem thinking em custo, latência e concordância | **Modo sombra** até ≥ 85% de concordância no 1º palpite; depois contorno; **nunca pré-selecionada**; concordância medida por operador; auditoria amostral pela RT | Sonnet ≈ US$ 0,015–0,02/foto → **US$ 15–40**; Haiku ≈ US$ 0,002 → **US$ 2–4** | Só os desenhos |
| 5 | Anomalias (R4, R5, R10, R12, massa específica, kN, fora da janela, ruptura no topo → bases) | Bancada, Estúdio | **Determinístico** (`packages/shared/src/achados/`, novo: as regras R4, R5, R10 e R12 ainda não existem; R4 e R5 entram na F2·S4, R10 e R12 na F3 (S8–S10)); texto por template | Decisão com motivo [ENG] | 0 | — |
| 6 | Hora de moldagem no cadastro tardio | Campo | **Determinístico**: EXIF da foto da NF, marca d'água, hora de saída da usina | Confirmação + justificativa | 0 | Manual |
| 7 | Importar fotos do dia (sem sinal) | Campo | Agrupamento por EXIF/GPS (determinístico) + recurso 1 por foto | Confirma cada rascunho | Dentro do item 1 | Montar à mão |
| 8 | **Copiloto de concreteiras** (Fase 5) | Escritório W15 | **Claude Opus 5.5** (`claude-opus-5-5`, effort `medium`) com **ferramentas tipadas só de leitura** sobre views `security_invoker` (`buildComparativoConcreteira`, séries, listas). **Sem SQL livre.** JWT do usuário, então a RLS vale para a IA | Números conferidos: todo número do texto precisa existir no resultado da ferramenta, senão mostra só a tabela; "não sei" permitido; consulta visível | ≈ US$ 0,10–0,25/pergunta (multi-turno, com thinking) × 150 → **US$ 15–40** | Relatórios prontos + Excel |
| 9 | Texto do relatório mensal de concreteiras (Fase 5) | Escritório | Agregação determinística + texto do Opus 5.5 via **Batch** | Escritório revisa; só interno | **< US$ 2** | Só o Excel |
| 10 | Avaliações noturnas | CI | Batch, modelos mistos | — | **US$ 5–15** | — |

**Total estimado:** **US$ 25–100 por mês** (≈ R$ 140–560), com teto configurado em US$ 150.

**Deliberadamente sem IA:**
- considerações e ressalvas do laudo (regra → cláusula);
- resumo para o cliente (template sem comparação com o fck: "Laudo N°… disponível: resultados da NF 45.120 aos 7 e 28 dias"). Qualquer exibição de valores junto ao fck depende da Q18;
- explicação de anomalias;
- roteirização.

### 7.3 Detalhes do gateway (`packages/ai` + Edge Function `ia-*`)

- **Adaptador** com contrato de saída por schema e provedores Anthropic (principal) e Gemini (reserva).
- **Saída estruturada:** `output_config.format`. No Opus 5.5 e no Sonnet 5.5, `tool_choice` forçado (`any`/`tool`) retorna 400. Usar `auto` + `strict: true` ou saída estruturada.
- **Effort:** o padrão é `medium` no Opus 5.5 e no Haiku 5.5. Definir explicitamente: `low` para extração e visão, `medium` para o copiloto. O thinking não pode ser desligado no Opus 5.5.
- **Recusas:**
  - Opus 5.5 e Sonnet 5.5: `fallbacks: "default"` com o beta `server-side-fallback-2026-07-01`;
  - **Haiku 5.5 não tem fallback no servidor**: o gateway reenvia ao Sonnet 5.5 ou ao Gemini do lado do cliente;
  - o gateway **não envia `fallbacks` em requisições Batch** (a Batches API rejeita o parâmetro);
  - sempre checar `stop_reason` antes de ler `content`.
- **Custo:**
  - referências de fratura com `cache_control: {type: "ephemeral", ttl: "1h"}`: a escrita custa 2× e cada leitura renova o prazo, o que dá ~1–3 escritas por dia na bancada. Com o TTL padrão de 5 min, as cerca de 42 rupturas espalhadas pela tarde (uma a cada ~9 min, em rajadas) perderiam o cache, e o custo da fratura subiria 2–3×;
  - exemplos de NF sem premissa de cache (10–15 NFs por dia, espalhadas);
  - Batch API para o relatório mensal e a avaliação noturna.
- **Imagem:** redimensionada no aparelho para ~1.600 px; **MIME real detectado** (hoje está fixo em `image/jpeg`); cache por hash de imagem.
- **IDs de modelo fixados**; trocar de modelo só depois de passar no gate de avaliação.

### 7.4 Avaliação e qualidade

- **Golden set no S0**, a partir do histórico do WhatsApp, com consentimento:
  - 150 NFs (100 Tarcal, 50 outras) com gabarito;
  - 300 fotos de CP rompido rotuladas pela RT.
- **Gate no CI:** mudança de prompt ou modelo roda o conjunto em **chamadas síncronas** com concorrência limitada (minutos, < US$ 10; a Batch API pode levar até 24 h e travaria o PR) e bloqueia se a precisão por campo cair mais de 1 ponto ou se a concordância de fratura cair. Batch só para a avaliação noturna e o relatório mensal.
- **Metas de liberação:** Tarcal ≥ 95% dos campos aceitos sem edição; outras ≥ 80%.
- **Painel "Qualidade da IA"** (W12): aceite sem edição por campo, concordância de fratura por tipo e por operador, custo, latência.

### 7.5 LGPD na IA

- A NF traz **placa**, que pode identificar o proprietário, e às vezes **nome e CPF do motorista**. São dados pessoais.
- O envio a provedor fora do Brasil é **transferência internacional**: exige mecanismo do **art. 33 da LGPD**, com cláusulas-padrão contratuais (Res. CD/ANPD nº 19/2024), além de menção na política de privacidade.
- Provedor com contrato de não-treinamento e retenção mínima.
- Imagens em Storage privado; `ai_sugestoes` guarda só os campos extraídos.
- RIPD simplificado no S0.
- A IA não é o único operador fora do Brasil: o inventário completo está em 8.6.

---

## 8. Arquitetura técnica

### 8.1 Plataformas e por quê

| Superfície | Escolha | Por quê |
|---|---|---|
| Campo, Bancada, assinatura da RT | **App nativo Expo** (SDK atual, New Architecture; o `apps/mobile` está no `expo ~51`), Android primeiro | **BLE** com a impressora (Web Bluetooth não existe no Safari do iOS); leitura contínua de QR (VisionCamera); scanner de documento nativo (ML Kit/VisionKit); háptica; biometria; **receber o PDF assinado pelo menu Compartilhar**; modo tablet. No iOS, a PWA não tem Web Bluetooth nem Share Target; no Android, até acessa BLE e recebe arquivos, mas não reconecta sozinha à impressora lembrada (exige um gesto a cada sessão) nem tem ML Kit e scanner de documento no aparelho. Flutter jogaria fora o TypeScript compartilhado |
| Escritório e Portal | **React 19 + Vite** (o atual é Vite 5 + React 18): TanStack Router/Query/Table, Tailwind v4, Radix/shadcn, Recharts/visx, cmdk | Densidade, teclado, mesmo ecossistema TS. **Sem migrar para Next.js**: não resolve nenhuma dor e acrescenta risco |
| Validação pública | **HTML leve renderizado no host web do laboratório** (Vercel Function ou Cloudflare Worker em `laudos.<domínio>`), que chama a `validar-laudo` v2 (JSON do snapshot) e devolve HTML. Alternativa: domínio próprio do Supabase (add-on pago, ≈ US$ 10/mês, um por projeto, que passa a ser o host de toda a API) | < 1 s no 4G, sem bundle SPA; não depende do domínio de um fornecedor para a retenção vitalícia. No domínio padrão `*.supabase.co`, a Edge Function não serve `text/html` (a resposta é reescrita como `text/plain`), e um proxy na frente não resolve |
| Renderização e verificação do PDF | **`laudo-service` em contêiner**: Typst CLI (PDF/A-2b nativo) + pyHanko + qpdf, em Cloud Run (`southamerica-east1`) ou Fly (`gru`) | Edge Function não roda essas ferramentas. Typst tem paginação determinística, QR e "Página X de Y" em todas as páginas, e milissegundos de compilação. Gotenberg/Chromium exigiria pós-conversão para PDF/A, com risco de fontes e layout |
| Hardware da Bancada | **Celular** (com capa) como estação v1, como a engenheira definiu [ENG]; **tablet Android comum de 10–11"** com capa robusta e braço articulado só se o S0 provar ganho e houver aceite [Q3]; teclado na tela. Leitor HID e teclado numérico físico **só se o piloto medir necessidade**; celular robusto com tecla física como alternativa testada no S0 | A digitação no celular atende [ENG]; o tablet acomoda fila, MPa, teclado e fraturas sem apertar, mas custa R$ 2–3,5 mil. Periférico HID é teclado, não integração com a prensa [ENG] |

### 8.2 Visão geral

```
[App Rastro · Expo]  Campo · Bancada · Assinar        [Web · React/Vite]  Escritório · Portal
        │  supabase-js + JWT (claims: lab_id, papel, caps)          │
        ▼                                                           ▼
┌──────────────────────────────── Supabase (região a confirmar no S0) ─────────────────┐
│ Postgres: RLS só SELECT · escrita só por RPC SECURITY DEFINER · hoje_lab()           │
│   cp_eventos (append-only) · laudo_snapshots · sequências · views derivadas         │
│   pg_cron (UTC): plano 18:00 locais · prazos a cada 10 min · fechamento · WORM      │
│   pgmq: outbox (e-mail, push*, WhatsApp*) com claim atômico + idempotency_key       │
│ Realtime: Broadcast from Database em canais privados lab:{id}:ops                    │
│ Storage privado {lab_id}/: notas-fiscais · evidencias · laudos · assinados (write-once)│
│ Edge (Deno): ia-nf · ia-fratura · copiloto · laudo-preparar · assinatura-receber ·   │
│   validar-laudo v2 (JSON) · agenda-planejar · notificar · exportar-excel · admin v2  │
└──────────────┬──────────────────────────────┬──────────────────────────────────────┘
               ▼                              ▼
  laudo-service (contêiner)        Externos: Anthropic (Haiku/Sonnet/Opus 5.5) · Gemini
  Typst → PDF/A-2b · pyHanko       (reserva) · Resend · Expo Push* · R2/B2 com Object Lock
  (PAdES, raízes gov.br) · qpdf    · Sentry · PostHog          (* se aprovado [Q14/Q15])
```

### 8.3 Monorepo (pnpm + turbo, mantido)

```
apps/
  mobile/         ATUAL (Expo 51) — opera o campo até a Fase 3; rollback até a virada
  web/            ATUAL (Vite) — opera até as Fases 1–2 substituírem cada área
  field/          NOVO App Rastro (Expo, SDK atual)
  office/         NOVO Escritório + Portal (React 19 + Vite)
services/
  laudo/          Typst + pyHanko + qpdf (HTTP interno, autenticado)
packages/
  shared/         MANTIDO: engenharia, estados, laudo, agendas (reescritas), achados/ (novo)
  design-tokens/  Style Dictionary → CSS vars/Tailwind v4 + tema nativo + cores do PDF
  ui-web/  ui-native/
  laudo-template/ Typst + fontes (Barlow, Plex) + gráfico a partir de chart-svg.ts
  ai/             adaptadores, schemas Zod, prompts versionados, golden sets
  printer/        adaptador de protocolo (ESC/POS de apps/mobile/src/services/printer;
                  TSPL, CPCL ou ZPL conforme a impressora homologada no S0)
  supabase/       tipos GERADOS por `supabase gen types` no CI (hoje escritos à mão)
supabase/         migrations 0001–0018 + 0019+, functions, tests (pgTAP)
```

**Duas versões de React Native no mesmo workspace.** Hoje o `.npmrc` usa `shamefully-hoist=true` e o `apps/mobile/metro.config.js` resolve a partir da raiz, onde estão React 18.2 e RN 0.74.5 (Expo 51). Com `apps/field` (SDK atual, React 19) e `apps/office` (React 19) ao lado, só uma cópia de `react`/`react-native` fica na raiz, e o Metro resolve a errada ("Invalid hook call", módulos nativos incompatíveis). Por isso:
- `apps/field` fica isolado do hoisting: workspace pnpm separado, ou `node-linker=isolated` com `resolver.disableHierarchicalLookup` e `nodeModulesPaths` próprios no Metro; **ou** `apps/mobile` é congelado num branch de manutenção e sai do workspace principal;
- prova de conceito na S1: `apps/field` e `apps/mobile` buildando no CI ao mesmo tempo.

### 8.4 Backend: o que muda

**Tempo.**
- `hoje_lab()` = `(now() at time zone lab.timezone)::date` substitui `current_date` em `registrar_ruptura`, na trava do mandatório e em `data_emissao`.
- `moldado_em timestamptz` vira a base de todos os prazos. Os dados antigos vêm de `created_at`, marcados como estimados.
- Teste de regressão às **21:30 locais**.
- **`pg_cron` roda em UTC.** Os jobs com hora local são disparados por um despachante horário (`0 * * * *`) que, por laboratório, roda o plano quando a hora local = 18. Com um único laboratório, basta `0 21 * * *` (America/Sao_Paulo, sem horário de verão). A 0020 também corrige o job `cps-pendentes-coleta-diario` (0017) e o default `current_date` de `rupturas.data_ruptura_real` (0002); os dois entram no teste das 21:30.

**Escrita só por RPC.**
- Nenhuma policy `FOR ALL` em tabela crítica.
- INSERT de ruptura e CP só via RPC.
- `unique (laboratorio_id, cliente_id, numero, versao)`, só para números definitivos (os rascunhos `RASCUNHO {SIGLA} NF {n}` ficam fora do índice). Hoje `corrigir_laudo` cria a v2 como **nova linha com o mesmo número**, e parcial e final da mesma NF da Tarcal teriam o mesmo número; uma unique sem `versao` quebraria as correções e o backfill. Regras:
  - a v2 herda o número;
  - parcial × final da mesma NF: sufixo (`45120-P7` / `45120`) [Q4];
  - `corrigir_laudo` só marca a v1 `substituido` quando a v2 é **assinada**; até lá a v1 segue vigente (coerente com o H4);
  - pgTAP: corrigir um laudo assinado e emitir parcial + final da mesma NF sem violar a unicidade.
- RPCs aceitam um **UUID gerado no cliente** como chave de idempotência, porque com sinal fraco o reenvio não pode duplicar.

**Convivência com os apps atuais (expansão/contração).** Até a virada (M4), toda migration é **aditiva**:
- `laboratorio_id` nasce com `DEFAULT` do laboratório 0 (ou derivado do claim), para os inserts atuais não quebrarem;
- `usuarios.role` e `is_admin` continuam existindo, sincronizados por trigger a partir de `membros`, porque os dois `auth-service.ts` leem o papel de `usuarios`;
- `mandatorio` e `idades_cobertas` entram **ao lado** de `mandatorio_28d` e `tipo_laudo`, sincronizados por trigger (os nomes atuais aparecem em mais de 30 pontos dos apps e de `packages/shared`, fora os testes);
- as policies de escrita de `obras` (insert/update), `concretagens` (update com optimistic locking) e `evidencia_fotos` (insert) só saem depois que os apps atuais passarem a chamar RPCs novas (trilha 10.2). As brechas da 1.2-6 fecham já na 0021;
- objetos antigos do Storage mantêm o caminho; o prefixo `{lab_id}/` vale para objetos novos;
- o estado `em_conferencia` (criado na 0022) só passa a ser usado quando o LaudoDetalhe atual for adaptado (F1·S3);
- pgTAP de compatibilidade: os fluxos dos apps atuais continuam verdes depois de cada migration.

Uma **migration de contrato** (drop de colunas, policies e caminhos legados) roda só depois do M4.

**Snapshot (H4).**
- `enviar_para_assinatura` grava o snapshot (JSON + sha256) e só então renderiza o PDF.
- A validação lê **só** o snapshot da última versão assinada.
- Um trigger bloqueia a edição de concretagens ligadas a laudo assinado fora de `corrigir_laudo`.

**Eventos.** `cp_eventos` append-only, gravado pelas RPCs, alimenta a linha do tempo, o Realtime e as métricas.

**Integridade.**
- **Sem cadeia de hash única por laboratório**, que serializaria todas as escritas.
- Um **resumo diário** (raiz Merkle dos eventos, da auditoria e do sha256 de cada PDF assinado publicado no dia) vai para o export WORM e recebe **carimbo do tempo RFC 3161 de ACT credenciada na ICP-Brasil** [ext], que é o que dá peso probatório no Brasil.
- Isso torna adulteração **detectável** fora do alcance do administrador do banco.
- A assinatura gov.br não traz carimbo do tempo de ACT nem dados de revogação (LTV): avaliar uma **cópia de arquivo** em PAdES-LTA (DSS + DocTimeStamp), sem alterar o arquivo entregue ao cliente.
- `audit_log` e `cp_eventos` ganham `prevent_physical_delete` e bloqueio de UPDATE.

**Auth.**
- Custom Access Token Hook com `lab_id`, `papel` e `caps[]`; a RLS usa `(select auth.jwt())` (initplan).
- Os claims valem até o token expirar. Por isso as RPCs de transição sensível (publicar, expurgar, numerar, enviar para assinatura) conferem `membros` (ativo + caps) na hora, não só o claim, e quem tem `assinar` ou `admin` recebe JWT de expiração curta (ex.: 15 min).
- MFA TOTP obrigatório para `assinar` e `admin` **nas superfícies novas**. Os apps atuais não têm fluxo de MFA, então a RLS só passa a exigir `aal2` depois da virada (M4).
- Convites; N contatos por cliente; acesso por obra.

**Jobs.**
- `pg_cron` (em UTC, ver Tempo): plano às 18:00 locais, prazos a cada 10 min (alertas idempotentes), fechamento diário, export frio mensal.
- **Dreno da outbox provisionado em migration**: hoje só o enfileiramento tem cron.

**Edge Functions:**

| Função | Mudança |
|---|---|
| `ia-nf` | Substitui `ocr-nota-fiscal`; guarda a imagem |
| `laudo-preparar` | Monta o snapshot e chama o `laudo-service` |
| `assinatura-receber` | Substitui `upload-laudo-assinado`: multipart com N arquivos, verificação, publicação via `publicar_laudo_assinado` v2 |
| `validar-laudo` v2 | JSON a partir do snapshot, código curto, rate limit em tabela. A página HTML `/v/` é renderizada no host web do laboratório (8.1) |
| `notificar` | Substitui `enviar-email`: pgmq, React Email em HTML, remetente do domínio do laboratório (hoje é o placeholder `example.com`) |
| `exportar-excel` | Mantida (corrigir o banner) |
| `admin-provisionar-usuario` v2 | Empresa ≠ contato; N logins; ciente do tenant |
| Todas | CORS restrito aos domínios do laboratório (hoje é `*`) |

### 8.5 Integrações

**Impressora BLE.**
- Adaptador de protocolo em `packages/printer`, com etiqueta renderizada em raster.
- **Transporte BLE dimensionado para raster.** Uma etiqueta de 50×30 mm a 203 dpi tem ~400×240 px, cerca de 12 KB em 1 bit, contra algumas centenas de bytes de texto ESC/POS hoje. O `ble.ts` atual manda blocos de 180 bytes com `writeWithoutResponse` e nunca negocia MTU; no Android o MTU padrão (23) só aceita 20 bytes por escrita. O novo transporte negocia MTU (Android `requestMTU` 247–512; iOS automático), escreve com cadência e controle de fluxo (write-with-response a cada N blocos) e usa a compressão do protocolo (TSPL BITMAP, ZPL compactado, ESC/POS `GS v 0`). O tempo por etiqueta é medido no S0 e define o timeout.
- Timeout por etiqueta (meta de 5 s, confirmada pela medição do S0), fila com confirmação por etiqueta, **impressora lembrada** (MMKV).
- O modelo e o material saem do teste do S0 (3 materiais × 2 impressoras, incluindo **aplicação em CP úmido recém-desmoldado**, manuseio na retífica/capeamento e imersão em **água saturada de cal** com leituras nos dias 7 e 28 e continuação até 91). A impressora homologada precisa de BLE GATT (não só SPP clássico) para funcionar no iOS.
- Plano B: rolos pré-impressos seriados de poliéster com ribbon de resina, associados ao CP ao bipar.

**gov.br.**
- Manual [ENG], com três canais de retorno: Compartilhar no celular, arrastar na web e seletor de arquivo.
- PDF/A-2b, portanto **sem criptografia nem senha de proprietário**: a ISO 19005 proíbe `/Encrypt` [ext]. Isso **reabre uma decisão [ENG]** (bloqueio de edição e cópia) e depende do aceite em Q2. A integridade real vem de PAdES + snapshot + QR + hash; a senha é removível por ferramentas comuns. Se a engenheira mantiver o bloqueio, o laudo sai em PDF 1.7 com senha de proprietário, sem PDF/A.
- Se o arquivo **assinado** falhar no veraPDF (o carimbo visual do assinador pode trazer fonte não embutida), o original PDF/A fica arquivado ao lado do assinado, e isso consta do snapshot.
- Plano C, no backlog: certificado ICP-Brasil em nuvem para assinatura em lote [Q20].

**E-mail.** Resend com templates React Email e idempotência por evento.

**Push e WhatsApp.**
- Expo Notifications [Q14] e WhatsApp Cloud API [Q15].
- Atrás de configuração, **desligados por padrão**; o e-mail é o canal padrão.

**Storage.**
- Buckets `notas-fiscais` (novo), `evidencias`, `laudos` e `assinados` (novo: hoje o assinado fica em `laudos/<id>/assinado.pdf`; a 0022 migra os objetos e reescreve `pdf_assinado_url`, mantendo o caminho antigo legível até a virada), com prefixo `{lab_id}/` para objetos novos e write-once.
- **Export frio mensal** (dump + objetos + resumos diários) para R2 ou B2 com **Object Lock (WORM)**.
- **Teste de restauração trimestral** documentado.

**Mapas.** Deep link para Maps e Waze; mapa estático leve na obra. Sem API de rotas no v1.

### 8.6 Segurança e LGPD

- **Isolamento:** `laboratorio_id` em tudo e RLS por tenant, para não reescrever o esquema se um dia houver um segundo laboratório. Sem nenhuma tela multi-lab.
- **Testes de isolamento** no pgTAP.
- **LGPD:**
  - o laboratório é o controlador;
  - GPS opcional;
  - contatos anonimizáveis;
  - laudo não apagável: retenção decidida pelo laboratório [ENG], com base no exercício regular de direitos (LGPD art. 7º, VI, e art. 16 [ext]) diante da responsabilidade técnica e civil sobre a obra; nenhuma lei impõe guarda vitalícia de relatório de ensaio, então a base deve ser validada com o jurídico. Dados de contato continuam anonimizáveis;
  - acesso ao Anexo de Evidências registrado;
  - CPF e IP nunca em hash simples (CPF tem ~10⁹ combinações e IPv4 ~4,3·10⁹: um hash se reverte por força bruta em minutos e continua sendo dado pessoal). Usar `cpf_hmac` (HMAC-SHA-256 com chave secreta fora do banco) ou CPF cifrado, e `ip_hmac` com chave rotativa e retenção curta;
  - `cp_eventos.geo`: preferir o id da obra às coordenadas brutas, e informar a equipe sobre o registro de localização;
  - transferência internacional: inventariar **todos** os operadores fora do Brasil (Supabase, se fora de `sa-east-1`; Resend; Sentry; PostHog; Expo Push; o `laudo-service`, se fora de `gru`/`southamerica-east1`; provedores de IA, 7.5). Para cada um, mecanismo do art. 33 (cláusulas-padrão da Res. CD/ANPD 19/2024) e menção na política de privacidade. Preferir região Brasil quando houver.
- **Código de verificação:** curto (10 caracteres Crockford base32, 50 bits; ex.: `K7P2-9QXM-4T`), **aleatório e armazenado** (`codigos_validacao`). Elimina o risco de rotacionar o segredo de `sha256(laudo_id:secret)`, e os códigos longos já impressos continuam resolvendo.
- **Pentest** leve antes da virada.

### 8.7 Observabilidade e qualidade

| Área | O que entra |
|---|---|
| **Testes** | Vitest (shared, web, nativo); pgTAP (RLS só-leitura, snapshot, sequência, unicidade com correção e parcial + final da mesma NF, fuso às 21:30, invariante de IA, isolamento, `eng_escritorio` sem ruptura nem coleta, **compatibilidade com os apps atuais**); **testes Deno no CI** (hoje fora); Playwright (web); Maestro (loop da Bancada e captura); **regressão visual do PDF** (PNG por página contra a referência aprovada); avaliação de IA noturna |
| **Telemetria (PostHog)** | Segundos de interação por passo do loop; funil da captura; uso do Desfazer; aceite da IA por campo |
| **Erros** | Sentry (web e nativo) |
| **Painel interno de saúde** | Fila da outbox, falhas de impressão, latência e custo da IA, último export WORM e último teste de restauração |

### 8.8 Deploy

| Componente | Como |
|---|---|
| Web | Estático + a função da página `/v/` (8.1). O último commit (`6570220`) usa Vercel; consolidar num provedor e remover `netlify.toml`/`firebase.json` que sobrarem. **Antes de remover**, identificar todos os hosts já impressos em QR (os `PUBLIC_SITE_URL` históricos de `gerar-laudo-pdf/verification.ts`) e mantê-los como redirecionamento permanente para `/v/` |
| App | EAS Build + EAS Update; trilhas internas (Play interno/TestFlight, cujos builds expiram em 90 dias) até a virada. Depois da virada: Android pela Play (faixa fechada ou privada); iOS por App Store não listado ou Custom App via Apple Business Manager, decidido na S7. O `apps/mobile` atual não tem `eas.json` nem `expo-updates`: se continuar em uso, ganha os dois no S0 (10.1) |
| Supabase | Migrations via CI com `supabase db push` depois do pgTAP verde |
| `laudo-service` | Imagem versionada, deploy por tag, região São Paulo |
| **Região do Supabase** | Não está no repositório (`supabase/config.toml` só tem `project_id = "concreto-mvp"`). **Verificar e decidir no S0.** O Supabase não muda a região de um projeto no lugar: migrar é criar outro projeto, com dump/restore do esquema `auth` (hashes de senha, fatores de MFA), cópia do Storage, segredos, cron e novas URL/chaves em todos os clientes. Se migrar, fazê-lo **antes da 0019** (início do S1), com runbook e 3–5 dias-dev reservados. Se não migrar, registrar a decisão e o mecanismo do art. 33 (8.6): a LGPD não exige residência no Brasil, então é decisão de latência e risco, não obrigação |

### 8.9 Custos recorrentes estimados

| Item | US$/mês |
|---|---|
| Supabase Pro + compute pequeno | 25–60 |
| `laudo-service` | 5–15 |
| IA (7.2) | 25–100 |
| Resend | 0–20 |
| EAS | 0–19 |
| Storage frio WORM | < 5 |
| Sentry / PostHog | 0 (planos gratuitos) |
| Lojas: Apple Developer (US$ 99/ano) e Google Play (US$ 25, único) | ≈ 8 |
| Domínio próprio do Supabase (só se a página `/v/` sair de Edge Function, 8.1) | 0–10 |
| **Total** | **≈ 65–240** |

**Hardware (único, a cotar):**
- tablet de 10–11" com capa e braço, só se aprovado [Q3]: R$ 2.000–3.500;
- impressora de etiqueta, conforme o teste: R$ 1.500–6.000;
- periféricos HID só se o piloto provar necessidade.

---

## 9. Modelo de dados (mudanças sobre o esquema atual)

### 9.1 Princípios

- Escrita só por RPC.
- Estados formais intactos; estados operacionais **derivados em views**.
- Fatos imutáveis: rupturas, snapshots, assinaturas, evidências, eventos.
- Configuração por laboratório em vez de constantes (hoje `app_settings` tem fatores que nenhum app lê), **exceto o que é norma**: tolerâncias de idade, temperatura de cura e base de cálculo ficam fixas no código.
- `laboratorio_id` em tudo, com backfill do laboratório atual e `DEFAULT` durante a convivência (8.4).

### 9.2 Tabelas novas

| Tabela | Campos-chave | Para quê |
|---|---|---|
| `laboratorios` | razão social, CNPJ, logo_path, endereço, cidade/UF, `timezone`, domínio de validação | Identidade do laudo (hoje é "placeholder") e tenant |
| `membros` | usuario_id, laboratorio_id, papel (`campo`, `laboratorista`, `engenheiro`), `caps text[]` (inclui `romper` e `coletar`), ativo | Separa papel de privilégio; cria o laboratorista |
| `responsaveis_tecnicos` | usuario_id, nome, CREA/UF, função (RT, laboratorista, moldador, elaborador), `cpf_hmac` (ou CPF cifrado; 8.6), vigência | Campos de assinatura; conferência do signatário |
| `cliente_contatos` / `contato_obras` | contato ↔ cliente, papel (`cliente_admin`/`cliente_membro`), obras | N logins por cliente, acesso por obra (hoje 1 cliente = 1 login) |
| `concreteiras` + `concreteira_aliases` | CNPJ (único por laboratório), nome, apelidos | "Tarcal" ≡ "TARCAL LTDA" no Excel; casamento pelo CNPJ da DANFE |
| `contratos` / `arts` | cliente_id, código; ART **por contrato ou por período** (ART múltipla mensal para serviços de rotina [ext Res. Confea 1.137/2023]), com vigência [Q12] | Numeração `CT{contrato}` e ART vigente no laudo |
| `nf_documentos` | storage_path, sha256, mime real, chave_danfe (única por laboratório), extração, validadores | A foto da NF deixa de ser descartada; bloqueio de duplicata |
| `cp_eventos` | id, laboratorio_id, cp_id, tipo, ator_id, ocorrido_em, obra_id (no lugar de coordenadas brutas sempre que possível; 8.6), payload jsonb, idempotency_key | Linha do tempo, Realtime, métricas |
| `resumos_diarios` | data, raiz_merkle, carimbo_rfc3161, export_path | Detecção de adulteração ancorada fora do banco |
| `agenda_itens` | data_local, tipo (coleta, ruptura, assinatura), referência, responsável, abre_em, fecha_em, status | Plano das 18:00, atualizado ao vivo |
| `feriados` | data, escopo (nacional, GO, municipal) | Calendário de moldagem e janelas |
| `laudo_sequencias` | laboratorio_id, cliente_id, regra (`nf`, `sequencial`, `contrato`), próximo | Numeração gerada [ENG §2.3] |
| `laudo_snapshots` | laudo_id, versão, `dados jsonb`, `template_versao`, sha256 do JSON, sha256 do original.pdf, `reconstruido bool` | Fecha o H4 |
| `laudo_assinaturas` | laudo_id, ordem, signatário (nome, CPF mascarado do certificado), emissor, assinado_em, `prefixo_ok`, `verificacao jsonb` | 1ª e 2ª assinatura no mesmo PDF |
| `codigos_validacao` | código curto aleatório, laudo_id raiz | QR curto, sem segredo derivado |
| `clausulas` | código, texto com variáveis, **condição** (regra), versão, aprovada_por | Biblioteca de ressalvas e considerações; escolha determinística |
| `equipamentos` (mínima) | tipo, identificação, nº de série, `calibracao_valida_ate` | Prensa, **paquímetro e balança** com a calibração vigente (o paquímetro entra no resultado quando o cálculo passar ao diâmetro medido, e a balança alimenta a massa específica); a ruptura grava os ids dos três; prensa e calibração no laudo [Q20]; o módulo completo fica no backlog |
| `tanque_leituras` | data, tanque, temperatura atual, **máxima e mínima** desde a última leitura, ator | Registro diário de 23 ± 2 °C [ext]; excursão vincula os CPs em cura no período |
| `ai_execucoes` / `ai_sugestoes` | provedor, modelo, prompt@versão, hash, tokens, custo, latência / entidade, campo, valor_sugerido, evidência (bbox, trecho), confiança **calculada**, decisão, valor_final, decidido_por/em, motivo | Auditoria e medição da IA; invariante |
| `notificacoes` (+ pgmq) | canal, destinatário, template, payload, `idempotency_key` única, estado, tentativas | Substitui `email_events` sem duplicar |
| `validacao_acessos` | código, `ip_hmac` (chave rotativa, retenção curta; 8.6), em | Rate limit persistente; métrica de uso pela fiscalização |
| `tarefas` | tipo ("comunicar cliente", "devolvido pela RT"), referência, responsável, status | Exceções viram trabalho visível |

### 9.3 Alterações em tabelas existentes

| Tabela | Mudança |
|---|---|
| todas as de negócio | `+ laboratorio_id not null` com `DEFAULT` do laboratório 0 durante a convivência (8.4) + índices compostos |
| `usuarios` | Vira perfil; papel e capacidades vão para `membros`. Mapeamento: `eng_lab` → engenheiro + {assinar, expurgar, admin, conferir, romper, coletar}; `eng_escritorio` → engenheiro + {conferir, numerar, admin, assinar_2a}; `socio_campo` → campo + {coletar} (+ numerar se [Q4]). `role` e `is_admin` ficam, sincronizados por trigger, até a migration de contrato. pgTAP: `eng_escritorio` não registra ruptura nem coleta (matriz RBAC do PRD) |
| `obras` | `+ tipo_layout` (`quadra_lote`/`vertical`), `+ contrato_id`, `+ fck_projeto_por_elemento jsonb` [Q12] |
| `concretagens` | `+ moldado_em timestamptz`, `+ cadastro_tardio`, `+ justificativa_tardia`, `+ concreteira_id` (o texto vira `concreteira_texto`), `+ nf_documento_id`, `+ chave_danfe` (44 posições alfanuméricas), `+ hora_saida_usina`, `+ hora_inicio_mistura`, `+ idade_controle_fck` (padrão 28 d, do projeto ou da NF [Q8]), `+ elemento_estrutural`, `+ tipo_cimento` [Q13], `+ moldador_id`, `+ origem_campos jsonb` (DANFE/IA/manual/editado por campo) |
| `corpos_prova` | `+ codigo_qr` curto + `codigo_legivel` (o `codigo_rastreio` antigo é mantido para leitura; **para CPs novos, até a virada, `codigo_rastreio` = o payload do QR curto**, para que o app antigo, que busca por `.eq('codigo_rastreio', …)`, também ache os CPs nascidos no Rastro); `+ seq_na_nf`; `+ mandatorio` ao lado de `mandatorio_28d` (sincronizados até o contrato); `+ coleta_abre_em`/`coleta_fecha_em`, `+ ruptura_abre_em`/`ruptura_fecha_em` (de `moldado_em` + tolerâncias da norma e T [Q6]); `+ etiqueta_e1_em`, `+ etiqueta_e2_em`, `+ reimpressoes` |
| `rupturas` | `+ d1_mm`, `+ d2_mm` (o `diametro_mm` atual vira legado), `h_mm`; `+ operador_id`, `+ prensa_id`, `+ paquimetro_id`, `+ balanca_id`; `+ tipo_fratura_nbr` (A–G, além do rótulo interno [Q21]); `+ carga_lida` e `+ unidade_digitada`; `+ idade_real_horas`, `+ dentro_janela`; `+ massa_especifica` (gerada); `+ preparo_bases` (retífica/capeamento); `+ base_calculo_area` (nominal/medido, conforme a decisão Q1, gravada no snapshot); `+ fratura_sugerida`, `+ ia_sugestao_id`. A imutabilidade continua |
| `evidencia_fotos` | `+ sha256`, `+ exif jsonb`, `+ qr_lido`, `+ qr_confere` |
| `laudos` | `+ idades_cobertas int[]` ao lado do enum `tipo_laudo` (sincronizados até o contrato) + `escopo` derivado (final = inclui a maior idade moldada); status `+ em_conferencia`; `+ snapshot_vigente_id`, `+ pdf_original_sha256`; `+ pronto_em`, `+ assinado_em`, `+ primeiro_acesso_cliente_em`, `+ devolvido_motivo`; unique `(laboratorio_id, cliente_id, numero, versao)` só para números definitivos, com sufixo para parcial × final da mesma NF (8.4); `assinatura_elaborador_url` separada → `laudo_assinaturas` |
| `audit_log` | `+ laboratorio_id`; passa a cobrir `laudo_concretagens`, `evidencia_fotos`, `ai_sugestoes`; protegido contra DELETE e UPDATE |
| `app_settings` | Vira `lab_settings`, **legível por autenticados**: fatores de projeção, tolerância interna de coleta (T, Q6), faixas de triagem interna (padrão 95%), limiares de anomalia, SLAs, capacidade da prensa, fotos obrigatórias [Q30]. As tolerâncias de ruptura e de temperatura do tanque são **fixas pela norma** (só estreitáveis, com aprovação da RT); a tolerância de slump vem do projeto ou da NF de cada concretagem, não daqui |

### 9.4 Máquinas de estado

- **CP:** sem mudança. `moldado → coletado → rompido`; `descartado` a partir de `moldado` ou `coletado`; `expurgado` a partir de `rompido`.
- **Laudo:**
  - `rascunho → em_conferencia → pronto_assinatura → assinado → substituido`;
  - `pronto_assinatura → em_conferencia` quando a RT devolve, com comentário.
  - Estender `packages/shared/src/state-machines/laudo.ts` e as RPCs da 0014/0018.
- **Concretagem:** status derivado em view (`em_obra`, `em_cura`, `em_ensaio`, `em_laudo`, `concluida`).

### 9.5 Views derivadas

Todas com `security_invoker`:
- `v_cp_estado_operacional` (estado derivado + relógios);
- `v_nf_pipeline`;
- `v_agenda_hoje`;
- `v_prazos_alertas`;
- `v_carga_prensa_14d`;
- `v_laudo_fila` (cobertura, faltantes, horas desde completo);
- `v_concreteira_desempenho` (fcm, Sd, CV, n, exemplares; Fase 5).

### 9.6 Migrations, por fase (cada uma com pgTAP)

| Fase | Migrations |
|---|---|
| **Fase 1** | 0019 tenant (com `DEFAULT`) + `membros` (sincronizado com `usuarios`) + claims hook + MFA nas superfícies novas · 0020 fuso (`hoje_lab()`, cron em UTC, default de `data_ruptura_real`), `moldado_em`, idempotência · 0021 RLS v2 só-leitura (as escritas que os apps atuais ainda usam saem quando eles passarem às RPCs, 8.4) + fechamento das brechas + unique de número com `versao` · 0022 `em_conferencia`, `idades_cobertas` (ao lado de `tipo_laudo`), snapshots, sequências, códigos curtos, bucket `assinados` + **tabelas mínimas do conteúdo do laudo**: `contratos`/ART, `clausulas` (seed com a cláusula-base corrigida e as ressalvas atuais), `equipamentos` (mínima), `rupturas.d1_mm/d2_mm` e `preparo_bases`, `concretagens.moldador_id` · 0023 `laudo_assinaturas` + `responsaveis_tecnicos` · 0024 outbox pgmq + cron do dreno |
| **Fase 2** | 0025 contatos e acesso por obra, `tarefas` · 0026 `cp_eventos` (backfill de estados e auditoria), Broadcast, `resumos_diarios` + export WORM |
| **Fase 3** | 0027 janelas, `agenda_itens`, `feriados`, `lab_settings` legível · 0028 `concreteiras` (casamento aproximado + fila de revisão manual), `nf_documentos`, bucket `notas-fiscais` · 0029 Bancada: operador, ids dos instrumentos, tipo de fratura da norma, `tanque_leituras`, papel `laboratorista` · 0030 IA: `ai_execucoes`, `ai_sugestoes`, trigger da invariante |
| **Depois do M4** | Migration de **contrato**: drop de `mandatorio_28d`, `tipo_laudo`, `usuarios.role/is_admin`, das policies de escrita legadas e dos caminhos antigos do Storage; RLS passa a exigir `aal2` para `assinar`/`admin` |

### 9.7 Migração dos dados atuais

1. Laboratório 0 + backfill de `laboratorio_id`.
2. `usuarios` → `membros` (mapeamento em 9.3).
3. `moldado_em` ← `created_at`, marcado como **estimado**.
4. Laudos assinados: snapshot **reconstruído** (`reconstruido=true`) com o `pdf_assinado_sha256` existente.
5. Códigos curtos gerados para todos os laudos; os longos continuam resolvendo.
6. `concreteira` texto → `concreteiras`, com fila de revisão dos apelidos.

---

## 10. Roadmap em fases e sprints

### 10.1 Premissas

- **Equipe:** 3 devs full-stack (2 com foco em web/backend, 1 em React Native) e um 2º dev React Native a partir da F3; product designer em 50% (dedicado do S0 ao S2); dono como PO; **RT com 6–8 h por semana no S0–F1** (workshop, aprovação do mock, rotulagem das 300 fotos até a F2) e 2 h por semana depois. Desenvolvimento assistido por IA.
- **Por que não 2 devs.** São 52 dev-semanas para: app nativo com 16 telas e modo Bancada, extensão de compartilhamento no iOS, escritório web (16 telas) + portal (7) + página pública, serviço Python/Typst com verificação PAdES, 12 migrations com pgTAP e RLS reescrita, gateway de IA com gate de avaliação, design system em duas plataformas, pacote de impressora com 3–4 protocolos, outbox, export WORM com âncora RFC 3161, migração de dados e a trilha de manutenção. Só a S1 concentra tenant, claims, MFA, fuso, idempotência, RLS v2, tokens, `ui-web` e a casca do escritório. **Com 2 devs e a RT a 2 h/semana**, o mesmo escopo leva: M1 ~sem. 10–12 · M2 ~18–20 · M3 ~32–36 · M4 ~38–42.
- **Sprints** de 2 semanas; a S1 corre em duas trilhas paralelas (backend 0019–0021 | design system + casca do escritório).
- **O que a IA não acelera:** as respostas da engenheira e o teste da etiqueta (28 dias para decidir, 91 para confirmar). São esses os caminhos críticos.
- **Sequência [PROP]:** a **entrega e a assinatura (gargalo 5 da engenheira) e o "feio" (PDF) vêm primeiro**, enquanto os apps atuais seguem capturando dados. Campo e Bancada vêm depois do resultado do teste da etiqueta. A coleta (gargalo 1) recebe o "plano de amanhã v0" na trilha de manutenção.
- **Uso real dos apps atuais (S0).** O plano supõe que `apps/web` e `apps/mobile` capturam dados hoje. O repositório sugere o contrário: o README ainda diz "Antes do deploy: rodar `pnpm db:reset && pnpm db:test`", a AUDITORIA fala em "antes do primeiro laudo em produção", o `apps/mobile` não tem `eas.json` nem `expo-updates`, e a coluna "Hoje" da 3.2 descreve ficha → WhatsApp → Excel. O S0 confirma (quem usa, desde quando, quantas concretagens e laudos no banco de produção).
  - **Se estiverem em uso:** `expo-updates`/EAS no `apps/mobile` já no S0, para a trilha 10.2 sair por OTA.
  - **Se não estiverem:** sai a linguagem de rollback e a trilha 10.2 se reduz ao backend e ao `packages/shared`; o M1 passa a ser "laudo novo + assinatura verificada com dados importados do Excel/ficha" (ou se reserva uma sprint para pôr o app de captura atual em campo antes do M1), e a captura da F3 é antecipada onde der.

### 10.2 Trilha de manutenção no app atual (S0–S2, em paralelo)

Correções baratas e imediatas, que valem para qualquer versão. Se o S0 mostrar que os apps atuais não estão em uso (10.1), ficam só as linhas marcadas com (B), de backend e `packages/shared`:

| Correção | Onde |
|---|---|
| (B) Fuso `America/Sao_Paulo` | `packages/shared/src/lib/date.ts`, `dashboard/metrics.ts`, telas que usam `toISOString().slice(0,10)`, `current_date` nas RPCs, default de `rupturas.data_ruptura_real` e cron em UTC (vão na 0020) |
| (B) **Plano de amanhã v0** (paliativo do gargalo 1 da engenheira) | Reprogramar o job `cps-pendentes-coleta-diario` (0017) para `0 21 * * *` (18:00 locais) e trocar o conteúdo: coletas do dia seguinte (moldagem estimada por `created_at` + 24h, em fuso local) e rupturas do dia seguinte, por e-mail ao sócio e à RT, a partir das tabelas atuais |
| (B) Modelo do OCR | Verificar hoje o status de `gemini-2.0-flash` (padrão de `ocr-nota-fiscal/gemini.ts`, com aposentadoria prevista para o início de 2026 [ext]; o OCR pode já estar devolvendo erro e jogando o usuário para a digitação manual); definir `GEMINI_MODEL` para um Gemini Flash suportado, sem mudar código, e registrar a data de aposentadoria no painel de saúde |
| **Compatibilizar os apps atuais com o backend v2** (S0–S1, antes da 0021) | `obras` insert/update (`apps/web/.../obras-service.ts`, `apps/mobile/.../obras-service.ts`), `concretagens` update com optimistic locking (`concretagens-service.ts`) e `evidencia_fotos` insert (`evidencia-service.ts`) passam a chamar RPCs; leitura do papel continua em `usuarios` (sincronizado, 8.4) |
| Campo d2 na ruptura, se a Q1 aprovar o diâmetro medido | Tela de ruptura do `apps/mobile` + `registrar_ruptura` (colunas na 0022) |
| Remover ou ligar a dados reais os 4 placeholders | Ver 1.1 |
| **Nova identidade nos apps atuais** (S1–S2) | Aplicar `design-tokens` (neutros Concreto, grafite, sinal), Barlow/Plex e Phosphor; trocar os emojis das 6 fraturas (`FraturaPicker.tsx`) pelos desenhos técnicos; definir o token `warning` (`apps/mobile/tailwind.config.js`) |
| Incluir `campo` | `ROLE_ALLOWED_AREAS.eng_lab` |
| (B) Rótulos factuais do veredito | `veredito.ts:97` |
| (B) Cláusula-base corrigida | `CONSIDERACOES_FINAIS_PADRAO` em `ressalvas.ts` (1.3), assim que a RT aprovar o texto |
| Aviso (não bloqueio) de coleta < 24h, até a resposta da Q6; o app novo aplica o que a Q6 decidir | `coletar_cp` |
| `refetchOnWindowFocus: true` | `apps/web/src/main.tsx` |

### 10.3 Fases

| Fase / Sprint | Semanas | Entregas | Demonstrável ao fim |
|---|---|---|---|
| **F0 · S0: Descoberta e provas** | 1–2 | **Teste do assinador gov.br:** PDF criptografado × PDF/A-2b sem senha; incremental × reescrita; **conformidade veraPDF do arquivo assinado**; o que o certificado traz; caminho no celular. **Início do teste da etiqueta** (3 materiais × 2 impressoras; aplicação a seco no molde e em CP úmido; água com cal com leituras nos dias 7 e 28 e continuação até 91; retífica; **tempo de impressão por etiqueta em raster**). **Confirmar se os apps atuais estão em uso operacional** (10.1). Verificar e decidir a **região do Supabase** (se migrar, antes da 0019). Workshop das perguntas Q1–Q13 + Q16–Q20. **Laudo de referência REBRASCOM** + conteúdo NBR 5739 fechado. Golden set (WhatsApp). Linha de base (últimos 30 laudos, % de coletas, tempos). Turno acompanhando o campo (manhã) e a prensa (tarde/noite). Figma: tokens + 6 telas-chave (Escritório lado a lado com o atual) + **laudo novo com dados reais**. Teste de luva (celular × tablet × celular robusto). | Relatório do assinador; protótipo navegável e **mock do laudo aprovados pela engenheira e pelo dono** |
| **Gate 1** | fim da sem. 2 | Sem resultado do assinador, o 5.6 não se fecha. Sem conteúdo e layout do laudo aprovados (Q1, Q2, Q16–Q20), a F1 não começa. | — |
| **F1 · S1: Fundações** | 3–4 | Duas trilhas paralelas. **Backend:** migrations 0019–0021 em expansão (tenant com `DEFAULT`, claims, MFA nas superfícies novas, fuso e cron em UTC, RLS só-leitura depois que os apps atuais passarem às RPCs, brechas fechadas, unique com `versao`); tipos gerados no CI; testes Deno no CI. **Interface:** `design-tokens`, `ui-web`; casca do `apps/office` (sidebar, W14 Ctrl+K, login com MFA); prova de conceito `apps/field` × `apps/mobile` no CI (8.3) | "Hoje" correto às 21:30; pgTAP prova que um `eng_lab` não insere ruptura direto e que os fluxos dos apps atuais seguem verdes |
| **F1 · S2: Laudo novo** | 5–6 | `laudo-service` (Typst, PDF/A-2b [Q2], Barlow + Plex, QR e paginação em todas as páginas); 0022 (snapshot, sequências, códigos curtos, `em_conferencia`, bucket `assinados` e as **tabelas mínimas do conteúdo do laudo**); validação v2 (JSON) + página `/v/` no host web do laboratório (V1). O template cobre todo o conteúdo aprovado no Gate 1; campo sem dado histórico sai "não registrado", nunca em branco | **Laudo novo gerado a partir de dados reais**; QR → validação premium; PDF adulterado → "diferente do emitido" |
| **F1 · S3: Assinatura verificada** | 7–8 | 0023–0024; `assinatura-receber` (pyHanko com raízes gov.br, prefixo, N arquivos); fila de assinatura **web responsiva** (W8, funciona no celular da RT); ZIP de pendentes; e-mail HTML ao cliente; export WORM v0; **W11 mínima** (RT, CREA e CPF para a verificação do signatário). **LaudoDetalhe atual adaptado:** "Marcar pronto" passa a chamar `enviar_para_assinatura` (snapshot + `laudo-service`) e `gerar-laudo-pdf` vira proxy do `laudo-service` | **M1:** assinar 5 laudos no celular, cliente recebe e-mail, QR valida a vigente. **Em produção**, com a conferência no LaudoDetalhe adaptado e os dados dos apps atuais (ou importados, 10.1) |
| **Gate 2** | sem. 6 | Dia 28 do teste da etiqueta: decisão **provisória** de impressora, material e "um ou dois tempos". Confirmação no dia 91 (≈ sem. 15, antes da S8). Até lá, CPs de 63 e 91 dias levam identificação de reserva (rolo pré-impresso de poliéster com resina, 8.5). | — |
| **F2 · S4: Estúdio** | 9–10 | Estúdio W7 (fila, prévia PDF, checklist, cláusulas por regra, regras R4 e R5 em `achados/`, devolução da RT); 0025; CRUD de clientes, contatos e obras (W10); **W13** Configurações (cláusulas, numeração, feriados); **W6** Laudos. A área Laudos do `apps/web` é desligada, porque o Estúdio a substitui | Último rompimento (app atual) → rascunho completo → conferência em < 3 min |
| **F2 · S5: Central** | 11–12 | 0026 (`cp_eventos`, Broadcast, resumos diários); Central de Operações (W1), Concretagens (W2, tabela + drawer), Exceções (W5), Auditoria (W12); **W3** Rastreio; **W4** Agenda; **W9** Evidências com o **Anexo Técnico de Evidências [ENG]**; **W16 Relatórios → Excel concreteira × fck [ENG]** (o `exportar-excel` atual, com os mesmos filtros) | Quadro web movendo ao vivo enquanto o app atual rompe; Excel do mês gerado pelo escritório novo |
| **F2 · S6: Portal** | 13–14 | Portal v2 (P1–P7: obras, andamento sem números, próximos laudos com "Solicitar laudo parcial", quadra×lote, laudos do snapshot, Dossiê, N contatos); preparar o comunicado aos clientes | **M2:** Tarcal e cliente AGEHAB usando o portal; entrevista com 3 clientes |
| **F3 · S7: Casca nativa + Hoje** | 15–16 | `apps/field` (Expo atual), `ui-native`, N1 Login, abas por papel, Bipar universal (N4), Hoje Campo/Lab (N2, N3), linha do tempo do CP (N9), plano 18:00 (0027), `SlaTimer`; **N7** Obras; **N16** Eu; decidir a distribuição iOS pós-virada (8.8) | Plano de amanhã gerado; bipe de CP antigo abre a linha do tempo |
| **F3 · S8: Captura** | 17–18 | 0028; scanner de documento + DANFE + `ia-nf` (Haiku + ML Kit + validadores) + modelo Tarcal; slump; moldagem com calendário e hora; N8 Concretagem; `packages/printer` + etiqueta nova + impressora lembrada (N15) | **NF real da Tarcal → 4 etiquetas impressas em < 3 min** numa impressora homologada |
| **F3 · S9: Coleta** | 19–20 | Coleta com conciliação (N6), E2 na desforma, descarte em campo, associação manual (transição do canetão), cadastro tardio, importar fotos do dia (N10) | Coleta simulada em 2 obras com um faltante resolvido |
| **F3 · S10: Bancada + assinatura nativa** | 21–22 | 0029–0030; Bancada N11 (celular e, se aprovado, tablet; teclado, d1/d2/h, `MpaReadout`, desenhos de fratura dos tipos da norma, Desfazer, QR na foto, anomalias, tanque, laboratorista); **N12** Fechar bancada; **N14** Exceções; fratura em **modo sombra**; Assinar nativo com Compartilhar (N13) | **M3:** 20 CPs rompidos cronometrados (≤ 40 s de interação); quadro web ao vivo; assinatura pelo celular via Compartilhar |
| **F4 · S11–S12: Virada** | 23–26 | Migração em linha; **2 semanas de operação paralela só com a Tarcal**, com o teste "CP moldado no Rastro é rompido no app antigo e vice-versa"; treinamento no canteiro e na prensa; desligar os apps antigos **por persona** (escritório → cliente → campo → prensa); pentest leve; primeiro teste de restauração; migration de contrato agendada para depois do M4 | **M4:** uma semana de operação real 100% no Rastro, com métricas contra a linha de base |
| **F5 · S13–S14: Inteligência** | 27–30 | Concreteiras W15 (fcm, Sd, n, exemplares; Excel v2 sobre o da W16, com envio automático no dia 1 [PROP/Q28]); copiloto com ferramentas tipadas; relatório mensal via Batch; fratura **visível** se ≥ 85%; painel de qualidade da IA (com o indicador mensal de CVe da NBR 5739) | Perguntas reais respondidas com números rastreáveis; concordância de fratura medida |

### 10.4 Critério de "pronto" de cada sprint

- Demonstração **no laboratório, com aparelhos reais**.
- Métrica instrumentada.
- pgTAP e testes verdes, incluindo o pgTAP de compatibilidade: os fluxos dos apps atuais continuam verdes depois de cada migration.
- Design QA aprovado.
- Nada desligado no app antigo sem substituto em produção.
- Toda tela do mapa (4.3–4.5) tem sprint ou está explicitamente no backlog.

### 10.5 Se faltar tempo, o que cortar (nessa ordem)

1. iOS fora do v1: Android primeiro; no iOS, só o fluxo Assinar, se a RT usar iPhone [Q2].
2. Storybook e regressão visual só na web.
3. Resumo Merkle + RFC 3161 e Dossiê depois da virada (o export WORM mensal continua).
4. Fase 5 (exceto o Excel mensal [ENG], que já está na F2).
5. Importar fotos do dia.
6. Quadra×lote.
7. Visão Linha do tempo da Central.
8. Portal v2 reduzido a laudos + próximos laudos.

**Nunca cortar:** snapshot, verificação da assinatura, fuso, conciliação, Excel mensal [ENG], Anexo Técnico de Evidências [ENG].

Mesmo com os cortes, 2 devs não fecham o escopo em 26 semanas (10.1).

### 10.6 Backlog (depois da Fase 5)

- Voz e foto do display na prensa, só depois de um teste de ruído aprovado.
- WhatsApp de entrega e push [Q14/Q15].
- Endereçamento de tanque e lista de separação.
- Painel de parede.
- E-mail de entrada para PDFs assinados.
- Roteirização com janelas (VROOM/OR-Tools).
- Certificado ICP em nuvem em lote.
- Módulo completo de calibração.
- Esclerometria (NBR 7584) e outros ensaios.
- Integração com prensa e balança.
- Multi-laboratório (SaaS) [Q26].

---

## 11. Métricas de sucesso

A linha de base é medida no S0, com amostras do WhatsApp, do Excel e do banco atual.

| Métrica | Definição | Meta pós-virada (M4) | Meta pós-F5 |
|---|---|---|---|
| **North Star: lead time do laudo** | Mediana entre o último rompimento das idades cobertas e o laudo **assinado e publicado** | ≤ 1 dia útil | ≤ 4 h úteis |
| Parado em "pronto para assinatura" | Mediana | ≤ 12 h | ≤ 4 h; ≥ 60% assinados pelo celular |
| Conferência | Horas entre "completo" e "enviado para assinatura" | ≤ 8 h úteis | ≤ 2 h úteis |
| Coleta na janela | % de CPs coletados dentro de [24h, 24h + T] [Q6] | ≥ 95% | ≥ 98% |
| CPs perdidos ou trocados | Sem desfecho depois da janela de ruptura + trocas detectadas pelo QR da foto | 0 | 0 |
| Fim do canetão | % de CPs com etiqueta impressa e bipada na coleta | ≥ 95% | 100% |
| Precisão da NF | % de campos aceitos sem edição | Tarcal ≥ 90% · outras ≥ 75% | Tarcal ≥ 97% · outras ≥ 85% |
| Captura | Interação da foto da NF até "Concluir" | ≤ 2 min | ≤ 90 s |
| Ritmo da Bancada | Segundos **de interação** por CP (**exclui o carregamento da prensa**) | ≤ 50 s | ≤ 40 s |
| Ruptura na janela | % dentro da tolerância por idade | ≥ 95% | ≥ 98% |
| Medidas reais | % de rupturas com d1, d2 e h distintos do CP anterior (sinal contra cópia) | monitorar | monitorar |
| Correções | % de laudos com versão > 1 | ≤ 5% | ≤ 2% |
| Entrega sem WhatsApp manual | % de laudos abertos pelo cliente via notificação ou portal | ≥ 70% | ≥ 90% |
| Adoção do portal | % de clientes ativos com ≥ 1 acesso por mês | ≥ 50% | ≥ 80% |
| Confiança pública | Validações por QR por mês; divergências em "Conferir arquivo" | medir | tendência ↑ |
| IA de fratura | Concordância 1º palpite × escolha da RT | — (sombra) | ≥ 85% para ficar visível |
| **Invariante de confiança** | Valores legais vindos de IA sem decisão humana | **0** | **0** |
| Custo de IA | US$/mês | ≤ 100 | ≤ 150 (teto) |
| Satisfação interna | Pergunta mensal às 4 personas: "o app me fez ganhar ou perder tempo?" | ≥ 4/5 | ≥ 4,5/5 |

---

## 12. Riscos e mitigação

| # | Risco | Prob. | Impacto | Mitigação | Sinal de alerta |
|---|---|---|---|---|---|
| 1 | **A etiqueta não adere ao CP úmido, não sobrevive à retífica ou a 28–91 dias em água com cal** | Alta | Crítico (o canetão continua) | Teste no S0 (caminho crítico), com decisão provisória no dia 28 e confirmação no dia 91; E1 no molde + E2 na desforma; QR nível H com carga curta; código curto legível; rolos pré-impressos de poliéster com resina | Etiqueta ilegível no dia 7 ou degradada no dia 63 do teste |
| 2 | **O assinador gov.br recusa o PDF ou reescreve os bytes; o arquivo assinado deixa de ser PDF/A** | Média | Alto | Teste no S0 com veraPDF do arquivo assinado; PDF/A sem senha (se aprovado em Q2); original PDF/A arquivado ao lado do assinado; verificação parcial (texto + código + páginas) marcada e auditada; registrar o comportamento de cada caminho (app × web) | Falha no teste |
| 3 | **Verificação contra a raiz errada** rejeita assinaturas válidas | Média | Alto | Raízes da AC do Governo Federal no pyHanko ou validador do ITI; caso de teste com PDF real assinado no S0 | Qualquer rejeição de PDF assinado pela RT |
| 4 | **Decisões normativas abertas** (diâmetro nominal × medido, conteúdo NBR 5739, janela de coleta, tolerâncias × prensa à tarde) | Alta | Alto | Workshop no S0; conteúdo antes do layout; a decisão do diâmetro é única, gravada no snapshot e não vira chave | Pergunta sem resposta ao iniciar o sprint dependente |
| 5 | **A RT continua gargalo** (o gov.br assina um por vez) | Alta | Alto | Fila no celular, < 2 min por laudo, ZIP + arrastar N no desktop; plano C ICP em nuvem [Q20]; RT substituta [Q20] | "Pronto para assinatura" > 12 h |
| 6 | **Adoção em campo:** o app mais lento que a caneta | Média | Alto | Meta de 90 s; teste no canteiro sob sol; impressora lembrada; atalhos; sócio como co-designer; métrica "CP sem QR" | Cadastro tardio > 20% |
| 7 | **Sinal fraco sem modo offline [ENG]** | Média | Médio | Rascunho local, cache de leitura do plano, etiquetas de reserva, importar fotos do dia, RPC idempotente | Cadastro tardio por obra |
| 8 | **A IA erra campo legal** | Média | Alto | DANFE determinística; validadores; ML Kit; obrigatórios bloqueiam; métrica de edição; avaliação no CI | Versões > 1 causadas por dado de NF |
| 9 | **Viés de automação na fratura** | Média | Médio | Modo sombra; nunca pré-selecionar; concordância por operador; auditoria amostral | Concordância de 100% (suspeita) |
| 10 | **Exposição jurídica diante do cliente** (veredito, "abaixo do fck") | Média | Alto | Números só depois da assinatura; comparação factual; veredito desligado [Q18]; resultado baixo vira tarefa interna; nenhum texto de IA no laudo | Pedido de cliente por "aprovado/reprovado" |
| 11 | **Reescrita compete com a operação; migrations quebram os apps atuais** | Média | Alto | Estrangulador por persona; backend único; migrations em expansão/contração com pgTAP de compatibilidade (8.4); laudo primeiro com captura atual; paralelo com a Tarcal; rollback = apps atuais, **só se o S0 confirmar que estão em uso** (10.1) | Bugs em produção no paralelo; app atual com erro de escrita depois de uma migration |
| 12 | **Fuso e calendário** afrouxam a trava do mandatório | Média | Alto | `hoje_lab()`; testes às 21:30; feriados; janelas simétricas | Registro com data do dia seguinte |
| 13 | **Protocolo da impressora** (ESC/POS × TSPL × CPCL × ZPL) e BLE instável ou lento com etiqueta raster | Média | Médio | Homologar 1–2 modelos no S0 (BLE GATT, tempo por etiqueta medido); adaptador de protocolo; MTU negociado e controle de fluxo (8.5) | Falha > 5% no checklist |
| 14 | **Retenção vitalícia em um único provedor** | Baixa | Crítico | Export WORM mensal + restauração trimestral + PDF/A do original (o assinado, verificado no veraPDF) + carimbo de ACT ICP-Brasil no resumo diário | Falha na restauração |
| 15 | **Região do Supabase fora do Brasil** | Média | Médio | Verificar e decidir no S0; se migrar, antes da 0019, com runbook e 3–5 dias-dev (8.8) | — |
| 16 | **Dependência de fornecedor de IA** | Média | Baixo | Gateway com reserva; IDs fixos; avaliação para trocar; manual em tudo | Latência p95 > 8 s |
| 17 | **Escopo maior que a equipe** (52 dev-semanas não cobrem o plano) | Alta | Alto | 3 devs + 1 RN a partir da F3, ou cronograma rebaselinado (10.1); RT com 6–8 h/semana no S0–F1; cortes definidos (10.5); Fase 5 opcional; nada de SaaS | Sprint com < 70% entregue duas vezes seguidas |

---

## 13. Decisões tomadas vs alternativas descartadas

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| 1 | **Conceito-base: cockpit operacional (Rastro)** | AI-native (Prumo); produto premium/SaaS (Traço) | Os dois juízes preferiram o cockpit. Ele é o único que modela o caminho físico do CP com relógio e conciliação, e ataca os 5 gargalos. Do AI-native veio a governança de IA; do premium, a sequência do roadmap, a prudência jurídica e o portal |
| 2 | Reescrever interfaces e PDF; **evoluir** o backend | Reescrever tudo | O domínio e o banco estão corretos e testados (238 + ~172). O "feio" está na apresentação |
| 3 | **[PROP] Laudo e assinatura primeiro**, campo depois | Campo primeiro (S6–S7 para o laudo) | Ataca o gargalo de entrega (5º da engenheira) e o "feio" em 2 meses, enquanto corre o teste da etiqueta; a coleta (gargalo nº 1 da engenheira) ganha paliativo imediato (plano de amanhã v0, 10.2) |
| 4 | Expo nativo para campo e Bancada | PWA; Flutter | BLE e compartilhamento de arquivo não funcionam em PWA no iOS; no Android, sem reconexão silenciosa à impressora nem ML Kit no aparelho; Flutter perde o TS compartilhado |
| 5 | Web em **Vite + React 19** | Migrar para Next.js/Vercel | Nenhuma dor resolvida, mais risco; a página de validação sai de uma função serverless no host web, sobre a `validar-laudo` v2 |
| 6 | **Typst** → PDF/A-2b | Chromium/Gotenberg; manter pdf-lib | Typst é determinístico e tem PDF/A nativo; Chromium precisa de pós-conversão (fontes e layout); pdf-lib é caro de iterar |
| 7 | Validação em **domínio do laboratório**, lendo o snapshot | `v.traco.app` e selo "Verificado por Traço"; ler o banco vivo | Retenção vitalícia não pode depender do domínio de um fornecedor; o selo sugere que um terceiro verificou o ensaio; banco vivo contradiz o PDF assinado (H4) |
| 8 | Código curto **aleatório e armazenado** | `sha256(id+secret)` | Sem plano de rotação de segredo; QR mais denso |
| 9 | PDF/A-2b **sem senha**, **pendente de [Q2]** (reabre a decisão [ENG] do bloqueio de edição) | PDF 1.7 com senha de proprietário, sem PDF/A | O PDF/A proíbe criptografia, então os dois não convivem; a senha pode ser recusada pelo assinador e é a camada mais fraca. PAdES + snapshot + QR + hash são os controles reais |
| 10 | Verificação contra a **AC do Governo Federal (gov.br)** ou o validador do ITI | Raiz ICP-Brasil | Assinatura gov.br é avançada e não encadeia na ICP-Brasil |
| 11 | 2ª assinatura **no mesmo PDF**; por convenção, elaborador antes e **RT por último** | Arquivo separado; RT antes e elaborador "por cima" | A assinatura da RT cobre o arquivo final; simplifica o prefixo da versão publicada. Ambos respondem pelo que assinam |
| 12 | Considerações e ressalvas **por regra sobre cláusulas aprovadas** | "Análise técnica" redigida por IA no laudo; Opus escolhendo cláusulas | Viola o layout único; recomendar reforço é decisão do projetista (NBR 6118, item 25.3 [ext]; a NBR 12655 trata da aceitação e a NBR 7680 dos testemunhos); condições conhecidas resolvem por regra, sem custo nem risco |
| 13 | Fratura: **modo sombra, nunca pré-selecionada** | Pré-selecionar com confiança ≥ 0,8 | Viés de automação num campo assinado; a confiança autodeclarada não é confiável |
| 14 | **d1, d2 e h medidos em todo CP, sem pré-preenchimento** | "Repetir as últimas"; pré-preencher do CP anterior; medir por amostragem | A NBR 5739 [ext] exige medir cada CP; pré-preencher induz medida fictícia num documento jurídico |
| 15 | Diâmetro: **decisão única no S0**, gravada no snapshot; proposta: o **medido**, como manda a NBR 5739 e como a entrevista pede ("área real") [Q1] | Chave de configuração nominal × medido | Norma não é configuração; o uso do nominal é uma não conformidade a resolver com a engenheira, e enquanto durar o laudo diz a base de cálculo |
| 16 | Rótulo factual **"≥ fck"** + faixas de **triagem interna** definidas pela RT (padrão 95%), identificadas como critério interno | "CONFORME" por CP; "Abaixo do fck — avaliar reforço" | Conformidade é avaliação de lote (NBR 12655, exemplar = maior dos 2 CPs [ext]); reforço não se decide na prensa; o limiar de 95% (herdado de `veredito.ts`) não tem base normativa |
| 17 | Cliente: **sem veredito nem cor**, números só depois da assinatura | Selo verde/vermelho no portal e na página pública | Mesmo espírito de tirar as fotos do laudo [ENG]; depende de aprovação [Q18] |
| 18 | PDF **sem caixas de resumo FCM × fck** | Caixas "FCM 28d × fck" no topo | Veredito implícito; média de 2 CPs não é critério de aceitação |
| 19 | Comparativo de concreteiras **só interno**, com fcm, Sd, CV, n e exemplares | Aba "Desempenho do meu concreto" para a Tarcal; ranking por "% abaixo do fck" | Conflito de interesse e confidencialidade (a Tarcal é cliente e concreteira); fck é quantil de 5%, então resultados individuais abaixo dele são esperados |
| 20 | Copiloto com **ferramentas tipadas** | `sql_somente_leitura` mesmo para admin | Menor superfície; números conferíveis |
| 21 | Teclado grande como entrada da prensa; voz e display como experimento pós-virada | Voz como entrada principal; meta de "≤ 3 toques" | Ambiente ruidoso; ditar número não é mais rápido que 5 toques |
| 22 | Canetão: **associação manual** com foto e confirmação da RT | Leitor de canetão por IA com casamento aproximado | Um palpite sobre a identidade do CP pode trocar CPs entre obras |
| 23 | Sem ficha manuscrita nem "captura universal" | OCR de ficha manuscrita como núcleo | O app novo elimina a ficha em vez de lê-la |
| 24 | Coletas ordenadas por liberação e prazo + deep link | Google Routes `optimizeWaypointOrder` | Não trata janelas de tempo; com 4–6 paradas não compensa |
| 25 | `cp_eventos` append-only + **resumo diário ancorado fora** (WORM + RFC 3161) | Cadeia de hash única por laboratório | A cadeia única serializa as escritas e, sem âncora externa, prova pouco |
| 26 | Meta da Bancada = **tempo de interação** | ≤ 45 s "do QR ao salvar" incluindo a ruptura | O carregamento de 0,45 ± 0,15 MPa/s leva 50–100 s; a meta induziria a carregar rápido demais |
| 27 | **Celular como estação v1 [ENG]**; tablet comum + braço só com ganho provado e aceite [Q3]; periféricos **só se provados** | Comprar tablet robusto + HID + teclado físico antes; Bancada só para tablet | A engenheira disse que a digitação no celular atende; custo antes de evidência. O S0 compara as opções com luva |
| 28 | **E-mail como canal padrão**; push e WhatsApp atrás de configuração | Push e WhatsApp ligados por padrão | O PRD cortou o push; depende do aceite [Q14/Q15] |
| 29 | **Só `laboratorio_id`** no esquema | Billing, planos, onboarding, white-label, site institucional | Distração para uma equipe pequena antes de acabar com o canetão |
| 30 | Fora do MVP: painel de parede, e-mail de entrada, endereçamento de tanque, reatribuição por arrastar, módulo de equipamentos completo | Incluir no MVP | Pouco valor frente ao custo; o endereçamento reintroduz o registro de entrada que o PRD removeu |
| 31 | **Sem modo offline** [ENG] | Offline-first (V2-02 do backlog UX) | Decisão da engenheira; resolvido com rascunho local, cache de leitura e etiquetas de reserva |
| 32 | Claude (Haiku/Sonnet/Opus 5.5) com **Gemini de reserva** | Só Gemini 2.0 Flash | Modelo antigo e possivelmente descontinuado; a troca se decide por avaliação com dados reais |
| 33 | **[PROP/Q6]** Bloquear coleta < 24h (exceção pela RT, com motivo; CPs de idade ≤ 1 d com procedimento próprio) | Aceitar "coleta dentro da janela (23h40)" | A NBR 5738 [ext] pede ≥ 24h na fôrma; muda a rota do sócio, então precisa do aceite operacional da engenheira. Até a resposta, o app atual só avisa |
| 34 | Abatimento pela **NBR 16889:2020** [ext] | Citar a NBR NM 67 | A NM 67:1998 foi cancelada e substituída; norma cancelada num laudo assinado não é opção. Atualizar `ranges.ts` (comentário), PRD §6 e as normas de referência do laudo na F1 |
| 35 | Migrations em **expansão/contração** até o M4 | Renomear colunas, exigir `not null` sem default e fechar escritas no lugar | Os apps atuais continuam escrevendo durante a convivência; o contrato (drops) roda depois da virada (8.4) |
| 36 | Tolerâncias de idade e de temperatura **fixas pela norma** (só estreitáveis pela RT); nota obrigatória de ruptura fora da tolerância | Tolerâncias configuráveis em W13; ressalva só se a RT aprovar | A norma não vira chave de configuração (princípio 8); alargar a janela "resolveria" a prensa à tarde com o laudo ainda citando a NBR 5739 |
| 37 | Unique de número com **`versao`** e sufixo para parcial × final | `unique (laboratorio_id, cliente_id, numero)` | A correção cria a v2 com o mesmo número e a Tarcal numera pela NF; a unique sem versão quebraria as correções e o backfill |

**Erros dos conceitos corrigidos neste plano:**
- veredito errado de 29,42 × fck 30 (era "atenção", não "conforme"): aqui os rótulos são factuais e o exemplo é coerente;
- fator de kN (~102×, não 9,8×);
- desforma ou coleta antes de 24h;
- janela de 7d assimétrica (corrigida para ±6h em torno da hora nominal);
- datas e dias da semana (13/10/2026 é terça; 14/10, quarta);
- contraste WCAG de "14 px bold";
- `optimizeWaypointOrder` sem janelas;
- cadeia ICP-Brasil × gov.br;
- CREA "extraído da assinatura";
- `ASWebAuthenticationSession`;
- fallback de recusa inexistente no Haiku 5.5;
- custo de fratura subestimado;
- LGPD da placa e do motorista;
- `FOR ALL` e H4 tratados antes de qualquer tela nova de laudo;
- região do Supabase não verificada;
- fluxo DANFE sem caminho para romaneio.

---

## 14. Perguntas para a engenheira antes de começar

Priorizadas pelo sprint que bloqueiam. As de **S0** precisam de resposta no workshop.

### Bloqueiam o S0–F1 (laudo e assinatura)

1. **Diâmetro do cálculo.** A NBR 5739 [ext] calcula a área com a média de dois diâmetros ortogonais medidos à meia altura (0,1 mm), e a entrevista já fala em "área real". O PRD e o código usam o **nominal** (validado contra o laudo de referência), o que é desvio da norma. Proposta: gravar d1, d2 e h em todo CP desde a F1 e calcular com o medido; os laudos já emitidos ficam como estão (snapshot reconstruído). Enquanto não migrar, o laudo traz ressalva sobre a base de cálculo. De acordo? Há laudos emitidos que exijam comunicado aos clientes?
2. **PDF e assinatura.** O PDF/A (arquivamento vitalício) **não admite** a senha de proprietário que hoje trava edição e cópia [ENG; ext ISO 19005]. Prefere manter o bloqueio (abrindo mão do PDF/A) ou adotar PDF/A sem senha, ficando a integridade com PAdES + QR + "Conferir arquivo"? O teste do S0 mostra também se o assinador recusa ou reescreve cada um. Você assina pelo celular, pelo computador ou pelos dois? O CREA ou algum cliente exige ICP-Brasil qualificada?
3. **Quem rompe hoje, e em quê?** A foto das 19:35 sugere outro operador. Criamos o papel **laboratorista** (rompe, descarta, sugere expurgo; não expurga nem assina), com o nome dele saindo automaticamente no campo "Laboratorista"? Romper com o próprio celular atende, como vocês disseram, ou aceitam um tablet fixo na prensa (R$ 2–3,5 mil)?
4. **Quem numera?** O PRD diz que é o sócio. Podemos **gerar** a sequência por cliente (Tarcal = nº da NF; esporádicos `CT{contrato}-T{traço}-CP{n}`) e permitir ajuste auditado por quem tiver a capacidade "numerar"? Para a Tarcal, um laudo parcial e o final da mesma NF levam sufixo (`45120-P7` / `45120`)?
5. **Hora de moldagem.** Podemos registrar a hora, não só a data? No cadastro tardio, até quantas horas para trás é aceitável?
6. **Janela de coleta.** Hoje vocês coletam CPs com menos de 24h? Podemos **bloquear** a coleta antes de 24h, conforme a NBR 5738 [ext], com exceção autorizada pela RT e motivo (isso muda a rota do sócio)? Qual a tolerância depois das 24h (T)? Hoje quase toda coleta gera ressalva. Aprova trocar o texto atual ("…pode ter afetado a cura e a resistência…", `ressalvas.ts`) por algo factual como *"amostra(s) coletada(s) X h após a moldagem, fora da janela de Y h"*?
7. **Tolerâncias de idade e expediente.** As tolerâncias são as da NBR 5739 [ext] (24h ±0,5h, 3d ±2h, 7d ±6h, 28d ±24h…), fixas no app. Com moldagem às 08:30 e prensa à tarde, um CP de 7d passa da tolerância depois das 14:30, e CPs de 24h e 3d exigem prensa no horário da moldagem. Como vocês tratam isso hoje? Como tratam CPs de 24h (moldados no laboratório ou transportados no molde)? O laboratório rompe aos sábados, domingos e feriados? Aprova o texto da nota obrigatória de ruptura fora da tolerância?
8. **Idades livres e laudo final.** Quando a maior idade é 63d ou 91d, ela é a "final"? Há obras com fck especificado em idade diferente de 28 dias? Existe parcial de 3d? A regra dos "2 mandatórios" vale quando há 1 ou 3 CPs na maior idade?
9. **Etiqueta.** Topam o teste da etiqueta **já** (3 materiais, aplicação no molde e em CP úmido na desforma, água com cal com leituras aos 7 e 28 dias e continuação até 91, a maior idade oferecida, retífica)? Até o resultado de 91 dias, CPs de 63 e 91 dias levam identificação de reserva. Qual impressora vocês têm ou preferem? Aceitam a etiqueta em dois tempos com o mesmo código?
10. **Contingência sem sinal.** Aceitam rolos de etiquetas pré-impressas (associadas ao CP no bipe, quando houver sinal), sabendo que isso **não** é modo offline?
11. **Laudo de referência.** Podem enviar o `…ENSAIO_7_DIAS_REBRASCOM_assinado.pdf` e explicar REBRASCOM × AGEHAB (cliente × obra)? Qual a identidade oficial (razão social, logo, CREA da RT, endereço; a foto sugere QD 17, LT 2, Via Primária 2, Aparecida de Goiânia-GO)?
12. **Campos e ART.** Além de quadra, lote e traço: registramos **elemento estrutural** (laje, pilar) com fck de projeto por elemento? Existe a entidade **contrato**? Onde fica o **nº da ART** de cada contrato? A Tarcal usa ART múltipla mensal? Quais campos da NF são indispensáveis (hora de saída da usina, hora de início da mistura, tipo de cimento, aditivo)? Querem aviso interno do tempo entre o início da mistura e a moldagem [ext NBR 7212]?
13. **Tipo de cimento e projeção.** Registramos o tipo de cimento? Os fatores de projeção variam por cimento (CP V-ARI × CP III)? Quais fatores usar para 3d e 63d?

### Também bloqueiam o S0–F1 (conteúdo do laudo, cláusulas, página pública, assinatura)

Respondidas no mesmo workshop do S0, porque definem o template e a página pública do M1.

16. **Conteúdo NBR 5739 no laudo** [ext]: incluímos d e h medidos, data e idade real, tipo de fratura (tipo da norma), preparo das bases (retífica ou capeamento), prensa e calibração? MPa com 2 casas ou 3 algarismos significativos? O abatimento em campo já segue a NBR 16889:2020, que substituiu a NBR NM 67 [ext]?
17. **Biblioteca de cláusulas:** aprova uma biblioteca de considerações e ressalvas, escolhidas **por regra**, sem texto livre, começando pela cláusula-base corrigida (1.3)?
18. **Veredito ao cliente:** no portal e na página pública mostramos só os valores e a linha do fck (proposta)? Resultado abaixo do fck vira tarefa "comunicar cliente" para você, sem aviso automático?
19. **Página pública:** pode oferecer **download do PDF assinado**?
20. **Assinatura e equipamento:** nas férias da RT (P20), o engenheiro de escritório assina sozinho? Ele está anotado no CREA como RT (ou co-RT) da empresa, e com qual ART? O laudo parcial também é assinado no gov.br (P13)? O laudo deve citar a prensa e a validade da calibração?

### Bloqueiam a F2 (Central, Portal)

14. **Notificações push** no app interno: são bem-vindas, ou preferem só e-mail?
15. **Entrega ao cliente:** e-mail com link e portal bastam, ou é preciso **WhatsApp** com link? Quem do cliente recebe (vários contatos, acesso por obra)? A construtora atendida pela Tarcal também acessa?

### Bloqueiam a F3 (Campo e Bancada)

21. **Fraturas:** a NBR 5739 [ext] tem 7 tipos (A–G); como os 6 rótulos de vocês se distribuem neles? Vocês validam os desenhos? "Ruptura de Cabeça" deve gerar o aviso "verificar preparo das bases"?
22. **Anomalias e peso:** a partir de que diferença entre os 2 CPs de uma idade vocês desconfiam? Esse limiar é interno e aprovado por vocês; o anexo estatístico da NBR 5739 [ext] vira o indicador mensal de CVe do laboratório. O peso serve para massa específica? Aparece no laudo?
23. **Tanque:** quantos tanques? Já medem a temperatura (23 ± 2 °C [ext])? Têm termômetro de máxima e mínima ou datalogger? Topam o registro diário no app?
24. **Concretagens programadas:** a Tarcal informa na véspera onde vai concretar? Vale incluir no plano das 18:00?
25. **Volumes:** concretagens, CPs e rupturas por dia; laudos por mês; clientes e obras ativos; o **prazo de entrega** que querem prometer.
26. **Escala:** atender outros laboratórios está no horizonte? Hoje o plano só deixa o esquema pronto, sem nenhuma tela.

### Bloqueiam a F5 (Inteligência)

27. **Fotos antigas:** podemos usar o histórico de fotos de NF e de CPs rompidos do WhatsApp para montar o conjunto de avaliação (com consentimento e LGPD)? (A resposta é necessária já no S0, que monta o golden set.)
28. **Relatório de concreteiras:** quais colunas? Só interno, ou algum dia mostrado ou vendido às concreteiras? Envio automático no dia 1?
29. *(Retirada na v1.1: a norma de abatimento é a NBR 16889:2020 [ext], decisão 34; a confirmação do procedimento de campo foi para a Q16.)*
30. **Fotos de evidência:** são obrigatórias em todo CP ou só nos mandatórios e em casos de disputa (P24)?
