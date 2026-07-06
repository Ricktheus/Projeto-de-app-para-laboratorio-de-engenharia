import { describe, expect, it } from 'vitest';

import { buildEmailContent } from './templates';

describe('buildEmailContent', () => {
  it('renders the exact SPEC copy for laudo assinado (US24-CA1)', () => {
    const { corpo } = buildEmailContent('laudo_assinado');
    expect(corpo.startsWith('Seu laudo está disponível para download.')).toBe(true);
  });

  it('renders the exact SPEC copy for pronto_assinatura (US24-CA2)', () => {
    const { corpo } = buildEmailContent('pronto_assinatura');
    expect(corpo.startsWith('Há laudo(s) aguardando sua assinatura.')).toBe(true);
  });

  it('interpolates the pending count for cps_pendentes_coleta (US24-CA3)', () => {
    expect(buildEmailContent('cps_pendentes_coleta', { quantidade: 5 }).corpo).toBe(
      'Existem 5 CPs pendentes de coleta.',
    );
  });

  it('appends the portal link and report number when provided', () => {
    const { corpo } = buildEmailContent('laudo_assinado', {
      numero: 'N-003',
      portalUrl: 'https://lab.example.com/portal',
    });
    expect(corpo).toContain('Laudo N-003');
    expect(corpo).toContain('https://lab.example.com/portal');
  });

  it('welcomes a new client with the portal link (US24-CA4)', () => {
    const { assunto, corpo } = buildEmailContent('novo_cliente', {
      portalUrl: 'https://lab.example.com/portal',
    });
    expect(assunto).toContain('portal');
    expect(corpo).toContain('https://lab.example.com/portal');
  });
});
