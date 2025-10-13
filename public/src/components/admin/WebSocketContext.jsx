import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // ✅ Create Socket.IO client
    const socket = io(import.meta.env.VITE_SERVERURL, {
      path: "/socket.io",
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 Socket.IO connected, id:", socket.id);
    });

    socket.on("auth", (data) => {
      
      setData(data);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket.IO disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket.IO connection error:", err.message);
    });

    return () => {
      console.log("🛑 Closing Socket.IO connection");
      socket.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ data }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
