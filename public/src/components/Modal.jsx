import React, { useEffect } from "react";
import ReactModal from "react-modal";
import { IoClose } from "react-icons/io5";

const Modal = ({ isOpen, onRequestClose, title, children, _style = null }) => {
    useEffect(() => {

        const handleEsc = (event) => {
            if (event.key === "Escape" && isOpen) {
                onRequestClose();
            }
        };

        window.addEventListener("keydown", handleEsc);

        return () => {
            window.removeEventListener("keydown", handleEsc);
        };
    }, [isOpen, onRequestClose]);

    return (
        <ReactModal
            isOpen={true} // always mounted
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
            style={{
                overlay: {
                   
                    visibility: isOpen ? "visible" : "hidden",
                    opacity: isOpen ? 1 : 0,
                    transition: "opacity 300ms ease-in-out, visibility 300ms ease-in-out",
                    pointerEvents: isOpen ? "auto" : "none",
                },
                content: {
                    minWidth: _style ? _style.minWidth : undefined,
                    minHeight: _style ? _style.minHeight : undefined,
                    transform: isOpen ? "translateY(0)" : "translateY(100px)",
                    opacity: isOpen ? 1 : 0,
                    transition: "transform 300ms ease-in-out, opacity 300ms ease-in-out",
                    // pointerEvents: isOpen ? "auto" : "none",
                },
            }}
        >
            <div className="modal-header">

                <h2>{title}</h2>
                <button
                    className="modal-close-btn justify-self-end"
                    onClick={onRequestClose}
                >
                    <IoClose size={25} />
                </button>

            </div>

            <div className="modal-body">{children}</div>
        </ReactModal>
    );
};

export default Modal;
