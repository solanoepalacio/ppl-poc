## 1. Composition helper

- [x] 1.1 Add a pure helper `composePhoneE164(areaCode, localNumber)` that strips non-digits from each part and returns `+549` + areaCode + localNumber (placed in `@pannico/shared` as `phone.ts` — framework-free and reusable by both forms; design left placement open)
- [x] 1.2 Add an `isValidPhoneEntry(areaCode, localNumber)` check that returns true only when both parts are present and the composed value passes the existing E.164 rules (leading `+`, 8–15 digits)
- [x] 1.3 Unit-test the helper: default `381` + `1234567` → `+5493811234567`; separators in the local number stripped; missing/short inputs rejected (added Jest setup to the shared package; 7 tests pass)

## 2. Shared two-field control

- [x] 2.1 Create a reusable `PhoneField` component rendering the `0[area] 15[number]` layout, with `0`/`15` as static decorations and the area code defaulting to `381`
- [x] 2.2 Expose value/validity to the parent (pure-presentational: parent owns `areaCode`/`localNumber`, composes/validates via shared helpers; forms show an "incomplete" message and disable submit until valid)
- [x] 2.3 Pre-fill area code with `381` on mount (parent inits with `DEFAULT_AREA_CODE`); `autoFocus` is an opt-in prop left off since both forms share one page (forcing it would conflict)

## 3. Adopt control in back-office forms

- [x] 3.1 Replace the single phone `<input>` in `LinkGenerator.tsx` with `PhoneField`; submit the composed E.164 to `createLink`; disable submit until valid
- [x] 3.2 Replace the single phone `<input>` in `DirectOrderForm.tsx` with `PhoneField`; submit the composed E.164 to `createOrder`; disable submit until valid
- [x] 3.3 Reset both fields back to default (`381` + empty) after a successful submit where the form already resets (DirectOrderForm resets to `DEFAULT_AREA_CODE` + empty; LinkGenerator keeps the entry visible alongside the generated link, matching prior behavior)

## 4. Verification

- [x] 4.1 Confirm backend `normalizePhoneE164` still accepts the composed values (no DTO/contract changes needed); add/adjust a backend test if the composed format is newly exercised (added `phone.util.spec.ts`; `+5493811234567` accepted)
- [x] 4.2 Manually verify both forms: local case (type only the number), non-local area code, and invalid/empty input feedback — confirmed working by the user
- [x] 4.3 Run frontend and backend test suites green (shared 7/7, backend 41/41, frontend `tsc --noEmit` clean)
