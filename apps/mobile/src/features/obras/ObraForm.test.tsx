import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ObraForm } from './ObraForm';

const CLIENTES = [
  { id: 'c1111111-1111-1111-1111-111111111111', nome: 'Cliente A' },
  { id: 'c2222222-2222-2222-2222-222222222222', nome: 'Cliente B' },
];

describe('ObraForm (F-S004-2)', () => {
  it('blocks submit and shows field errors when required fields are empty', async () => {
    const onSubmit = jest.fn();
    render(<ObraForm clientes={CLIENTES} submitting={false} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByRole('button', { name: 'Cadastrar obra' }));

    await waitFor(() => expect(screen.getByText('Selecione um cliente.')).toBeTruthy(), {
      timeout: 8000,
    });
    expect(screen.getByText('Informe o nome da obra.')).toBeTruthy();
    expect(screen.getByText('Informe a sigla da obra.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the selected client and typed fields (US20-CA1)', async () => {
    const onSubmit = jest.fn();
    render(<ObraForm clientes={CLIENTES} submitting={false} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByText('Cliente A'));
    fireEvent.changeText(screen.getByLabelText('Nome da obra'), 'Residencial X');
    fireEvent.changeText(screen.getByLabelText('Sigla'), 'RESX');
    fireEvent.press(screen.getByRole('button', { name: 'Cadastrar obra' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), { timeout: 8000 });
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      clienteId: 'c1111111-1111-1111-1111-111111111111',
      nome: 'Residencial X',
      sigla: 'RESX',
    });
  });

  it('shows the sigla-duplicate error and disables submit while saving', () => {
    const onSubmit = jest.fn();
    render(
      <ObraForm
        clientes={CLIENTES}
        submitting
        errorMessage="Já existe uma obra com esta sigla para este cliente."
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Já existe uma obra com esta sigla para este cliente.')).toBeTruthy();
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });
});
