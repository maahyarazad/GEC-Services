import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
const WhatsAppButton = ({data}) => {
  
  const [number, setNumber] = useState(971562050066);
  const [message, setMessage] = useState("Hallo! Ich benötige Hilfe bei...");
  
  
  useEffect(()=>{
    
    
    if(data?.metadata_json){
      const metadata = JSON.parse(data.metadata_json);
      setNumber(metadata.whatsapp_number);
      setMessage(metadata.whatsapp_message);
    }
  },[data])


  return (
    <a
      href={`https://api.whatsapp.com/send?phone=${number}&text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp"
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        width: "auto",
        height: "auto",
        padding: "4px 4px",
        backgroundColor: "#25D366",
        borderRadius: "32px",
      }}
    >
       <FaWhatsapp
        color="white"
        size={25}
        // style={{ marginRight: "8px" }}
      />
      <p
        style={{
          color: "white",
          textDecoration: "unset",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        
      </p>
    </a>
  );
};

export default WhatsAppButton;

PropTypes
