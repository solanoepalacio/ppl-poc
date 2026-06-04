'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_AREA_CODE,
  composePhoneE164,
  isValidPhoneEntry,
  type CreateLinkResponse,
  type Product,
} from '@pannico/shared';
import { createLink, createOrder } from '@/lib/api';
import { Modal } from './Modal';
import { PhoneField } from './PhoneField';
import { ItemQuantityFields, itemsFromQuantities } from './ItemQuantityFields';

/**
 * Phone-first order creation, launched as a modal from the orders view. The
 * manager enters one phone number, then chooses a path: "Generar link" issues a
 * shareable tokenized link, while "Cargar contenido" reveals the catalog so the
 * order can be recorded directly. Both paths reuse the single phone entry; the
 * items list stays hidden until content is loaded.
 */
export function CreateOrderModal({ products }: { products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'choose' | 'link' | 'content'>('choose');

  const [areaCode, setAreaCode] = useState(DEFAULT_AREA_CODE);
  const [localNumber, setLocalNumber] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');

  const [result, setResult] = useState<CreateLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const valid = isValidPhoneEntry(areaCode, localNumber);

  function reset() {
    setStep('choose');
    setAreaCode(DEFAULT_AREA_CODE);
    setLocalNumber('');
    setQuantities({});
    setMessage('');
    setResult(null);
    setCopied(false);
    setBusy(false);
    setError(null);
  }

  function openModal() {
    reset();
    setOpen(true);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function setQuantity(productId: string, quantity: number) {
    setQuantities((q) => ({ ...q, [productId]: quantity }));
  }

  async function generateLink() {
    setError(null);
    setBusy(true);
    try {
      const res = await createLink(composePhoneE164(areaCode, localNumber));
      setResult(res);
      setStep('link');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
  }

  async function submitContent() {
    setError(null);
    try {
      await createOrder({
        phone: composePhoneE164(areaCode, localNumber),
        items: itemsFromQuantities(quantities),
        message,
      });
      close();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la orden.');
    }
  }

  const footer =
    step === 'link' ? (
      <>
        <button className="btn-primary" onClick={() => void copy()}>
          {copied ? '¡Copiado!' : 'Copiar enlace'}
        </button>
        <button className="btn-secondary" onClick={close}>
          Listo
        </button>
      </>
    ) : step === 'content' ? (
      <>
        <button
          className="btn-primary"
          onClick={() => void submitContent()}
          disabled={pending}
        >
          {pending ? 'Creando…' : 'Crear orden'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => setStep('choose')}
          disabled={pending}
        >
          Volver
        </button>
      </>
    ) : undefined;

  return (
    <>
      <button type="button" className="btn-primary" onClick={openModal}>
        Crear orden
      </button>

      <Modal open={open} onClose={close} title="Crear orden" footer={footer}>
        <PhoneField
          id="create-order-phone"
          areaCode={areaCode}
          localNumber={localNumber}
          onAreaCodeChange={setAreaCode}
          onLocalNumberChange={setLocalNumber}
          disabled={busy || pending || step === 'link'}
          autoFocus
        />
        {localNumber.length > 0 && !valid && (
          <p className="error">Ese número de teléfono parece incompleto.</p>
        )}

        {step === 'choose' && (
          <div className="row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void generateLink()}
              disabled={!valid || busy}
            >
              {busy ? 'Generando…' : 'Generar link'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep('content')}
              disabled={!valid}
            >
              Cargar contenido
            </button>
          </div>
        )}

        {step === 'link' && result && (
          <div className="card">
            <p className="muted">
              Compartí este enlace con el cliente por WhatsApp:
            </p>
            <p>
              <code>{result.url}</code>
            </p>
            <p className="muted">
              Para {result.phone} · expira{' '}
              {new Date(result.expiresAt).toLocaleString()}
            </p>
          </div>
        )}

        {step === 'content' && (
          <>
            <ItemQuantityFields
              products={products}
              quantities={quantities}
              onChange={setQuantity}
              disabled={pending}
            />
            <div className="field">
              <label htmlFor="create-order-message">Mensaje (opcional)</label>
              <textarea
                id="create-order-message"
                rows={6}
                placeholder="Pegá el mensaje de WhatsApp que generó esta orden…"
                value={message}
                disabled={pending}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </Modal>
    </>
  );
}
