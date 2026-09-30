/**
 * Precise money arithmetic utility matching Python's Decimal with ROUND_HALF_UP.
 * Floating point numbers are prone to representation errors (e.g. 0.1 + 0.2 != 0.3).
 * Here we scale to cents/integers for intermediate arithmetic and round half up to 2 places.
 */

export class MoneyDecimal {
  private readonly valueInCents: bigint;

  constructor(val: number | string | bigint) {
    if (typeof val === 'bigint') {
      this.valueInCents = val;
    } else if (typeof val === 'number') {
      // Round half up when converting to cents
      const scaled = val * 100;
      this.valueInCents = BigInt(Math.sign(scaled) * Math.floor(Math.abs(scaled) + 0.5));
    } else {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) {
        this.valueInCents = 0n;
      } else {
        const scaled = parsed * 100;
        this.valueInCents = BigInt(Math.sign(scaled) * Math.floor(Math.abs(scaled) + 0.5));
      }
    }
  }

  static fromCents(cents: bigint): MoneyDecimal {
    return new MoneyDecimal(cents);
  }

  add(other: MoneyDecimal | number): MoneyDecimal {
    const o = other instanceof MoneyDecimal ? other : new MoneyDecimal(other);
    return new MoneyDecimal(this.valueInCents + o.valueInCents);
  }

  sub(other: MoneyDecimal | number): MoneyDecimal {
    const o = other instanceof MoneyDecimal ? other : new MoneyDecimal(other);
    return new MoneyDecimal(this.valueInCents - o.valueInCents);
  }

  mul(factor: number): MoneyDecimal {
    // Round half up on multiplication
    const product = Number(this.valueInCents) * factor;
    const rounded = Math.sign(product) * Math.floor(Math.abs(product) + 0.5);
    return new MoneyDecimal(BigInt(rounded));
  }

  div(divisor: number): MoneyDecimal {
    if (divisor === 0) throw new Error("Division by zero");
    const quotient = Number(this.valueInCents) / divisor;
    const rounded = Math.sign(quotient) * Math.floor(Math.abs(quotient) + 0.5);
    return new MoneyDecimal(BigInt(rounded));
  }

  toNumber(): number {
    return Number(this.valueInCents) / 100;
  }

  isNegative(): boolean {
    return this.valueInCents < 0n;
  }

  isZero(): boolean {
    return this.valueInCents === 0n;
  }

  greaterThan(other: MoneyDecimal | number): boolean {
    const o = other instanceof MoneyDecimal ? other : new MoneyDecimal(other);
    return this.valueInCents > o.valueInCents;
  }

  lessThan(other: MoneyDecimal | number): boolean {
    const o = other instanceof MoneyDecimal ? other : new MoneyDecimal(other);
    return this.valueInCents < o.valueInCents;
  }

  toString(): string {
    return this.toNumber().toFixed(2);
  }
}

export function roundHalfUp(num: number): number {
  return new MoneyDecimal(num).toNumber();
}

/**
 * Format number into Indian currency representation (e.g. ₹48,60,000)
 */
export function formatINR(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '₹0';
  
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian numbering system format: last 3 digits, then groups of 2 digits
  let result = '';
  if (integerPart.length > 3) {
    const last3 = integerPart.substring(integerPart.length - 3);
    const rest = integerPart.substring(0, integerPart.length - 3);
    result = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  } else {
    result = integerPart;
  }

  // Omit .00 if requested or keep clean
  const formatted = decimalPart === '00' ? result : `${result}.${decimalPart}`;
  return `${isNegative ? '-' : ''}₹${formatted}`;
}
