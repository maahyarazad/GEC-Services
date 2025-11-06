import React, { useState, useEffect } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import PDFErrorBoundary from './PDFErrorBoundary';
// import MyDocument from './MyDocument';
const MyDocument = React.lazy(() => import('./MyDocument'));
const Invoice = ({ formData }) => {


  const [resetView, setResetView] = useState(true);
  useEffect(() => {

    setResetView(true);


    const timeout = setTimeout(() => {
      setResetView(false);
    }, 200);

    return () => clearTimeout(timeout);
  }, [formData]);

  if (resetView) {

    return (
      <div>Resetting...</div>

    );
  }
  const DEV_BUILD_EPOCH = Date.now();
  return (

    <PDFErrorBoundary>

      <div style={{ position: 'default' }}>


        <div>

          <PDFViewer width="100%" height="770" key={DEV_BUILD_EPOCH}>

            <MyDocument formData={formData} />
          </PDFViewer>
        </div>

      </div>


    </PDFErrorBoundary>
  );
};

export default Invoice;
