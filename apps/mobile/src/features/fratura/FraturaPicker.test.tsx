import { fireEvent, render, screen } from '@testing-library/react-native';

import { FraturaPicker } from './FraturaPicker';

describe('FraturaPicker (F-S006-3)', () => {
  it('renders the 6 laboratory fracture types with their exact labels (US09-CA1)', () => {
    render(<FraturaPicker value={null} onChange={jest.fn()} />);
    for (const label of [
      'Ruptura de Cabeça',
      'Ruptura de Face',
      'Ruptura Parcial',
      'Ruptura Total',
      'Ruptura de Cisalhamento',
      'Ruptura de Trinca',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('emits the enum value when a type is picked', () => {
    const onChange = jest.fn();
    render(<FraturaPicker value={null} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Ruptura de Cisalhamento'));
    expect(onChange).toHaveBeenCalledWith('ruptura_cisalhamento');
  });

  it('shows the sad-path error when required and unset', () => {
    render(<FraturaPicker value={null} onChange={jest.fn()} error="Selecione o tipo de fratura." />);
    expect(screen.getByText('Selecione o tipo de fratura.')).toBeTruthy();
  });

  it('marks the selected option', () => {
    render(<FraturaPicker value="ruptura_total" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Ruptura Total').props.accessibilityState.selected).toBe(true);
  });
});
