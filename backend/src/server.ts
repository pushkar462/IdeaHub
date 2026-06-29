import http from 'http';
import './config/env.config'; // Fails fast if env vars are missing
import { config } from './config/env.config';
import app from './app';
import { initializeSocketServer } from './socket/socket.server';
import { initializeSocketEventHandlers } from './socket/socket.events';
import './services/analytics/workflow-metrics.service'; // Init metric listeners
import { startSlaCron } from './cron/sla.cron';

const PORT = config.PORT;

const httpServer = http.createServer(app);

// Initialize modular websocket architecture
initializeSocketServer(httpServer);

// Boot up internal event listeners that bridge to sockets
initializeSocketEventHandlers();

// Boot up internal event listeners that bridge logic
import { startInternalEventHandlers } from './services/events/internal-event-handlers';
startInternalEventHandlers();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  // Start Cron Jobs
  startSlaCron();
});
