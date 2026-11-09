// Sends an email through Brevo's HTTP API (free tier, no extra npm package needed).
// If BREVO_API_KEY is not set (e.g. local dev), the email is printed to the server console instead,
// so you can still copy the reset link while testing.
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM;

  if (!apiKey || !senderEmail) {
    console.log("\n[DEV] Email not configured. Would have sent to:", to);
    console.log("[DEV] Subject:", subject);
    console.log("[DEV] Body:", html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), "\n");
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Wingspan", email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo error ${response.status}: ${await response.text()}`);
  }
};

module.exports = sendEmail;
