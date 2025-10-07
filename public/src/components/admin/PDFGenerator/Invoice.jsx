import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import MyDocument from './MyDocument';

const Invoice = ({ formData }) => {

  
  return (
    <div>
      {/* Download PDF button */}
      <PDFDownloadLink
        document={<MyDocument formData={formData} />}
        fileName="invoice.pdf"
      >
        {({ loading }) => (loading ? 'Loading document...' : 'Download PDF')}
      </PDFDownloadLink>

      {/* Optional inline PDF preview */}
      <PDFViewer  width="100%" height="770">
        <MyDocument formData={formData} />
      </PDFViewer>
    </div>
  );
};

export default Invoice;
