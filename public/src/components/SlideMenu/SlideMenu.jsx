import React, {useEffect, useState} from "react";
import "./SlideMenu.css";



const SlideMenu = ({ isOpen, onClose, children, headerTitle }) => {

     useEffect(() => {
            const handleEsc = (event) => {
                if (event.key === "Escape" && isOpen) {
                    onClose();
                }
            };
    
            window.addEventListener("keydown", handleEsc);
            return () => window.removeEventListener("keydown", handleEsc);
        }, [isOpen, onClose]);


         const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
        
          useEffect(() => {
            
            const handleResize = () => {
              setIsMobile(window.innerWidth <= 768);
            };
        
            window.addEventListener("resize", handleResize);
        
            
            return () => window.removeEventListener("resize", handleResize);
          }, []);
        

  return (
    <>
      {/* Backdrop */}
      <div
        className={`slide-menu-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />



      {/* Sliding menu */}
      <div className={`slide-menu ${isOpen ? "open" : ""}`} style={{ width: isMobile ? "100%" : "90%" }} role="dialog" aria-modal="true">
        {/* Sticky header */}
        <div className="slide-menu__header">

          <button
            className="slide-menu__close-button"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ×
          </button>

          <h2 className="slide-menu__title">{headerTitle}</h2>

          <div className="slide-menu__spacer" />
        </div>

        {/* Content passed as children */}
        <div className="slide-menu__content">{children}</div>
      </div>
    </>
  );
};

export default SlideMenu;
