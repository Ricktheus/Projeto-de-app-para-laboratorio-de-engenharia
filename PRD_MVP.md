# Product Requirements Document (PRD) - MVP Laboratório de Concreto

## 1. Visão Geral e Objetivo
Este documento define os requisitos do Produto Mínimo Viável (MVP) do aplicativo para Controle Tecnológico de Concreto. O objetivo principal é eliminar gargalos operacionais da equipe, desde a coleta em campo (rastreabilidade e automação de dados) até o rompimento e emissão segura do laudo final para o cliente.

---

## 2. Decisões de Regras de Negócio e Casos de Borda (Foco em Simplicidade)
Seguindo a premissa de **simplicidade, mudanças cirúrgicas e foco na entrega**, as lacunas levantadas foram resolvidas da seguinte forma para o MVP:

### Fluxo de Negócio
* **Slump Test Reprovado:** O sistema só registrará concretagens que foram **aprovadas** e moldadas. Não haverá controle de devolução de caminhões.
* **Perda ou Quebra de CPs:** O sistema não gerenciará "CPs Reserva". Se um CP for danificado e não puder ser rompido, o usuário usará a opção "Descartar CP". O laudo calculará a média (MPa) apenas com os CPs válidos restantes.
* **Coleta Atrasada (>24h):** O fluxo **não será bloqueado**. A coleta pode ser feita a qualquer momento. O laudo final exibirá automaticamente uma ressalva textual caso a coleta ultrapasse as 24 horas.
* **Ruptura Inválida (Erro na Prensa):** A interface da prensa terá um botão "Descartar Resultado", permitindo que a engenheira exclua aquela leitura específica caso a fratura seja anômala ou haja falha na máquina.

### Arquitetura, UX e Tratamento de Erros
* **Modo Offline:** Estritamente **fora do escopo**. O app exige internet. Se não houver sinal na obra, o operador deve tirar fotos comuns com a câmera do celular e cadastrar no app posteriormente, quando houver conexão.
* **Falha no OCR (IA):** O fluxo será: `Foto -> Processamento da IA -> Tela de Formulário Preenchido`. O usuário **sempre** precisará revisar e clicar em "Salvar". Se a IA errar, ele edita o campo manualmente na hora. Haverá também um botão de "Preenchimento Manual" para pular a foto caso a API esteja indisponível.
* **Impressão Bluetooth:** A etiqueta impressa deve conter, além do QR Code, texto legível por humanos como backup (Sigla da Obra, Data, Idade Alvo e ID). Haverá um botão de "Reimprimir Etiqueta" no histórico de concretagens do app mobile para lidar com perda de conexão.
* **Assinatura Gov.br:** O processo será **manual**. O aplicativo web permitirá "Baixar Laudo (PDF)", e após a assinatura externa, um botão "Fazer Upload do Laudo Assinado". Automações complexas via API do governo ficam para o futuro.

### Escopo Excluído (Fora do MVP)
* Notificações Push nativas (substituídas por envio automático de e-mail).
* Módulo financeiro/bloqueio por falta de pagamento.
* Gestão e rastreabilidade física de moldes.
* Painel de auto-cadastro para clientes (o cadastro será interno, feito pelo laboratório).

---

## 3. Requisitos Funcionais (User Stories)

### 3.1. Campo (Sócio) - Mobile
* **US01:** Como Sócio, quero tirar foto de uma Nota Fiscal para que o sistema extraia os dados automaticamente (OCR) e preencha o formulário de concretagem (com opção de pular para preenchimento 100% manual em caso de falha de conexão).
* **US02:** Como Sócio, quero poder editar manualmente qualquer dado extraído da NF antes de salvar a concretagem.
* **US03:** Como Sócio, quero enviar um comando via Bluetooth para imprimir as 4 etiquetas térmicas com QR Code associadas àquela concretagem.
* **US04:** Como Sócio, quero ter a opção de reimprimir uma etiqueta específica caso a impressão falhe.
* **US05:** Como Sócio, quero abrir o app e ver uma "Agenda de Coletas", mostrando todos os CPs que completaram 24h na obra.
* **US06:** Como Sócio, quero bipar o QR Code de um CP para marcar que ele foi coletado e encaminhado à cura no laboratório.

### 3.2. Prensa (Engenheira) - Mobile
* **US07:** Como Engenheira, quero ver uma lista dos CPs que atingiram a idade de rompimento (ex: 7 ou 28 dias) para organizar meu trabalho na prensa.
* **US08:** Como Engenheira, quero inserir Peso, Diâmetro, Altura e Carga de Ruptura, e o app deve calcular a área real e a resistência (MPa) automaticamente.
* **US09:** Como Engenheira, quero selecionar o tipo de fratura do CP (através de ícones visuais baseados na NBR 5739).
* **US10:** Como Engenheira, quero poder "Descartar" um CP rompido se houver erro operacional, removendo-o da média final.
* **US11:** Como Engenheira, quero registrar fotos de "Antes e Depois" do rompimento, que não aparecerão no laudo do cliente, mas ficarão salvas em um anexo técnico.

### 3.3. Escritório e Painel (Engenheiro/Admin) - Web
* **US12:** Como Engenheiro de Escritório, quero visualizar todas as concretagens feitas em campo em tempo real.
* **US12b:** Como Engenheiro de Escritório, quero poder editar os dados de uma concretagem (ex: fck, volume) caso haja algum erro não percebido pelo Sócio no campo.
* **US13:** Como Engenheiro de Escritório, quero visualizar laudos "pré-prontos" gerados automaticamente após o rompimento na prensa. O sistema deve prever a emissão de um Laudo Parcial (7 dias) e um Laudo Final (28 dias).
* **US14:** Como Engenheiro de Escritório, quero que o sistema gere um PDF bloqueado contra edição, contendo o logotipo do laboratório, o QR Code de autenticação no rodapé, e os gráficos de resistência.
* **US15:** Como Engenheiro de Escritório, quero fazer o download do PDF não assinado, e o upload do PDF após assinatura (gov.br).
* **US16:** Como Admin, quero poder cadastrar manualmente as credenciais dos meus clientes no sistema.

### 3.4. Cliente (Portal) - Web
* **US17:** Como Cliente, quero fazer login com email e senha criados pelo laboratório.
* **US18:** Como Cliente, quero visualizar e baixar em PDF os laudos aprovados e assinados referentes à minha empresa/obra.
* **US19:** Como Cliente/Fiscal, quero apontar o celular para o QR Code impresso no rodapé de um laudo físico e ser direcionado para uma página pública de validação, que mostra os resultados originais (anti-fraude).

---

## 4. Requisitos Não-Funcionais
1. **Segurança:** O PDF final deve ser gerado (via Edge Function) com restrições de permissão (Ready-Only, sem cópia de texto).
2. **Confiabilidade:** O QR Code de verificação do laudo não deve requerer login, devendo ser uma URL pública e imutável atrelada a um hash único no banco de dados.
3. **Disponibilidade:** Interface Mobile deve ter botões grandes e de alto contraste na tela de prensa, devido ao uso de luvas e mãos sujas no laboratório.
4. **Tecnologias:**
   * Mobile: React Native + Expo.
   * Web: React + Vite + Tailwind CSS.
   * Backend: Supabase (Postgres, Auth, Storage, Edge Functions).
   * IA / OCR: GPT-4o-mini Vision via Edge Function.
