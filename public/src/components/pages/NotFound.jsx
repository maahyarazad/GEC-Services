import React, {useEffect} from 'react';
import WhatsAppButton from '../utils/WhatsAppButton';



const NotFound = () => {
  useEffect(() => {
  document.title = "GEC - Services - 404 | Page Not Found";
}, []);
  const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
    textAlign: "center",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  content: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    padding: "40px",
    maxWidth: "500px",
    width: "100%",
  },
  errorCode: {
    fontSize: "90px",
    fontWeight: "400",
    color: "#d9b144",
    marginBottom: "30px",
  },
  errorMessage: {
    fontSize: "30px",
     
    color: "#333",
    margin: "10px 0",
  },
  errorDescription: {
    color: "#555",
    fontSize: "16px",
    marginTop: "15px",
    lineHeight: "1.6",
  },
  homeLink: {
    display: "inline-block",
    marginTop: "25px",
    padding: "12px 24px",
    backgroundColor: "#d9b144",
    color: "#fff",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
    transition: "background 0.3s ease",
  },
  homeLinkHover: {
    backgroundColor: "#b9962b",
  },
};


  return (
    <div style={styles.container}>
  <div style={styles.content}>
    <div style={styles.errorCode}>404</div>
    <h1 style={styles.errorMessage}>Page Not Found</h1>
    <img
      alt="GEC Logo"
      src={`${import.meta.env.VITE_SERVERURL}/uploads/logo@2x.png`}
      height={120}
      style={{ cursor: "pointer", margin: "20px 0" }}
      onClick={() => console.log("🤖")}
    />
    <p style={styles.errorDescription}>
      The page you are looking for might have been removed, had its name changed,
      or is temporarily unavailable.
    </p>
    {/* Optional link */}
    {/* <a href="/" style={styles.homeLink}>Go to Homepage</a> */}
  </div>

  <WhatsAppButton />
</div>

  );
};

export default NotFound;