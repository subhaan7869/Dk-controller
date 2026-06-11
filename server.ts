import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // Initialize WebSocket Server
  const wss = new WebSocketServer({ server });

  // Event Interface
  interface DJEvent {
    id: string;
    timestamp: string;
    type: string;
    deck?: number | string;
    value?: number;
    band?: string;
    pad?: number;
    control?: string;
  }

  let eventLogs: DJEvent[] = [];
  let connectionCount = 0;

  wss.on("connection", (ws, req) => {
    connectionCount++;
    console.log(`[WebSocket] New client connected. Total clients: ${connectionCount}`);

    // Send immediate connection acknowledge
    ws.send(JSON.stringify({
      id: "sys-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type: "system_status",
      message: "Connected to Web DJ MIDI Controller WebSocket Server",
      clients: connectionCount
    }));

    // Broadcast system update about connected clients
    broadcast({
      type: "system_connections",
      clients: connectionCount
    });

    ws.on("message", (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage.toString());
        
        // Add timestamp and ID on the server side to ensure integrity
        const loggedEvent: DJEvent = {
          id: parsed.id || "evt-" + Math.random().toString(36).substring(2, 9),
          timestamp: parsed.timestamp || new Date().toISOString(),
          type: parsed.type,
          deck: parsed.deck,
          value: parsed.value !== undefined ? Number(parsed.value) : undefined,
          band: parsed.band,
          pad: parsed.pad,
          control: parsed.control
        };

        // Add to standard event log
        eventLogs.unshift(loggedEvent);
        if (eventLogs.length > 200) {
          eventLogs.pop(); // Keep last 200 logs
        }

        // Print to server console for MIDI logging verification
        console.log(`[DJ MIDI EVENT] Deck: ${loggedEvent.deck || 'N/A'} | Type: ${loggedEvent.type} | Value: ${loggedEvent.value !== undefined ? loggedEvent.value : 'N/A'}`);

        // Broadcast event to ALL OTHER connected clients (like a secondary MIDI bridge running on workspace or client)
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(loggedEvent));
          }
        });

      } catch (err: any) {
        console.error("[WebSocket] Failed parsing incoming event JSON:", err.message);
        ws.send(JSON.stringify({
          type: "system_error",
          message: "Malformatted JSON event. Handshake requires standard structure."
        }));
      }
    });

    ws.on("close", () => {
      connectionCount = Math.max(0, connectionCount - 1);
      console.log(`[WebSocket] Client disconnected. Total clients: ${connectionCount}`);
      broadcast({
        type: "system_connections",
        clients: connectionCount
      });
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Error occurred on connection:", error);
    });
  });

  function broadcast(payloadObj: any) {
    const raw = JSON.stringify(payloadObj);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  }

  // Body Parsing Middleware
  app.use(express.json());

  // API endpoint: Get full list of event logs
  app.get("/api/events", (req, res) => {
    res.json(eventLogs);
  });

  // API endpoint: Clear active event logs
  app.post("/api/events/clear", (req, res) => {
    eventLogs = [];
    res.json({ success: true, message: "Logs cleared successfully" });
  });

  // API endpoint: Status metrics
  app.get("/api/status", (req, res) => {
    res.json({
      uptime: process.uptime(),
      clients: connectionCount,
      totalEventsLogged: eventLogs.length,
      platform: process.platform,
      nodeVersion: process.version,
    });
  });

  // Handle client integration via Vite (Dev mode) or static build (Production mode)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`===============================================`);
    console.log(`🎵 iPad DJ Web Controller Server Started!`);
    console.log(`🔗 Web: http://0.0.0.0:${PORT}`);
    console.log(`🔌 WebSocket Server: ws://0.0.0.0:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer().catch((error) => {
  console.error("Fatal failure in starting server:", error);
  process.exit(1);
});
