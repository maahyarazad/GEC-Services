import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { IoDownloadOutline } from 'react-icons/io5';
import MyDocument from './MyDocument'; // adjust import as needed

const InvoiceDownload = ({ formData, iconSize, loadingFlag }) => {
  const [delayedFormData, setDelayedFormData] = useState(null);
  

  useEffect(() => {
    

    const timeout = setTimeout(() => {
      setDelayedFormData(formData);
      
    }, 1000); // 1 second delay

    return () => clearTimeout(timeout);
  }, [loadingFlag]);

  if (loadingFlag) {
    return <CircularProgress size={iconSize} />; // or a spinner if you want
  }

  return (
    <PDFDownloadLink
      document={<MyDocument formData={delayedFormData} />}
      fileName="invoice.pdf"
      style={{ textDecoration: 'none' }}
    >
          <IconButton title="Download PDF file">
            <IoDownloadOutline color="dark" size={iconSize} />
          </IconButton>
      
      
    </PDFDownloadLink>
  );
};

export default InvoiceDownload;
