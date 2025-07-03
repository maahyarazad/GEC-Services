import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          © {new Date().getFullYear()} German Emirates Club. All rights reserved.
        </p>
        <p className="footer-email">
          Email:{' '}
          <a href="mailto:info@german-emirates-club.com">
            info@german-emirates-club.com
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
