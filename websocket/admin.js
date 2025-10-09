require('dotenv').config();
const { Server } = require("socket.io");

function createWebSocketServer(server, allowedOrigins = []) {


    const localOrigins = [
        `http://127.0.0.1:${process.env.PORT}`,
        `http://localhost:${process.env.PORT}`,

    ];

    const mergedOrigins = [...new Set([...allowedOrigins, ...localOrigins])];

    const io = new Server(server, {
        path: "/socket.io",
        cors: {
            origin: mergedOrigins,
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket", "polling"], // ensure fallback to polling if websocket fails
        allowEIO3: true, // support older Socket.IO clients if needed
    });

    io.engine.on("connection_error", (err) => {
        console.error("⚠️ Socket.IO Engine connection error:", err.code, err.message);
        if (err.req) {
            console.error("Request headers:", err.req.headers);
        }
    });

    io.use((socket, next) => {
        // console.log("Incoming connection headers:", socket.handshake.headers);
        next();
    });

    io.on("connection", (socket) => {
        // console.log(`✅ Client connected from ${socket.handshake.address}`);

        const hasToken = socket.handshake.headers.cookie?.includes("a-usr=") ?? false;
        socket.emit("auth", { Auth: !!hasToken });

        const interval = setInterval(() => {
            const liveToken = socket.handshake.headers.cookie?.includes("a-usr=") ?? false;
            socket.emit("auth", { Auth: !!liveToken });
        }, 10_000);

        socket.on("disconnect", (reason) => {
            // console.log(`❌ Client disconnected (${reason})`);
            clearInterval(interval);
        });
    });

    console.log("✅ WebSocket server initialized with path /socket.io");
    return io;
}

module.exports = { createWebSocketServer };
