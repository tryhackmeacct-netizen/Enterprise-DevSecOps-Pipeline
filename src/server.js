const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[INFO] Server running on port ${PORT}`);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const shutdown = () => {
  console.log('[INFO] Received shutdown signal. Closing server...');
  server.close(() => {
    console.log('[INFO] Server closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[ERROR] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message || err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});
