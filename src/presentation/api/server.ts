#!/usr/bin/env node

import WebApiServer from "./WebApiServer";
import logger from "@infrastructure/monitoring/logger";

async function startServer() {
  try {
    const port = parseInt(process.env.PORT || "3000");
    const server = new WebApiServer(port);

    await server.start();
  } catch (error: any) {
    logger.error("Failed to start Web API server", {
      error: error.message,
      stack: error.stack,
    });

    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

// Start server only if this file is executed directly
if (require.main === module) {
  startServer();
}

export { startServer };
export default startServer;
