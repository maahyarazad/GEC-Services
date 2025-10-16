import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import MyDocument from './MyDocument';
import PDFErrorBoundary from './PDFErrorBoundary';
import { useEffect, useState, useRef } from "react";

const Invoice = ({ formData , objectChanged}) => {

  
    //   const [renderKey, setRenderKey] = useState(0);
    // const [changed, setChanged] = useState(null);
    // useEffect(()=>{
    //  setChanged((objectChanged));
    //  setRenderKey(prev => prev + 1);
    
    // }, [objectChanged])


  return (
    
    <PDFErrorBoundary>
      {/* Download PDF button */}
      <PDFDownloadLink
        document={<MyDocument formData={formData} />}
        fileName="invoice.pdf"
      >
        {({ loading }) => (loading ? 'Loading document...' : 'Download PDF')}
      </PDFDownloadLink>

      {/* Optional inline PDF preview */}
      <PDFViewer  width="100%" height="770">
        <MyDocument formData={formData}/>
      </PDFViewer>
    </PDFErrorBoundary>
  );
};

export default Invoice;
