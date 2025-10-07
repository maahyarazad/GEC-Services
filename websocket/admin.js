require("dotenv").config();
const { WebSocketServer } = require("ws");

function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });


  wss.on("connection", (ws, req) => {
    console.log("Client connected");

    const interval = setInterval(() => {
      const cookies = req.headers.cookie || "";
      const token = cookies.split(";").find(c => c.trim().startsWith("a-usr="));
      ws.send(JSON.stringify({ Auth: !!token }));
    }, 10_000);

    ws.on("close", () => {
      console.log("Client disconnected");
      clearInterval(interval);
    });

    ws.on("error", () => {
      clearInterval(interval);
    });
  });

  return wss;
}

module.exports = { createWebSocketServer };
