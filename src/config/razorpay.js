import Razorpay from "razorpay";
import { config } from "./config.js";

export const razorpayInstance = new Razorpay({
  key_id: config.razorpayKey,
  key_secret: config.razorpaySecret,
});