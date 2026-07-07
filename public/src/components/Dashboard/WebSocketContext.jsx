import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAppDispatch } from "../../store/hooks";
import { triggerRefetchGuestList } from "../../features/eventSlice";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [update, setUpdate] = useState(null);
  const socketRef = useRef(null);
  const dispatch = useAppDispatch();

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

    // Real-time store update: the server broadcasts this whenever a guest-list
    // mutation happens (add / attendance / remove / registration), so every
    // connected dashboard refreshes without a manual, per-action local dispatch.
    socket.on("guestList:refetch", () => {
      dispatch(triggerRefetchGuestList());
    });

  socket.on("invoice", (data) => {
      console.log("Received invoice:", data);
      
      // ✅ emit event back to client(s)
      socket.emit("invoice", { status: "ok", data });
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
  }, [dispatch]);


  const sendRequest = (event, payload, callback) => {
    
    if (!socketRef.current) return;
    socketRef.current.emit(event, { id: 123, total: 99 });
  };

  const onEvent = (event, callback) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, callback);

    // Cleanup function for useEffect
    return () => socketRef.current.off(event, callback);
  };



  return (
    <WebSocketContext.Provider value={{ data,update, sendRequest, onEvent }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
