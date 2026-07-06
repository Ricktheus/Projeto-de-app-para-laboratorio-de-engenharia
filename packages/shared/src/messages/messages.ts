/**
 * Central Portuguese message catalog (SPEC §3.0 + the exact error strings of
 * SPEC §5). This is the single source of truth for user-facing copy: mobile,
 * web and Edge Functions resolve messages from here so the exact wording never
 * drifts. Domain code throws/returns machine CODES only; this catalog maps a
 * code to its Portuguese message.
 */

/** Generic HTTP error messages (SPEC §3.0). */
const HTTP_MESSAGES = {
  /** 401 — session expired / not authenticated. */
  unauthorized: 'Sua sessão expirou. Faça login novamente.',
  /** 403 — no permission. */
  forbidden: 'Você não tem permissão para executar esta ação.',
  /** 404 — resource not found. */
  notFound: 'Registro não encontrado.',
  /** 409 — optimistic-locking conflict. */
  conflict: 'Dados foram alterados por outro usuário. Recarregue a página.',
  /** 400 — payload validation. */
  validation: 'Verifique os campos destacados.',
  /** 429 — rate limit. */
  rateLimit: 'Limite de tentativas atingido. Tente novamente mais tarde.',
  /** 500 — server error. */
  serverError: 'Erro inesperado. Tente novamente em instantes.',
  /** No network. */
  offline: 'Sem conexão com a internet.',
} as const;

/** Authentication & role-routing copy (SPEC §3, F-S003-1 / F-S003-2). */
const AUTH_MESSAGES = {
  /** Generic sign-in failure — never reveals whether the e-mail exists (US17-CA2). */
  invalidCredentials: 'E-mail ou senha inválidos.',
  /** Client-side login throttle: 3+ failures in 5 min. */
  tooManyAttempts: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.',
  /** 401 / expired session on any authenticated call. */
  sessionExpired: 'Sua sessão expirou. Faça login novamente.',
  /** Role tried to open a page it is not allowed to (route guard toast). */
  forbiddenPage: 'Você não tem permissão para acessar esta página.',
} as const;

/** Standard UI-state copy (SPEC §3.0). */
const UI_STATE_MESSAGES = {
  /** Fallback copy for the global ErrorBoundary. */
  unexpectedRender: 'Ocorreu um erro inesperado. Tente novamente.',
  /** Example empty-state copy (each screen provides its own CTA). */
  emptyConcretagens: 'Nenhuma concretagem cadastrada. Toque em + para começar.',
} as const;

/**
 * Feature-specific copy for Sprint S004 (Clientes/Usuários, Obras, Concretagem,
 * OCR). Kept in the shared catalog so the mobile app, the web app and the Edge
 * Functions render the EXACT strings the SPEC prescribes — the wording never
 * drifts between platforms (DRY).
 */
const FEATURE_MESSAGES = {
  // Clientes / Usuários (F-S004-1).
  clienteCriado: 'Cliente cadastrado e convite enviado.',
  usuarioCriado: 'Usuário cadastrado e convite enviado.',
  emailJaCadastrado: 'Já existe um usuário com este e-mail.',
  cnpjInvalido: 'CNPJ inválido.',
  emptyClientes: 'Nenhum cliente cadastrado.',
  emptyUsuarios: 'Nenhum usuário cadastrado além dos administradores.',

  // Obras (F-S004-2 / F-S004-3).
  obraSiglaDuplicada: 'Já existe uma obra com esta sigla para este cliente.',
  obraComConcretagens:
    'Esta obra possui concretagens e não pode ser excluída. Você pode inativá-la.',
  obraCriada: 'Obra cadastrada com sucesso.',
  obraAtualizada: 'Obra atualizada com sucesso.',
  obraInativada: 'Obra inativada. O histórico foi preservado.',
  emptyObras: 'Nenhuma obra cadastrada. Toque em + para criar.',

  // OCR da NF / concretagem (F-S004-4 / F-S004-5).
  ocrLendo: 'Lendo nota fiscal…',
  ocrPreenchimentoManual: 'Preenchimento Manual',
  ocrRefazer: 'Refazer',
  camposObrigatorios: 'Preencha os campos obrigatórios destacados.',
  concretagemSalva: 'Concretagem salva com sucesso.',

  // Etiquetas Bluetooth (F-S005-1 / F-S005-2).
  bluetoothIndisponivel: 'Ative o Bluetooth e conceda as permissões para imprimir.',
  impressoraNaoRespondeu: 'A impressora não respondeu. Verifique a conexão e o papel.',
  impressoraNaoEncontrada: 'Nenhuma impressora Bluetooth encontrada. Verifique se está ligada.',
  etiquetasEnviadas: 'Etiquetas enviadas para a impressora.',
  etiquetaReenviada: 'Etiqueta reenviada.',
  selecioneImpressora: 'Selecione a impressora Bluetooth.',
  emptyEtiquetas: 'Nenhuma concretagem para etiquetar nesta obra.',

  // Agenda de coletas / bipagem (F-S005-3 / F-S005-4).
  emptyAgendaColeta: 'Nenhuma coleta pendente para hoje.',
  coletaConfirmada: 'CP coletado com sucesso.',
  coletaAtrasadaAviso: 'Coleta após 24h: será registrada uma ressalva no laudo.',

  // Prensa / ruptura (F-S006-1 / F-S006-2 / F-S006-3).
  emptyPrensa: 'Nenhum CP para romper hoje.',
  buscarCpQr: 'Buscar por QR',
  rupturaRegistrada: 'Ruptura registrada com sucesso.',
  selecioneFratura: 'Selecione o tipo de fratura.',
  // Very low load: almost certainly typed in kN instead of kgf (~102 kgf/kN).
  cargaMuitoBaixaKn: 'Valor muito baixo. Você digitou em kN em vez de kgf?',

  // Descarte / expurgo (F-S006-4).
  motivoDescarteObrigatorio: 'Informe o motivo do descarte/expurgo.',
  cpDescartado: 'Corpo de prova descartado.',
  resultadoExpurgado: 'Resultado expurgado (removido da média).',
  cpEstadoInvalidoAcao: 'Este corpo de prova não está em um estado válido para esta ação.',

  // Fotos de evidência (F-S006-5).
  evidenciaEnviada: 'Foto de evidência enviada.',
  evidenciaFalhaUpload: 'Falha ao enviar a foto. Tente novamente.',

  // Painel do escritório — concretagens em tempo real (F-S007-1).
  painelErroCarregar: 'Não foi possível carregar as concretagens.',
  painelTentarNovamente: 'Tentar novamente',
  emptyConcretagensPainel: 'Nenhuma concretagem cadastrada.',

  // Edição de concretagem (F-S007-2).
  concretagemAtualizada: 'Concretagem atualizada com sucesso.',
  concretagemRecarregar: 'Recarregar',

  // Laudos pré-prontos (F-S007-3).
  emptyLaudos: 'Nenhum laudo pré-pronto. Eles aparecem após o primeiro rompimento válido.',
  laudoMarcadoPronto: 'Laudo marcado como pronto para assinatura.',
  laudoParcialEmitido: 'Laudo parcial gerado.',
  laudoAgrupado: 'Laudo consolidado gerado.',
  laudoParcialIdadeInvalida: 'Laudo parcial disponível apenas para 7 ou 14 dias.',
  laudoAgruparObrasDiferentes: 'Só é possível agrupar concretagens da mesma obra.',
  laudoAgruparPoucas: 'Selecione ao menos duas concretagens para agrupar.',
  laudoNaoRascunho: 'Este laudo não está mais em rascunho. Recarregue a página.',

  // Portal do cliente (F-S009-1 / US18).
  emptyPortalLaudos: 'Você ainda não possui laudos disponíveis.',
  portalBaixarLaudo: 'Baixar laudo (PDF)',
  portalTodasObras: 'Todas as obras',

  // Validação pública via QR (F-S009-2 / US19).
  validacaoAutentico: 'Laudo autêntico.',
  validacaoNaoAutentico: 'Laudo não encontrado / não autêntico.',
  validacaoEmAtualizacao: 'Este laudo está em processo de atualização.',

  // Exportação Excel (F-S009-3 / US23).
  exportarExcel: 'Exportar Excel',
  exportandoExcel: 'Gerando planilha…',
  exportacaoConcluida: 'Planilha gerada com sucesso.',

  // Geração de PDF / assinatura / versionamento (F-S008-1 / F-S008-2 / F-S008-3).
  laudoGerarPdf: 'Gerar PDF',
  laudoGerandoPdf: 'Gerando laudo…',
  laudoPdfGerado: 'PDF gerado com sucesso.',
  laudoBaixarPdf: 'Baixar Laudo (PDF)',
  laudoBaixandoPdf: 'Baixando…',
  laudoUploadAssinado: 'Enviar PDF assinado',
  laudoEnviandoAssinado: 'Enviando…',
  laudoAssinadoPublicado: 'Laudo assinado e publicado ao cliente.',
  laudoUploadElaborador: 'Enviar 2ª assinatura (elaborador) — opcional',
  laudoCorrigir: 'Corrigir laudo',
  laudoCorrigindo: 'Criando correção…',
  laudoCorrigido: 'Correção criada. Nova versão gerada em rascunho.',
} as const;

/**
 * Domain / Edge-Function error codes → exact Portuguese messages. Codes cover
 * the domain errors and state-machine guard reasons defined in this sprint,
 * plus the RPC/Edge error strings from SPEC §5 (kept here so later sprints reuse
 * them verbatim instead of re-typing the copy).
 */
const DOMAIN_MESSAGES = {
  // Engineering domain errors (F-S002-1 / F-S002-2).
  CARGA_INVALIDA: 'Informe uma carga de ruptura válida.',
  DIAMETRO_INVALIDO: 'Informe um diâmetro nominal válido.',
  FATOR_PROJECAO_INVALIDO: 'Fator de projeção inválido. Verifique as configurações.',

  // State-machine guard reasons (F-S002-3).
  TRANSICAO_INVALIDA: 'Esta transição de estado não é permitida.',
  CP_ESTADO_INVALIDO: 'Este CP não está disponível para ruptura.',
  MOTIVO_OBRIGATORIO: 'Informe o motivo para continuar.',

  // Coleta / bipagem de QR (F-S005-4). CP_NAO_COLETAVEL is the base copy; the
  // scanner appends "(status atual: {status})." via cpNaoColetavelMessage().
  CP_NAO_ENCONTRADO: 'CP não encontrado.',
  CP_JA_COLETADO: 'CP já coletado.',
  CP_NAO_COLETAVEL: 'Este CP não pode ser coletado.',
  CP_MANDATORIO_28D: 'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista.',
  // Exact copy prescribed by SPEC F-S007-3 (marcar pronto_assinatura com CPs
  // pendentes). This is the single source; the laudo state machine and the
  // `marcar_pronto_assinatura` RPC both surface it through messageForLaudoRpcError.
  CPS_PENDENTES:
    'Existem CPs pendentes nesta(s) idade(s). Conclua os rompimentos antes de avançar.',
  SEM_PDF_ASSINADO: 'Faça o upload do PDF assinado antes de publicar o laudo.',

  // OCR (SPEC §5.1).
  OCR_LIMITE: 'Limite de 3 tentativas de leitura atingido. Preencha manualmente.',
  OCR_TIMEOUT: 'Não foi possível processar. Preencha manualmente.',
  OCR_FALHA: 'Não foi possível processar. Preencha manualmente.',

  // Laudo / PDF (SPEC §5.3–§5.5).
  LAUDO_NAO_PRONTO: 'O laudo precisa estar pronto para assinatura antes de gerar o PDF.',
  SEM_RESULTADOS: 'Não há resultados válidos para gerar o laudo.',
  ARQUIVO_INVALIDO: 'Envie um arquivo PDF válido.',
  LAUDO_NAO_ENCONTRADO: 'Laudo não encontrado / não autêntico.',
  // Versionamento / correção (F-S008-3 / US22).
  LAUDO_NAO_ASSINADO: 'Só é possível corrigir laudos já assinados.',

  // Export (SPEC §5.6).
  SEM_DADOS: 'Nenhum dado encontrado para os filtros selecionados.',
} as const;

/**
 * Transactional e-mail copy (F-S009-4 / US24). The mandated sentence of each
 * event is the EXACT SPEC string; the `enviar-email` worker composes the body
 * from these so the wording never drifts. `cpsPendentesColeta` interpolates the
 * pending count via {@link cpsPendentesColetaBody}.
 */
const EMAIL_MESSAGES = {
  // laudo assinado/publicado -> cliente (US24-CA1).
  laudoAssinadoAssunto: 'Seu laudo está disponível',
  laudoAssinadoCorpo: 'Seu laudo está disponível para download.',
  // laudo pronto_assinatura -> RT (US24-CA2).
  prontoAssinaturaAssunto: 'Laudo aguardando assinatura',
  prontoAssinaturaCorpo: 'Há laudo(s) aguardando sua assinatura.',
  // CPs moldado >24h sem coleta -> sócio (US24-CA3, cron diário).
  cpsPendentesAssunto: 'CPs pendentes de coleta',
  // novo cliente -> boas-vindas com link do portal e definição de senha (US24-CA4).
  novoClienteAssunto: 'Bem-vindo ao portal do laboratório',
  novoClienteCorpo:
    'Sua conta foi criada. Acesse o portal para definir sua senha e baixar seus laudos.',
} as const;

/** Builds the pending-collection body with the interpolated count (US24-CA3). */
export function cpsPendentesColetaBody(quantidade: number): string {
  return `Existem ${quantidade} CPs pendentes de coleta.`;
}

/** The full catalog, grouped by concern. */
export const MESSAGES = {
  http: HTTP_MESSAGES,
  auth: AUTH_MESSAGES,
  uiState: UI_STATE_MESSAGES,
  feature: FEATURE_MESSAGES,
  domain: DOMAIN_MESSAGES,
  email: EMAIL_MESSAGES,
} as const;

/** A resolvable domain/Edge error code. */
export type DomainMessageCode = keyof typeof DOMAIN_MESSAGES;

/** HTTP status → generic Portuguese message (SPEC §1.4 central normalizer). */
export const HTTP_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  400: HTTP_MESSAGES.validation,
  401: HTTP_MESSAGES.unauthorized,
  403: HTTP_MESSAGES.forbidden,
  404: HTTP_MESSAGES.notFound,
  409: HTTP_MESSAGES.conflict,
  429: HTTP_MESSAGES.rateLimit,
  500: HTTP_MESSAGES.serverError,
};

/** Maps an HTTP status to its message, defaulting to the generic server error. */
export function messageForHttpStatus(status: number): string {
  return HTTP_ERROR_MESSAGES[status] ?? HTTP_MESSAGES.serverError;
}

/** Maps a domain/Edge code to its message, defaulting to the generic server error. */
export function messageForDomainCode(code: string): string {
  return Object.prototype.hasOwnProperty.call(DOMAIN_MESSAGES, code)
    ? DOMAIN_MESSAGES[code as DomainMessageCode]
    : HTTP_MESSAGES.serverError;
}

/** Options for {@link cpMandatorio28dMessage}. */
export interface Mandatorio28dMessageOptions {
  /**
   * The specimen's target age in days — the "{idade}d" in the message. The
   * mandatory specimens are the 2 highest target ages, usually 28d but possibly
   * 63d/91d, so the age is interpolated rather than hard-coded. Defaults to 28.
   */
  idade?: number;
  /** Earliest allowed rupture date (ISO 'YYYY-MM-DD'), appended in parentheses. */
  data?: string;
}

/**
 * Builds the mandatory-specimen block message (F-S006-2 / SPEC §5.2), e.g.
 * "Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista
 * (2026-06-17)." The target age and the earliest allowed date are both optional
 * (age defaults to 28) so the same builder serves the RPC error mapping and any
 * client-side preview.
 */
export function cpMandatorio28dMessage(options: Mandatorio28dMessageOptions = {}): string {
  const idade = options.idade ?? 28;
  const base = `Este CP de ${idade}d é obrigatório e não pode ser rompido antes da idade prevista`;
  return options.data ? `${base} (${options.data}).` : `${base}.`;
}

/**
 * Builds the "cannot collect" message for a specimen in a non-collectable state,
 * appending the current status, e.g. "…(status atual: rompido)." (F-S005-4).
 * Falls back to the base copy when the status is unknown.
 */
export function cpNaoColetavelMessage(status?: string): string {
  const base = DOMAIN_MESSAGES.CP_NAO_COLETAVEL.replace(/\.$/, '');
  return status ? `${base} (status atual: ${status}).` : `${base}.`;
}
