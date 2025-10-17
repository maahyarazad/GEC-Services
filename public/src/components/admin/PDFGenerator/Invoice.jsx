import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import MyDocument from './MyDocument';
import PDFErrorBoundary from './PDFErrorBoundary';



const Invoice = ({ formData }) => {


  //   const [renderKey, setRenderKey] = useState(0);
  // const [changed, setChanged] = useState(null);
  // useEffect(()=>{
  //  setChanged((objectChanged));
  //  setRenderKey(prev => prev + 1);

  // }, [objectChanged])




  return (

    <PDFErrorBoundary>
      {/* Download PDF button */}
      <div style={{ position: 'default' }}>

      

        <div>
          <PDFViewer width="100%" height="770">
            <MyDocument formData={formData} />
          </PDFViewer>
        </div>

      </div>


    </PDFErrorBoundary>
  );
};

export default Invoice;
