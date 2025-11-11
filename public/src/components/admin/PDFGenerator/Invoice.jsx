import React, { useState, useEffect, Suspense } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import PDFErrorBoundary from './PDFErrorBoundary';

const MyDocument = React.lazy(() => import('./MyDocument'));

const Invoice = ({ formData }) => {
  const [showPdf, setShowPdf] = useState(false);
  const [renderKey, setRenderKey] = useState(Date.now());

  useEffect(() => {
    setShowPdf(false);
    const timeout = setTimeout(() => {
      setRenderKey(Date.now());
      setShowPdf(true);
    }, 10);

    return () => clearTimeout(timeout);
  }, [formData]);

  return (
    <PDFErrorBoundary>
      <div style={{ width: '100%', height: '770px' }}>
        {showPdf ? (
          <Suspense fallback={<div>Loading PDF...</div>}>
            <PDFViewer key={renderKey} style={{ width: '100%', height: '100%' }}>
              <MyDocument formData={formData} />
            </PDFViewer>
          </Suspense>
        ) : (
          <div>Resetting PDF Viewer...</div>
        )}
      </div>
    </PDFErrorBoundary>
  );
};

export default Invoice;
