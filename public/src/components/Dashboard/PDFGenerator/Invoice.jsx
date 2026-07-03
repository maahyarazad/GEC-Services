import React, { Suspense, useMemo, useState, useCallback } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import PDFErrorBoundary from './PDFErrorBoundary';

const MyDocument = React.lazy(() => import('./MyDocument'));

const Invoice = ({ formData }) => {
  // Remount the viewer only when the user explicitly retries after a render
  // error — never on ordinary form updates.
  const [retryKey, setRetryKey] = useState(0);
  const onRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Build a new document element only when the form content actually changes.
  // Expanding/collapsing accordions (or any other unrelated re-render) keeps
  // the same element reference, so the PDFViewer isn't re-rendered, doesn't
  // flash, and keeps its current scroll position. When the content does change
  // (typing), react-pdf updates the document in place — no remount needed.
  const serialized = JSON.stringify(formData);
  const document = useMemo(
    () => <MyDocument formData={formData} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [serialized]
  );

  return (
    <div style={{ height: 'calc(100vh - 70px)', overflow: 'scroll' }}>
      <PDFErrorBoundary onRetry={onRetry}>
        <div style={{ width: '100%', height: '770px' }}>
          <Suspense fallback={<div>Loading PDF...</div>}>
            <PDFViewer key={retryKey} style={{ width: '100%', height: '100%' }}>
              {document}
            </PDFViewer>
          </Suspense>
        </div>
      </PDFErrorBoundary>
    </div>
  );
};

// Skip re-rendering when the form content is unchanged (e.g. accordion
// expand/collapse triggering a parent re-render), so the PDF preview stays
// stable.
export default React.memo(
  Invoice,
  (prev, next) => JSON.stringify(prev.formData) === JSON.stringify(next.formData)
);
