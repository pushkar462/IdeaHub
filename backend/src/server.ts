import http from 'http';
import './config/env.config'; // Fails fast if env vars are missing
import { config } from './config/env.config';
import app from './app';
import { initializeSocketServer } from './socket/socket.server';
import { initializeSocketEventHandlers } from './socket/socket.events';
import './services/analytics/workflow-metrics.service'; // Init metric listeners

const PORT = config.PORT;

const httpServer = http.createServer(app);

// Initialize modular websocket architecture
initializeSocketServer(httpServer);

// Boot up internal event listeners that bridge to sockets
initializeSocketEventHandlers();

// Boot up BullMQ Workers and Event Bridges
import { startWorker } from './jobs/worker';
import { startEventBridge } from './services/events/event-to-queue.bridge';
startWorker();
startEventBridge();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
