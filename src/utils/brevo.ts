interface PasswordResetEmailOptions {
  email: string;
  name: string;
  resetLink: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });

export const sendFacultyPasswordResetEmail = async ({
  email,
  name,
  resetLink,
}: PasswordResetEmailOptions) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "CDC Acropolis";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is incomplete");
  }

  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(resetLink);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email, name }],
      subject: "Reset your Acropolis CMS password",
      htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; width: 100%; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

        <!-- Outer Canvas Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 40px 16px;">

              <!-- Main Email Card -->
              <table role="presentation" width="100%" maxWidth="520" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; width: 100%; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding: 40px 32px;">

                    <!-- Brand Logo Header -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #f4f4f5;">
                          <img src="https://img.mailinblue.com/12344944/images/rnb/original/6ac137851e05abe1505bbdaa.png" alt="CDC Acropolis Group of Institutions" width="220" style="display: block; width: 220px; height: auto; border: 0; max-width: 100%;" />
                        </td>
                      </tr>
                    </table>

                    <!-- Main Content Body -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 24px 0 0 0;">
                          <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #002060; letter-spacing: -0.01em;">Password reset</h1>

                          <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">Hello ${safeName},</p>

                          <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">We received a request to reset the password for your account. Click the button below to choose a new password.</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Call to Action Button (Coordinated Brand Color) -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="left" style="padding-bottom: 24px;">
                          <a href="${safeLink}" target="_blank" style="display: inline-block; background-color: #002060; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; mso-padding-alt: 0; text-align: center;">
                            <!--[if mso]><i style="letter-spacing: 24px; mso-font-width: -100%; mso-text-raise: 30px;">&#8202;</i><![endif]-->
                            <span style="mso-text-raise: 15px;">Choose a new password</span>
                            <!--[if mso]><i style="letter-spacing: 24px; mso-font-width: -100%;">&#8202;</i><![endif]-->
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Information & Expiration Notice -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.5; color: #71717a;">
                          <p style="margin: 0 0 12px 0;">This single-use link expires in <strong>30 minutes</strong>. If you did not expect this email, you can safely ignore it.</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback Plain Text URL -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #f4f4f5;">
                      <tr>
                        <td style="padding-top: 24px; font-size: 12px; line-height: 1.5; color: #a1a1aa; word-break: break-all;">
                          If the button above does not work, copy and paste this URL into your browser:
                          <div style="margin-top: 8px;">
                            <a href="${safeLink}" target="_blank" style="color: #002060; text-decoration: underline;">${safeLink}</a>
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
      `,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `Brevo rejected the transactional email (${response.status})`,
    );
  }
};
