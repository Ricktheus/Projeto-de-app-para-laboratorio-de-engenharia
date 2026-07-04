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
  CP_MANDATORIO_28D: 'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista.',
  CPS_PENDENTES:
    'Há corpos de prova pendentes. Conclua todos antes de marcar como pronto para assinatura.',
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

  // Export (SPEC §5.6).
  SEM_DADOS: 'Nenhum dado encontrado para os filtros selecionados.',
} as const;

/** The full catalog, grouped by concern. */
export const MESSAGES = {
  http: HTTP_MESSAGES,
  auth: AUTH_MESSAGES,
  uiState: UI_STATE_MESSAGES,
  domain: DOMAIN_MESSAGES,
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

/**
 * Builds the mandatory-28d block message, optionally appending the earliest
 * allowed rupture date, e.g. "…antes da idade prevista (2026-06-17)." (SPEC §5.2).
 */
export function cpMandatorio28dMessage(dataPrevista?: string): string {
  const base = 'Este CP de 28d é obrigatório e não pode ser rompido antes da idade prevista';
  return dataPrevista ? `${base} (${dataPrevista}).` : `${base}.`;
}
