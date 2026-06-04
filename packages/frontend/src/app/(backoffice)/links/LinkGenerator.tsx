'use client';

import { useState } from 'react';
import {
  DEFAULT_AREA_CODE,
  composePhoneE164,
  isValidPhoneEntry,
  type CreateLinkResponse,
} from '@pannico/shared';
import { createLink } from '@/lib/api';
import { PhoneField } from './PhoneField';

/** Generate a shareable, tokenized order link from a customer phone number. */
export function LinkGenerator() {
  const [areaCode, setAreaCode] = useState(DEFAULT_AREA_CODE);
  const [localNumber, setLocalNumber] = useState('');
  const [result, setResult] = useState<CreateLinkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const valid = isValidPhoneEntry(areaCode, localNumber);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);
    setBusy(true);
    try {
      setResult(await createLink(composePhoneE164(areaCode, localNumber)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
  }

  return (
    <>
      <form onSubmit={generate} className="card">
        <PhoneField
          id="link-phone-local"
          areaCode={areaCode}
          localNumber={localNumber}
          onAreaCodeChange={setAreaCode}
          onLocalNumberChange={setLocalNumber}
          disabled={busy}
        />
        {localNumber.length > 0 && !valid && (
          <p className="error">That phone number looks incomplete.</p>
        )}
        <button className="btn-primary" disabled={busy || !valid}>
          {busy ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="card">
          <p className="muted">Share this link with the customer over WhatsApp:</p>
          <p>
            <code>{result.url}</code>
          </p>
          <p className="muted">
            For {result.phone} · expires{' '}
            {new Date(result.expiresAt).toLocaleString()}
          </p>
          <button className="btn-secondary" onClick={copy}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </>
  );
}
