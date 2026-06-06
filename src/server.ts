import app from "./app";
import { config } from "./config/config";
import { connectDB } from "./config/db";

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(config.port, () => {
      console.log(
        `Server running on: ${
          config.isProduction
            ? "https://api.insightshub.in"
            : `http://localhost:${config.port}`
        }`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
