import React, { useRef, useEffect, useLayoutEffect } from "react";
import "./ChatView.css";
import { CircularProgress } from '@mui/material';
import VCardBubble from "./VCardBubble";

const SERVER_URL = import.meta.env.VITE_SERVERURL;
const VCARD_TYPES = ["text/vcard", "text/x-vcard"];

const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate();

const getDateLabel = (date) => {
    const today     = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today))     return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString([], {
        day: "2-digit", month: "short", year: "numeric",
    });
};

const proxyUrl = (mediaUrl) =>
    `${SERVER_URL}/api/whatsapp/download-media?mediaUrl=${encodeURIComponent(mediaUrl)}`;

const MediaBubble = ({ media_url, media_type }) => {
    if (!media_url || !media_type) return null;

    const src = proxyUrl(media_url);

    if (media_type.startsWith("image/")) {
        return (
            <img
                src={src}
                alt="attachment"
                style={{ maxWidth: "100%", borderRadius: 6, display: "block", marginBottom: 4 }}
            />
        );
    }

    if (media_type.startsWith("video/")) {
        return (
            <video
                controls
                style={{ maxWidth: "100%", borderRadius: 6, display: "block", marginBottom: 4 }}
            >
                <source src={src} type={media_type} />
            </video>
        );
    }

    if (media_type.startsWith("audio/")) {
        return (
            <audio
                controls
                style={{ width: "100%", marginBottom: 4 }}
            >
                <source src={src} type={media_type} />
            </audio>
        );
    }

    if (VCARD_TYPES.includes(media_type.toLowerCase())) {
        return <VCardBubble media_url={media_url} />;
    }

    // Anything we can't show inline (PDF, documents, …) gets a download link instead of an empty bubble.
    return (
        <div className="attachment">
            <span>Attachment ({media_type})</span>
            <a href={`${src}&filename=${encodeURIComponent(`attachment_${Date.now()}`)}`}>Download</a>
        </div>
    );
};

const ChatView = ({ messages, loadingHistory, hasMore = false, loadingMore = false, onLoadMore }) => {
    let lastDate = null;
    const containerRef = useRef(null);
    const sentinelRef = useRef(null);
    const initialScrollDoneRef = useRef(false);
    const anchorRef = useRef({ id: null, top: 0 });

    const firstId = messages?.length ? (messages[0].id ?? 0) : null;

    const findMessageEl = (el, id) =>
        id === null ? null : el.querySelector(`[data-msg-id="${CSS.escape(String(id))}"]`);

    // Runs before paint. First load jumps to the bottom. When an older page is
    // prepended, the message that used to be first is kept where it was on
    // screen, by shifting scrollTop by however far that element moved down.
    // (Measured on the element, not scrollHeight, so images that finished
    // loading below it in the meantime don't skew the correction.)
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el || loadingHistory) return;

        if (!initialScrollDoneRef.current) {
            if (messages?.length) {
                el.scrollTop = el.scrollHeight;
                initialScrollDoneRef.current = true;
            }
        } else if (firstId !== anchorRef.current.id) {
            const oldFirst = findMessageEl(el, anchorRef.current.id);
            if (oldFirst) el.scrollTop += oldFirst.offsetTop - anchorRef.current.top;
        }

        const first = findMessageEl(el, firstId);
        anchorRef.current = { id: firstId, top: first ? first.offsetTop : 0 };
    });

    // Load the next older page when the top sentinel scrolls into view.
    // Re-created after every load, so if the sentinel is still visible (short
    // page) the observer's initial callback asks for the next page right away.
    useEffect(() => {
        const root = containerRef.current;
        const target = sentinelRef.current;
        if (loadingHistory || !hasMore || loadingMore || !onLoadMore || !root || !target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
            },
            { root, rootMargin: "100px 0px 0px 0px" }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [loadingHistory, hasMore, loadingMore, onLoadMore, messages?.length]);

    return (
        // overflow-anchor: none — the browser's own scroll anchoring would fight
        // the manual scroll restore above and double the jump.
        <div className="chat-container" ref={containerRef} style={{ overflowAnchor: "none" }}>
            {loadingHistory ? (
                <div className="d-flex justify-content-center align-items-center w-100 h-100">
                    <CircularProgress size={30} color="inherit" />
                </div>
            ) : (
                <>
                {hasMore && (
                    <div
                        ref={sentinelRef}
                        className="d-flex justify-content-center align-items-center w-100"
                        style={{ minHeight: 28, flexShrink: 0 }}
                    >
                        {loadingMore && <CircularProgress size={20} color="inherit" />}
                    </div>
                )}
                {messages?.map((msg, index) => {
                    const messageDate = new Date(msg.received_at);
                    const showDate = !lastDate || !isSameDay(messageDate, lastDate);
                    lastDate = messageDate;
                    const isSent = msg.type === "s";

                    return (
                        <React.Fragment key={msg.id ?? index}>
                            {showDate && (
                                <div className="date-separator">
                                    {getDateLabel(messageDate)}
                                </div>
                            )}

                            <div
                                className={`chat-message ${isSent ? "sent" : "received"}`}
                                data-msg-id={msg.id ?? index}
                            >
                                <div className="bubble">
                                    <MediaBubble
                                        media_url={msg.media_url}
                                        media_type={msg.media_type}
                                    />

                                    {msg.body ? (
                                        <p className="text">
                                            {msg.body.split("\n").map((line, i) => (
                                                <React.Fragment key={i}>
                                                    {line}
                                                    <br />
                                                </React.Fragment>
                                            ))}
                                        </p>
                                    ) : null}

                                    <div className="meta">
                                        <span className="time">
                                            {messageDate.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                        {isSent && <span className="ticks">✔✔</span>}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                </>
            )}

        </div>
    );
};

export default ChatView;
