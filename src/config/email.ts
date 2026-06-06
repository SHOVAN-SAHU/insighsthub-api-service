import { Resend } from "resend";
import { config } from "./config";

const resend = new Resend(config.resendApiKey);

interface PaymentSuccessEmailOptions {
  name?: string;
  planName: string;
  amount: number;
  expiresAt: Date;
}

export const sendPaymentSuccessEmail = async (
  to: string,
  { name, planName, amount, expiresAt }: PaymentSuccessEmailOptions,
): Promise<void> => {
  try {
    const { data, error } = await resend.emails.send({
      from: "InsightsHub <subscription@insightshub.in>",
      to,
      subject: `Payment Successful — You're on ${planName}!`,
      html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
        <h2>Hi ${name ?? "there"}, your payment was successful! 🎉</h2>
        <p>You are now subscribed to the <strong>${planName}</strong> plan.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Amount Paid</td>
            <td style="padding: 8px; border: 1px solid #ddd;">₹${amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Plan</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Valid Until</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(expiresAt).toDateString()}</td>
          </tr>
        </table>
        <p>Thanks for choosing InsightsHub!</p>
      </div>
    `,
    });

    if (error) {
      console.error("Resend error:", error.message);
      return;
    }

    console.log("Payment success email sent to", to, "| id:", data?.id);
  } catch (err) {
    // never throw — email failure must not break the webhook or payment flow
    console.error("Unexpected email error:", (err as Error).message);
  }
};
