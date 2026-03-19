import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGO_URI,
  fontendUrl: process.env.FRONTEND_URL,
  ragServiceUrl: process.env.RAG_SERVICE_URL,
  ragApiKey: process.env.RAG_API_KEY,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  cookieName: "accessToken",
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  googleClientId: process.env.GOOGLE_CLINT_ID,
  razorpayKey: process.env.RAZORPAY_KEY_ID,
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET,
  resendApiKey: process.env.RESEND_API_KEY,
  elasticlakeEndpoint: process.env.ELASTIC_ENDPOINT,
  elasticlakeKey: process.env.ELASTIC_ACCESS_KEY,
  elasticlakeSecret: process.env.ELASTIC_SECRET_KEY,
  elasticlakeBucket: process.env.ELASTIC_BUCKET,
  elasticlakeRegion: process.env.ELASTIC_REGION,
};