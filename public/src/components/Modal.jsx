import React, { useEffect, useRef, useState } from "react";
import ReactModal from "react-modal";
import { IoClose } from "react-icons/io5";

const Modal = ({ isOpen, onRequestClose, title, children, _style = null, onAfterOpen }) => {

    const idRef = useRef(Math.floor(Date.now() + Math.random() * 100));
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

useEffect(() => {
    if (isOpen) {
        setPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
    }
}, [isOpen]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === "Escape" && isOpen) onRequestClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onRequestClose]);

    const handleMouseDown = (e) => {
        dragging.current = true;
        offset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    };

    const handleMouseMove = (e) => {
        if (!dragging.current) return;
        setPosition({
            x: e.clientX - offset.current.x,
            y: e.clientY - offset.current.y,
        });
    };

    const handleMouseUp = () => {
        dragging.current = false;
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [position]);

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
            style={{
                content: {
                    position: "fixed",
                    top: position.y,
                    left: position.x,
                    transform: "translate(-50%, -50%)",
                    right: "auto",
                    bottom: "auto",
                }
            }}
        >
            {/* Drag handle — only the header is draggable */}
            <div
                className="modal-header"
                onMouseDown={handleMouseDown}
                style={{ cursor: "grab", userSelect: "none" }}
            >
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