import React, { useState, useEffect, Suspense, useRef } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import PDFErrorBoundary from './PDFErrorBoundary';

const MyDocument = React.lazy(() => import('./MyDocument'));

const Invoice = ({ formData }) => {
  const [showPdf, setShowPdf] = useState(false);
  const [renderKey, setRenderKey] = useState(Date.now());
  const pdfErrorBoundaryRef = useRef();

  const onRetryClick = () => {
    if (pdfErrorBoundaryRef.current) {
      pdfErrorBoundaryRef.current.handleRetry();
    }
  };

  useEffect(() => {
    setShowPdf(false);
    const timeout = setTimeout(() => {
      setRenderKey(Date.now());
      setShowPdf(true);
    }, 10);

    return () => clearTimeout(timeout);
  }, [formData]);

  return (
    <div style={{ height: 'calc(100vh - 70px)', overflow: 'scroll' }}>
      
      <PDFErrorBoundary ref={pdfErrorBoundaryRef}>
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
    </div>
  );
};

export default Invoice;
