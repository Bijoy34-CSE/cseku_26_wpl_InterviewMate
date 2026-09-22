/**
 * Transactional email delivery (verification codes).
 *
 * Deliberately has NO fallback that pretends to succeed: if SMTP isn't
 * configured, isConfigured() returns false and the caller surfaces a real
 * configuration error. A user must never see "code sent" when nothing was.
 */

const nodemailer = require('nodemailer');

const REQUIRED_VARS = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD'];

function missingVars() {
  return REQUIRED_VARS.filter((key) => !process.env[key]);
}

function isConfigured() {
  return missingVars().length === 0;
}

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.EMAIL_PORT);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 upgrades via STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return cachedTransporter;
}

function verificationTemplate(code, minutesValid) {
  const text = [
    'InterviewMate - Email Verification',
    '',
    `Your verification code: ${code}`,
    '',
    `This code expires in ${minutesValid} minutes and can only be used once.`,
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');

  const html = `
  <div style="background:#f8fafc;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:18px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">Interview<span style="color:#5846F6;">Mate</span></span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 8px;font-size:16px;font-weight:800;color:#0f172a;">Email Verification</h1>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#64748b;">
          Enter the code below to finish setting up your InterviewMate account.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
          <div style="font-size:32px;font-weight:800;letter-spacing:10px;color:#5846F6;font-family:'SF Mono',Menlo,Consolas,monospace;">${code}</div>
        </div>
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
          This code expires in <strong style="color:#0f172a;">${minutesValid} minutes</strong> and can only be used once.
        </p>
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
    <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:11px;color:#94a3b8;">
      Sent by InterviewMate
    </p>
  </div>`;

  return { text, html };
}

/**
 * @throws if SMTP isn't configured or the send fails - never silently succeeds.
 */
async function sendVerificationEmail(to, code, minutesValid) {
  if (!isConfigured()) {
    throw new Error(
      `Email service is not configured. Missing environment variable(s): ${missingVars().join(', ')}`
    );
  }

  const { text, html } = verificationTemplate(code, minutesValid);

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Your InterviewMate verification code: ${code}`,
    text,
    html,
  });
}

module.exports = { isConfigured, missingVars, sendVerificationEmail, verificationTemplate };
