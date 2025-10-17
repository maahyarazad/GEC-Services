import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import MyDocument from './MyDocument';
import PDFErrorBoundary from './PDFErrorBoundary';
import { useEffect, useState, useRef } from "react";
import { IoSave } from "react-icons/io5";
import { Button, IconButton } from '@mui/material';
import { useWebSocket } from '../WebSocketContext';

const Invoice = ({ formData}) => {

  
    //   const [renderKey, setRenderKey] = useState(0);
    // const [changed, setChanged] = useState(null);
    // useEffect(()=>{
    //  setChanged((objectChanged));
    //  setRenderKey(prev => prev + 1);
    
    // }, [objectChanged])


    const { sendRequest } = useWebSocket();

    
    const Save = async () =>{
      try {

    const response = await fetch(`${import.meta.env.VITE_SERVERURL}/api/invoice-save`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json', 
      },
      body: JSON.stringify({ data: formData }), 
    });
  
              const respnse_data = await response.json();
              if (!response.ok) {
  
                  // snackbarRef.current?.openSnackbar(respnse_data.message);
                  throw new Error(response.message);
              }
  
  
              if (respnse_data) {
                        sendRequest("invoice");
                
              }
          } catch (err) {
              console.error('Error fetching data:', err);
          } finally {
              
          }
  };

  return (
    
    <PDFErrorBoundary>
      {/* Download PDF button */}
      <div style={{position:'relative'}}> 

      <div className='d-flex justify-content-between align-items-center' style={{position:'sticky'}}>

                    <IconButton
                        title="Save"
                        onClick={Save}
                    >
                        <IoSave color="dark" size={25} />
                    </IconButton>


        <PDFDownloadLink
          document={<MyDocument formData={formData} />}
          fileName="invoice.pdf"
          style={{ textDecoration: 'none' }}
        >
          {({ loading }) => (
            <Button variant="outlined" color="primary" disabled={loading} sx={{textTransform: 'none'}}>
              {loading ? 'Loading document...' : 'Download PDF'}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

       <div style={{position:'relative'}}>
      <PDFViewer  width="100%" height="770">
        <MyDocument formData={formData}/>
      </PDFViewer>
         </div>
      
      </div>


    </PDFErrorBoundary>
  );
};

export default Invoice;
