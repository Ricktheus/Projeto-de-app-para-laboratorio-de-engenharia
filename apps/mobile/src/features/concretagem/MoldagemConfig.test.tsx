import { fireEvent, render, screen } from '@testing-library/react-native';

import { MoldagemConfig } from './MoldagemConfig';

describe('MoldagemConfig (US02-CA2)', () => {
  it('applies an optional shortcut', () => {
    const onChange = jest.fn();
    render(<MoldagemConfig items={[]} onChange={onChange} />);

    fireEvent.press(screen.getByText('2×7d + 2×28d'));

    expect(onChange).toHaveBeenCalledWith([
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 2 },
    ]);
  });

  it('adds a new age row (free configuration)', () => {
    const onChange = jest.fn();
    render(<MoldagemConfig items={[{ idadeAlvoDias: 7, quantidade: 2 }]} onChange={onChange} />);

    fireEvent.press(screen.getByText('+ Adicionar idade'));

    expect(onChange).toHaveBeenCalledWith([
      { idadeAlvoDias: 7, quantidade: 2 },
      { idadeAlvoDias: 28, quantidade: 1 },
    ]);
  });
});
