import { buildOcrFormState, type OcrNotaFiscalResponse } from '@concreto/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ConcretagemForm, emptyConcretagemFields } from './ConcretagemForm';

const OBRA_ID = 'b1111111-1111-1111-1111-111111111111';

const OCR: OcrNotaFiscalResponse = {
  fields: {
    nf_numero: { value: '123456', confidence: 0.98 },
    fck_projeto: { value: 30, confidence: 0.91 },
    volume_m3: { value: 8, confidence: 0.88 },
    data_concretagem: { value: '2026-05-20', confidence: 0.7 },
  },
  lowConfidenceFields: ['data_concretagem'],
};

describe('ConcretagemForm (F-S004-4/5)', () => {
  it('blocks the save with the exact message when a required field is empty (US01-CA3)', async () => {
    const onSave = jest.fn();
    render(
      <ConcretagemForm
        obraId={OBRA_ID}
        initialFields={emptyConcretagemFields()}
        dataConcretagem="2026-05-20"
        saving={false}
        onSave={onSave}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Salvar concretagem' }));

    await waitFor(
      () => expect(screen.getByText('Preencha os campos obrigatórios destacados.')).toBeTruthy(),
      { timeout: 8000 },
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('prefills OCR values and saves the concretagem with N CPs (US01/US02)', async () => {
    const onSave = jest.fn();
    render(
      <ConcretagemForm
        obraId={OBRA_ID}
        initialFields={buildOcrFormState(OCR)}
        dataConcretagem="2026-05-20"
        saving={false}
        onSave={onSave}
      />,
    );

    // OCR values are prefilled in the form.
    expect(screen.getByLabelText('Número da NF').props.value).toBe('123456');
    expect(screen.getByLabelText('FCK de projeto').props.value).toBe('30');
    expect(screen.getByLabelText('Volume').props.value).toBe('8');

    fireEvent.press(screen.getByRole('button', { name: 'Salvar concretagem' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled(), { timeout: 8000 });
    const payload = onSave.mock.calls[0]?.[0];
    expect(payload.concretagem).toMatchObject({
      obra_id: OBRA_ID,
      nf_numero: '123456',
      fck_projeto: 30,
      volume_m3: 8,
    });
    // Default molding (2×7d + 2×28d) → 4 specimens sent to the RPC.
    expect(payload.cps).toHaveLength(4);
  });

  it('edits the concretagem date in BR and stores it as ISO (QW-06)', async () => {
    const onSave = jest.fn();
    render(
      <ConcretagemForm
        obraId={OBRA_ID}
        initialFields={buildOcrFormState(OCR)}
        dataConcretagem="2026-05-20"
        saving={false}
        onSave={onSave}
      />,
    );

    // OCR date (2026-05-20) is shown in BR.
    expect(screen.getByLabelText('Data da concretagem').props.value).toBe('20/05/2026');

    fireEvent.changeText(screen.getByLabelText('Data da concretagem'), '08/07/2026');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar concretagem' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled(), { timeout: 8000 });
    expect(onSave.mock.calls[0]?.[0].concretagem.data_concretagem).toBe('2026-07-08');
  });

  it('blocks the save on an impossible date (QW-06)', async () => {
    const onSave = jest.fn();
    render(
      <ConcretagemForm
        obraId={OBRA_ID}
        initialFields={buildOcrFormState(OCR)}
        dataConcretagem="2026-05-20"
        saving={false}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Data da concretagem'), '31/02/2026');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar concretagem' }));

    await waitFor(
      () => expect(screen.getByText('Informe a data da concretagem (DD/MM/AAAA).')).toBeTruthy(),
      { timeout: 8000 },
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lets a manual value satisfy a required field and unblock the save (US02-CA1)', async () => {
    const onSave = jest.fn();
    render(
      <ConcretagemForm
        obraId={OBRA_ID}
        initialFields={emptyConcretagemFields()}
        dataConcretagem="2026-05-20"
        saving={false}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Número da NF'), 'NF-9');
    fireEvent.changeText(screen.getByLabelText('FCK de projeto'), '25');
    fireEvent.changeText(screen.getByLabelText('Volume'), '6');
    fireEvent.press(screen.getByRole('button', { name: 'Salvar concretagem' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled(), { timeout: 8000 });
    expect(onSave.mock.calls[0]?.[0].concretagem).toMatchObject({
      nf_numero: 'NF-9',
      fck_projeto: 25,
      volume_m3: 6,
    });
  });
});
