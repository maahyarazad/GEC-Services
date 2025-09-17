import React from "react";
import { FaWhatsapp } from "react-icons/fa";
const WhatsAppButton = () => {
  return (
    <a
      href="https://wa.link/9ydml5"
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp"
      style={{
        position: "fixed",
        bottom: "32px",
        right: "32px",
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
        size={22}
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
