import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI as string,
  frontendUrl: process.env.FRONTEND_URL as string,
  ragServiceUrl: process.env.RAG_SERVICE_URL as string,
  ragApiKey: process.env.RAG_API_KEY as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "7d") as string,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  cookieName: "accessToken" as const,
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  googleClientId: process.env.GOOGLE_CLIENT_ID as string,
  razorpayKey: process.env.RAZORPAY_KEY_ID as string,
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET as string,
  resendApiKey: process.env.RESEND_API_KEY as string,
  elasticlakeEndpoint: process.env.ELASTIC_ENDPOINT as string,
  elasticlakeKey: process.env.ELASTIC_ACCESS_KEY as string,
  elasticlakeSecret: process.env.ELASTIC_SECRET_KEY as string,
  elasticlakeBucket: process.env.ELASTIC_BUCKET as string,
  elasticlakeRegion: process.env.ELASTIC_REGION as string,
};
