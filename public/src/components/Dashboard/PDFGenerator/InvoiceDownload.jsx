import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { IoDownloadOutline } from 'react-icons/io5';
import MyDocument from './MyDocument'; // adjust import as needed

const InvoiceDownload = ({ formData, iconSize, filename }) => {

  if (!formData) {
    return <CircularProgress size={iconSize} />
  }

  
  return (
    <PDFDownloadLink
      document={<MyDocument formData={formData} />}
      fileName={`${filename}.pdf`}
      style={{ textDecoration: 'none' }}
    >
          <IconButton title="Download PDF file" >
            <IoDownloadOutline color="#717171" size={iconSize} />
          </IconButton>
    </PDFDownloadLink>
  );
};

export default InvoiceDownload;
