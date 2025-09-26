import React from 'react';
import WhatsAppButton from '../utils/WhatsAppButton';
import GECLogo from "../../assets/media/20-Jahre.webp";


const NotFound = () => {
  const styles = {
    container: {
      // fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: '#f8f9fa',
      color: '#333',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '20px',
      margin: 0,
    },
    content: {
      maxWidth: '500px',
    },
    errorCode: {
      fontSize: '120px',
      fontWeight: '300',
      color: '#6c757d',
      marginBottom: '10px',
      lineHeight: '1',
    },
    errorMessage: {
      fontSize: '24px',
      fontWeight: '400',
      marginBottom: '20px',
      color: '#495057',
    },
    errorDescription: {
      fontSize: '16px',
      lineHeight: '1.6',
      marginBottom: '30px',
      color: '#6c757d',
    },
    homeLink: {
      display: 'inline-block',
      padding: '10px 20px',
      backgroundColor: '#007bff',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '4px',
      transition: 'background-color 0.2s',
    },
  };

  const handleHover = (e) => {
    e.target.style.backgroundColor = '#0056b3';
  };

  const handleLeave = (e) => {
    e.target.style.backgroundColor = '#007bff';
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        
        <div style={styles.errorCode}>404</div>
        <h1 style={styles.errorMessage}>Page Not Found</h1>
        <p style={styles.errorDescription}>
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </p>
        {/* <a 
          href="/" 
          style={styles.homeLink}
          onMouseEnter={handleHover}
          onMouseLeave={handleLeave}
        >
          Go to Homepage
        </a> */}
      </div>
      <WhatsAppButton/>
    </div>
  );
};

export default NotFound;