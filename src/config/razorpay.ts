import Razorpay from "razorpay";
import { config } from "./config";

export const razorpayInstance = new Razorpay({
  key_id: config.razorpayKey,
  key_secret: config.razorpaySecret,
});
