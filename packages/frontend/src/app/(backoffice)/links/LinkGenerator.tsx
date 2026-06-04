'use client';

import { useState } from 'react';
import type { CreateLinkResponse } from '@pannico/shared';
import { createLink } from '@/lib/api';

/** Generate a shareable, tokenized order link from a customer phone number. */
export function LinkGenerator() {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<CreateLinkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);
    setBusy(true);
    try {
      setResult(await createLink(phone));
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
        <label htmlFor="phone">Customer phone (E.164)</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            id="phone"
            placeholder="+5491122334455"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" disabled={busy || !phone}>
            {busy ? 'Generating…' : 'Generate'}
          </button>
        </div>
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
