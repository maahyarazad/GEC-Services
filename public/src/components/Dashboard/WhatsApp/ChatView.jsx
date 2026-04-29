import React from "react";
import "./ChatView.css";
import { CircularProgress } from '@mui/material';
const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const getDateLabel = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";

    return date.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const ChatView = ({ messages, loadingHistory }) => {
    let lastDate = null;

    // backgroundImage: `url(${WABackground})`,
    // backgroundSize: 'cover',
    // backgroundPosition: 'center',
    // <div className="chat-container" style={alignItems: 'center', justifyContent: 'center' }}>
    
    return (
        <div className="chat-container">

            {loadingHistory ? 
            <div className="d-flex justify-content-center align-items-center w-100 h-100">

  <CircularProgress size={30} color="inherit" /> 
</div>

            
            : messages?.map((msg, index) => {
                const messageDate = new Date(msg.received_at);
                const showDate =
                    !lastDate || !isSameDay(messageDate, lastDate);

                lastDate = messageDate;
                const isSent = msg.type === "s";

                return (
                    <React.Fragment key={index}>
                        {showDate && (
                            <div className="date-separator">
                                {getDateLabel(messageDate)}
                            </div>
                        )}

                        <div
                            className={`chat-message ${isSent ? "sent" : "received"}`}
                        >
                            <div className="bubble">
                                <p className="text">
                                    {msg.body.split("\n").map((line, i) => (
                                        <React.Fragment key={i}>
                                            {line}
                                            <br />
                                        </React.Fragment>
                                    ))}
                                </p>

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

            { }
        </div>
    );
};

export default ChatView;
