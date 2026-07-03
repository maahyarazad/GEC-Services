import React, { useEffect, useRef, useState } from 'react';

const SERVER = import.meta.env.VITE_SERVERURL;

// Renders the invoice by asking the backend to generate the PDF with Puppeteer
// and displaying the returned file in an <iframe>. The request is debounced and
// the component is memoized on the form content, so unrelated re-renders (e.g.
// expanding/collapsing accordions) never regenerate the PDF, flash, or reset
// the viewer's scroll position.
const Invoice = ({ formData }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const objectUrlRef = useRef(null);

  const serialized = JSON.stringify(formData);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(false);

        const res = await fetch(`${SERVER}/api/invoice-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ data: formData }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);

        const blob = await res.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Invoice PDF error:', err);
          if (!cancelled) setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  // Release the last object URL on unmount.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  return (
    <div style={{ height: 'calc(100vh - 70px)', overflow: 'hidden', position: 'relative' }}>
      {error ? (
        <div style={{ padding: '1rem', color: 'red', textAlign: 'center' }}>
          Failed to render PDF.
        </div>
      ) : pdfUrl ? (
        <iframe
          title="Invoice PDF"
          src={`${pdfUrl}#toolbar=1`}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div style={{ padding: '1rem' }}>Loading PDF...</div>
      )}

      {loading && pdfUrl && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 12,
            color: '#666',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          Updating…
        </div>
      )}
    </div>
  );
};

// Skip re-rendering when the form content is unchanged.
export default React.memo(
  Invoice,
  (prev, next) => JSON.stringify(prev.formData) === JSON.stringify(next.formData)
);
