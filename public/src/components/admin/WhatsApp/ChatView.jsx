import React from "react";
import "./ChatView.css";

const ChatView = ({ messages }) => {
  return (
    <div className="chat-container">
      {messages.map((msg, index) => {
        const isSent = msg.type === "s";

        return (
          <div
            key={index}
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
                  {new Date(msg.received_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                {isSent && (
                  <span className="ticks">✔✔</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChatView;

