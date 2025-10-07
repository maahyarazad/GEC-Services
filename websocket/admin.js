
const { Server } = require("socket.io");

function createWebSocketServer(server, allowedOrigins) {

    const io = new Server(server, {
        path: "/socket.io",
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("Client connected");

        // Check auth once on connection
        const token = socket.handshake.headers.cookie?.includes("a-usr=") ?? false;
        socket.emit("auth", { Auth: !!token });

        // Set up interval for this client
        const interval = setInterval(() => {
            // Re-check token if you want live auth validation
            const liveToken = socket.handshake.headers.cookie?.includes("a-usr=") ?? false;
            socket.emit("auth", { Auth: !!liveToken });
        }, 10_000); // every 10 seconds

        // Clean up when client disconnects
        socket.on("disconnect", () => {
            console.log("Client disconnected");
            clearInterval(interval);
        });
    });

    return io;
}

module.exports = { createWebSocketServer };
