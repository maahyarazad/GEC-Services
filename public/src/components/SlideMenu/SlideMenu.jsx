import React, {useEffect} from "react";
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


  return (
    <>
      {/* Backdrop */}
      <div
        className={`slide-menu-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />



      {/* Sliding menu */}
      <div className={`slide-menu ${isOpen ? "open" : ""}`} role="dialog" aria-modal="true">
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
