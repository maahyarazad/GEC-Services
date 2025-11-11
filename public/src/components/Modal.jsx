import React, { useEffect, useRef } from "react";
import ReactModal from "react-modal";
import { IoClose } from "react-icons/io5";


const Modal = ({ isOpen, onRequestClose, title, children, _style = null, onAfterOpen }) => {

    const idRef = useRef(Math.floor(Date.now() + Math.random() * 100));
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
            onAfterOpen={onAfterOpen}
            key={idRef.current}
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            closeTimeoutMS={300}
            overlayClassName={{
                base: "modal-overlay",
                afterOpen: "modal-overlay_after-open",
                beforeClose: "modal-overlay_before-close",
            }}
            className={{
                base: "modal-content",
                afterOpen: "modal-content_after-open",
                beforeClose: "modal-content_before-close",
            }}
            ariaHideApp={false}
            shouldCloseOnOverlayClick={true}
            shouldCloseOnEsc={true}
        >
            <div className="modal-header">
                <h2>{title}</h2>
                <button className="modal-close-btn" onClick={onRequestClose}>
                    <IoClose size={25} />
                </button>
            </div>
            <div className="modal-body">{children}</div>
        </ReactModal>
    );
};

export default Modal;
