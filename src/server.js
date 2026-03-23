import app from "./app.js";
import { config } from "./config/config.js";
import { connectDB } from "./config/db.js";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(config.port, () => {
      console.log(
        `Server running on: ${
          config.isProduction
            ? "https://api.insightshub.in"
            : `http://localhost:${config.port}`
        }`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
