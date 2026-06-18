const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[INFO] Server running on port ${PORT}`);
});

// Graceful shutdown handler
const shutdown = () => {
  console.log('[INFO] Received shutdown signal. Closing server...');
  server.close(() => {
    console.log('[INFO] Server closed. Exiting process.');
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    console.error('[ERROR] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
