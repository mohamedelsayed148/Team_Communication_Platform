import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not configured");
}

if (!process.env.EMAIL_FROM) {
  throw new Error("EMAIL_FROM is not configured");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export default resend;
