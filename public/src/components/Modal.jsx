import { useEffect, useRef, useState } from "react";
import ReactModal from "react-modal";
import { IoClose } from "react-icons/io5";

const MOBILE_BREAKPOINT = 768;

const Modal = ({ isOpen, onRequestClose, title, children, onAfterOpen }) => {

    const idRef = useRef(Math.floor(Date.now() + Math.random() * 100));
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

useEffect(() => {
    if (isOpen && !isMobile) {
        setPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
    }
}, [isOpen, isMobile]);

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
                content: isMobile
                    ? {
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "100%",
                        height: "100%",
                        transform: "none",
                        borderRadius: 0,
                        margin: 0,
                        overflowY: "auto",
                    }
                    : {
                        position: "fixed",
                        top: position.y,
                        left: position.x,
                        transform: "translate(-50%, -50%)",
                        right: "auto",
                        bottom: "auto",
                    }
            }}
        >
            {/* Drag handle — only the header is draggable (disabled on mobile) */}
            <div
                className="modal-header"
                onMouseDown={isMobile ? undefined : handleMouseDown}
                style={{ cursor: isMobile ? "default" : "grab", userSelect: "none" }}
            >
                <h2
                    title={title}
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                        flex: 1,
                    }}
                >{title}</h2>
                <button className="modal-close-btn" onClick={onRequestClose}>
                    <IoClose size={25} />
                </button>
            </div>
            <div className="modal-body">{children}</div>
        </ReactModal>
    );
};

export default Modal;