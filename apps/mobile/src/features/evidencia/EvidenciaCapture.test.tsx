import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { EvidenciaCapture } from './EvidenciaCapture';
import { captureWatermarkContext } from './evidencia-location';
import { capturePhoto, captureWatermarked } from './evidencia-photo';
import { uploadEvidencia } from './evidencia-service';

jest.mock('./evidencia-photo', () => ({
  capturePhoto: jest.fn(),
  captureWatermarked: jest.fn(),
}));
jest.mock('./evidencia-location', () => ({ captureWatermarkContext: jest.fn() }));
jest.mock('./evidencia-service', () => ({ uploadEvidencia: jest.fn() }));

const mockedCapturePhoto = capturePhoto as jest.MockedFunction<typeof capturePhoto>;
const mockedCaptureWatermarked = captureWatermarked as jest.MockedFunction<typeof captureWatermarked>;
const mockedContext = captureWatermarkContext as jest.MockedFunction<typeof captureWatermarkContext>;
const mockedUpload = uploadEvidencia as jest.MockedFunction<typeof uploadEvidencia>;

beforeEach(() => {
  mockedCapturePhoto.mockResolvedValue('file://photo.jpg');
  mockedCaptureWatermarked.mockResolvedValue('file://shot.png');
  mockedContext.mockResolvedValue({ cidade: 'Campo Grande', latitude: -20.4, longitude: -54.6 });
  mockedUpload.mockResolvedValue('antes/x.png');
});
afterEach(() => jest.clearAllMocks());

describe('EvidenciaCapture (F-S006-5)', () => {
  it('captures a photo, then offers to send it', async () => {
    render(<EvidenciaCapture rupturaId="r-1" />);
    fireEvent.press(screen.getByText('📷 Tirar foto (antes)'));
    expect(await screen.findByText('Enviar foto (antes)')).toBeTruthy();
  });

  it('still captures when GPS is denied — watermark without coordinates (US11-CA3)', async () => {
    mockedContext.mockResolvedValue({ cidade: null, latitude: null, longitude: null });
    render(<EvidenciaCapture rupturaId="r-1" />);
    fireEvent.press(screen.getByText('📷 Tirar foto (antes)'));
    // capture is not blocked: the send action appears
    expect(await screen.findByText('Enviar foto (antes)')).toBeTruthy();
  });

  it('uploads and confirms success', async () => {
    render(<EvidenciaCapture rupturaId="r-1" />);
    fireEvent.press(screen.getByText('📷 Tirar foto (antes)'));
    fireEvent.press(await screen.findByText('Enviar foto (antes)'));
    expect(await screen.findByText('✓ antes enviada')).toBeTruthy();
    expect(mockedUpload).toHaveBeenCalledWith({ rupturaId: 'r-1', tipo: 'antes', uri: 'file://shot.png' });
  });

  it('shows the exact retry copy on upload failure and keeps the photo', async () => {
    mockedUpload.mockRejectedValue(new Error('Falha ao enviar a foto. Tente novamente.'));
    render(<EvidenciaCapture rupturaId="r-1" />);
    fireEvent.press(screen.getByText('📷 Tirar foto (antes)'));
    fireEvent.press(await screen.findByText('Enviar foto (antes)'));
    expect(await screen.findByText('Falha ao enviar a foto. Tente novamente.')).toBeTruthy();
    // the captured photo is kept for a retry
    await waitFor(() => expect(screen.getByText('Refazer')).toBeTruthy());
  });
});
