import { fireEvent, render, screen } from '@testing-library/react-native';

import { MoldagemConfig } from './MoldagemConfig';

describe('MoldagemConfig (US02-CA2)', () => {
  it('applies an optional shortcut', () => {
    const onChange = jest.fn();
    render(<MoldagemConfig items={[]} onChange={onChange} dataMoldagem="2026-07-01" />);

    fireEvent.press(screen.getByText('2×7d + 2×28d'));

    expect(onChange).toHaveBeenCalledWith([
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 2 },
    ]);
  });

  it('adds a new age row (free configuration)', () => {
    const onChange = jest.fn();
    render(
      <MoldagemConfig
        items={[{ idadeAlvoDias: 7, quantidade: 2 }]}
        onChange={onChange}
        dataMoldagem="2026-07-01"
      />,
    );

    fireEvent.press(screen.getByText('+ Adicionar idade'));

    expect(onChange).toHaveBeenCalledWith([
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 1 },
    ]);
  });

  it('previews the planned rupture dates from the molding date (QW-07)', () => {
    render(
      <MoldagemConfig
        items={[
          { idadeAlvoDias: 7, quantidade: 2 },
          { idadeAlvoDias: 28, quantidade: 2 },
        ]}
        onChange={jest.fn()}
        dataMoldagem="2026-07-01"
      />,
    );

    expect(screen.getByText('Rompimentos planejados')).toBeTruthy();
    // 2026-07-01 + 7d = 08/07/2026 ; + 28d = 29/07/2026.
    expect(screen.getByText('08/07/2026')).toBeTruthy();
    expect(screen.getByText('29/07/2026')).toBeTruthy();
    expect(screen.getByText('2× 7d')).toBeTruthy();
    expect(screen.getByText('2× 28d')).toBeTruthy();
  });
});
