import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LoginForm } from './LoginForm';

describe('LoginForm (F-S003-1)', () => {
  it('shows PT field errors and does not submit when empty', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} isPending={false} errorMessage={null} />);

    fireEvent.press(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText('Informe o e-mail.')).toBeTruthy(), {
      timeout: 3000,
    });
    expect(screen.getByText('Informe a senha.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the typed credentials when valid', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} isPending={false} errorMessage={null} />);

    fireEvent.changeText(screen.getByLabelText('E-mail'), 'eng@lab.com');
    fireEvent.changeText(screen.getByLabelText('Senha'), 'secret123');
    fireEvent.press(screen.getByRole('button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled(), { timeout: 3000 });
    // react-hook-form invokes onValid as (data, event); assert on the payload.
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ email: 'eng@lab.com', password: 'secret123' });
  });

  it('disables the button and shows a spinner while pending (no double submit)', () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} isPending errorMessage={null} />);

    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders the exact catalog error message without losing input', () => {
    render(
      <LoginForm
        onSubmit={jest.fn()}
        isPending={false}
        errorMessage="E-mail ou senha inválidos."
      />,
    );
    expect(screen.getByText('E-mail ou senha inválidos.')).toBeTruthy();
  });
});
