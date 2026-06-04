'use client';

/**
 * Two-field customer phone entry in the Argentine `0[area] 15[number]`
 * convention. The `0` and `15` are static, non-editable decorations; the
 * manager only edits the area code (pre-filled with `381` by the parent) and
 * the local number. Pure presentational — state lives in the parent, which
 * composes/validates the value via `composePhoneE164`/`isValidPhoneEntry`.
 */
export function PhoneField({
  areaCode,
  localNumber,
  onAreaCodeChange,
  onLocalNumberChange,
  disabled,
  autoFocus,
  id = 'phone-local',
}: {
  areaCode: string;
  localNumber: string;
  onAreaCodeChange: (value: string) => void;
  onLocalNumberChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}) {
  const digits = (value: string) => value.replace(/\D/g, '');

  return (
    <div className="field">
      <label htmlFor={id}>Teléfono</label>
      <div className="phone-entry">
        <span className="phone-fixed" aria-hidden="true">
          0
        </span>
        <input
          className="phone-area"
          inputMode="numeric"
          aria-label="Código de área"
          value={areaCode}
          disabled={disabled}
          onChange={(e) => onAreaCodeChange(digits(e.target.value))}
        />
        <span className="phone-fixed" aria-hidden="true">
          15
        </span>
        <input
          id={id}
          className="phone-local"
          inputMode="numeric"
          aria-label="Número local"
          placeholder="1234567"
          value={localNumber}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => onLocalNumberChange(digits(e.target.value))}
        />
      </div>
    </div>
  );
}
