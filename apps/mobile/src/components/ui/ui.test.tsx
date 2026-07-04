import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BigButton } from './BigButton';
import { EmptyState } from './EmptyState';
import { LoadingButton } from './LoadingButton';
import { NumericInput } from './NumericInput';
import { StatusPill } from './StatusPill';

describe('mobile UI kit (F-S003-3)', () => {
  it('BigButton meets the >=56dp touch target and fires onPress', () => {
    const onPress = jest.fn();
    render(<BigButton label="Salvar" onPress={onPress} />);

    const button = screen.getByRole('button');
    const style = StyleSheet.flatten(button.props.style);
    expect(style.minHeight).toBe(56);

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('LoadingButton disables itself and shows a spinner while loading', () => {
    render(<LoadingButton label="Entrar" loading loadingLabel="Entrando..." />);
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    expect(screen.getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  it('NumericInput opens the numeric keypad and renders its error', () => {
    render(<NumericInput label="Carga" suffix="kgf" error="Informe a carga." />);
    const input = screen.getByLabelText('Carga');
    expect(input.props.keyboardType).toBe('decimal-pad');
    expect(screen.getByText('Carga (kgf)')).toBeTruthy();
    expect(screen.getByText('Informe a carga.')).toBeTruthy();
  });

  it('EmptyState renders icon, text and a CTA (SPEC §3.0 Empty state)', () => {
    render(
      <EmptyState
        icon="📄"
        title="Nenhum laudo."
        description="Aparecerão aqui."
        action={<BigButton label="Novo" onPress={() => {}} />}
      />,
    );
    expect(screen.getByText('Nenhum laudo.')).toBeTruthy();
    expect(screen.getByText('Novo')).toBeTruthy();
  });

  it('StatusPill renders its label', () => {
    render(<StatusPill label="Moldado" tone="info" />);
    expect(screen.getByText('Moldado')).toBeTruthy();
  });
});
