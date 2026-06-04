'use client';

import { useSelectAllOnFocus } from '../../../lib/selectAllOnFocus';

/**
 * Tap-friendly quantity control: − button | editable value | + button.
 * Minimum is 0 (decrement never goes below zero). Each control carries an
 * aria-label naming the product and the action; tap targets are ≥44px (set in
 * globals.css). The value stays keyboard-editable for power users.
 */
export function QuantityStepper({
  productName,
  value,
  onChange,
}: {
  productName: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(value + 1);
  const selectAllOnFocus = useSelectAllOnFocus();

  return (
    <div className="stepper">
      <button
        type="button"
        aria-label={`Quitar uno de ${productName}`}
        onClick={dec}
        disabled={value <= 0}
      >
        −
      </button>
      <input
        className="value"
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={`Cantidad de ${productName}`}
        value={value}
        {...selectAllOnFocus}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
      <button
        type="button"
        aria-label={`Agregar uno de ${productName}`}
        onClick={inc}
      >
        +
      </button>
    </div>
  );
}
