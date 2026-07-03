/**
 * Brazilian CNPJ validation by its two check digits (Appendix A #6).
 * Accepts a formatted ("00.000.000/0000-00") or raw (14-digit) string.
 */
export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) {
    return false;
  }
  // Reject sequences of a single repeated digit (structurally invalid).
  if (/^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const checkDigit = (length: number): number => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i += 1) {
      sum += Number(digits[i]) * weight;
      weight -= 1;
      if (weight < 2) {
        weight = 9;
      }
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return checkDigit(12) === Number(digits[12]) && checkDigit(13) === Number(digits[13]);
}
