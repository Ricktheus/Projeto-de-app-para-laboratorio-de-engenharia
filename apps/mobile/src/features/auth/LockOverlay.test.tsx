import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { authenticateBiometric } from '../../services/biometrics';
import { useAuthStore } from '../../stores/auth-store';

import { LockOverlay } from './LockOverlay';
import { signOut } from './auth-service';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../../services/biometrics', () => ({ authenticateBiometric: jest.fn() }));
jest.mock('./auth-service', () => ({ signOut: jest.fn().mockResolvedValue(undefined) }));

const mockedAuth = authenticateBiometric as jest.MockedFunction<typeof authenticateBiometric>;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ locked: true, status: 'authenticated' });
});

describe('LockOverlay (QW-22)', () => {
  it('unlocks automatically when biometrics succeed on mount', async () => {
    mockedAuth.mockResolvedValue(true);
    render(<LockOverlay />);
    await waitFor(() => expect(useAuthStore.getState().locked).toBe(false));
  });

  it('stays locked when biometrics fail, and retries on "Desbloquear"', async () => {
    mockedAuth.mockResolvedValueOnce(false); // auto-prompt fails
    render(<LockOverlay />);
    await waitFor(() => expect(mockedAuth).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().locked).toBe(true);

    mockedAuth.mockResolvedValueOnce(true); // manual retry succeeds
    fireEvent.press(screen.getByRole('button', { name: 'Desbloquear' }));
    await waitFor(() => expect(useAuthStore.getState().locked).toBe(false));
  });

  it('signs out and returns to login on "Sair"', async () => {
    mockedAuth.mockResolvedValue(false);
    render(<LockOverlay />);
    fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
