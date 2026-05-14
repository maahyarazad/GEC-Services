import React, { useRef, useEffect } from "react";
import "./ChatView.css";
import { CircularProgress } from '@mui/material';

const SERVER_URL = import.meta.env.VITE_SERVERURL;

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

    return null;
};

const ChatView = ({ messages, loadingHistory }) => {
    let lastDate = null;
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!loadingHistory && messages?.length) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loadingHistory]);

    return (
        <div className="chat-container">
            {loadingHistory ? (
                <div className="d-flex justify-content-center align-items-center w-100 h-100">
                    <CircularProgress size={30} color="inherit" />
                </div>
            ) : (
                messages?.map((msg, index) => {
                    const messageDate = new Date(msg.received_at);
                    const showDate = !lastDate || !isSameDay(messageDate, lastDate);
                    lastDate = messageDate;
                    const isSent = msg.type === "s";

                    return (
                        <React.Fragment key={index}>
                            {showDate && (
                                <div className="date-separator">
                                    {getDateLabel(messageDate)}
                                </div>
                            )}

                            <div className={`chat-message ${isSent ? "sent" : "received"}`}>
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
                })
            )}

            <div ref={bottomRef} />
        </div>
    );
};

export default ChatView;
