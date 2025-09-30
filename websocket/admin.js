require("dotenv").config();
const { WebSocketServer } = require("ws");

function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });
  let interval;
  
  wss.on("connection", (ws, req) => {
    console.log("Client connected");

    // Send random message to all clients every 5 seconds
    interval = setInterval(() => {

      const cookies = req.headers.cookie || "";
      const token = cookies.split(";").find(c => c.trim().startsWith("a-usr="));

      if (!token) {
        ws.send(JSON.stringify({ Auth: false }));
      } else {
        ws.send(JSON.stringify({ Auth: true }));

      }
    }, 10_000);



  });

  wss.on("close", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });

  return wss;
}

module.exports = { createWebSocketServer };
