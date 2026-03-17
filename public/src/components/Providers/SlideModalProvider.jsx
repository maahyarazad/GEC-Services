
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import ReactModal from "react-modal";
import { IoClose } from "react-icons/io5";
import { create } from "lodash";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

const SlideModal = ({ isOpen, onRequestClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape" && isOpen) {
        onRequestClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onRequestClose]);

  return (
    <ReactModal
      isOpen={true} // always mounted while visible
      onRequestClose={onRequestClose}
      closeTimeoutMS={300}
      overlayClassName={{
        base: "modal-overlay",
        afterOpen: "modal-overlay_after-open",
        beforeClose: "modal-overlay_before-close",
      }}
      className={{
        base: "slide-modal-content",
        afterOpen: "slide-modal-content_after-open",
        beforeClose: "slide-modal-content_before-close",
      }}
      ariaHideApp={false}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          transition: "opacity 300ms ease-in-out",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        },
        content: {
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "70%",
          margin: 0,
          padding: 0,
          border: "none",
          borderRadius: 0,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-in-out",
          boxShadow: "-4px 0 10px rgba(0,0,0,0.2)",
          backgroundColor: "#fff",
          overflow: "auto",
        },
      }}
    >
      <div className="d-flex flex-column position-relative" style={{ height: "100%" }}>
        {/* Header */}
        <div
          className="d-flex justify-content-between items-center px-4 py-2 border-b bg-white"
          style={{ position: "sticky", top: 0, zIndex: 10 }}
        >
          <Typography variant="h4" style={{color: 'rgb(112,128,144)'}}>
            {title}
          </Typography>
          <IconButton className="p-1 hover:bg-gray-100 rounded-full" onClick={onRequestClose}>
            <IoClose size={25} />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">{children}</div>
      </div>
    </ReactModal>
  );
};





const SlideModalContext = createContext();

export const SlideModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    content: null,
  });

  // Open modal with title + content
  const openModal = useCallback((title, content) => {
    setModalState({ isOpen: true, title, content });
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <SlideModalContext.Provider value={{ ...modalState, openModal, closeModal }}>
      {children}

      {/* Global slide modal instance */}
      <SlideModal
        isOpen={modalState.isOpen}
        onRequestClose={closeModal}
        title={modalState.title}
      >
        {modalState.content}
      </SlideModal>
    </SlideModalContext.Provider>
  );
};

// Hook to access modal actions
export const useSlideModal = () => {
  const ctx = useContext(SlideModalContext);
  if (!ctx) {
    throw new Error("useSlideModal must be used inside a SlideModalProvider");
  }
  return ctx;
};
