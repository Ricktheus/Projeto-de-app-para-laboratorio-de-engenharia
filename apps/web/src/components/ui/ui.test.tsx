import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BigButton } from './BigButton';
import { EmptyState } from './EmptyState';
import { LoadingButton } from './LoadingButton';
import { NumericInput } from './NumericInput';
import { StatusPill } from './StatusPill';

describe('UI kit (F-S003-3)', () => {
  it('BigButton meets the >=56dp ergonomic target and forwards clicks', async () => {
    const onClick = vi.fn();
    render(<BigButton onClick={onClick}>Salvar</BigButton>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button.className).toContain('min-h-touch');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('LoadingButton disables itself and shows a spinner while loading (no double submit)', () => {
    const { rerender } = render(<LoadingButton loading={false}>Entrar</LoadingButton>);
    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeEnabled();

    rerender(
      <LoadingButton loading loadingLabel="Entrando...">
        Entrar
      </LoadingButton>,
    );
    const busy = screen.getByRole('button', { name: /Entrando/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('NumericInput opens the numeric keypad and renders its error', () => {
    render(<NumericInput label="Carga" suffix="kgf" error="Informe a carga." />);
    const input = screen.getByLabelText('Carga');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe a carga.')).toBeInTheDocument();
  });

  it('EmptyState renders icon, text and a CTA (SPEC §3.0 Empty state)', () => {
    render(
      <EmptyState
        icon="📄"
        title="Nenhum laudo."
        description="Aparecerão aqui."
        action={<BigButton>Novo</BigButton>}
      />,
    );
    expect(screen.getByText('Nenhum laudo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });

  it('StatusPill renders its label', () => {
    render(<StatusPill label="Moldado" tone="info" />);
    expect(screen.getByText('Moldado')).toBeInTheDocument();
  });
});
