
import "dotenv/config";
import nodemailer from "nodemailer";

console.log("========== SMTP TEST ==========");
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS_EXISTS:", !!process.env.SMTP_PASS);
console.log("SMTP_PASS_LENGTH:", process.env.SMTP_PASS?.length);
console.log("================================");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function test() {
    try {
        console.log("Testing Gmail SMTP...");

        await transporter.verify();

        console.log("✅ Gmail authentication successful");

        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.SMTP_USER,
            subject: "NexTurn SMTP Test",
            text: "NexTurn email service is working correctly.",
        });

        console.log("✅ Email sent successfully");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Gmail SMTP test failed:");
        console.error(error);
    }
}

test();