const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

const FROM = process.env.SMTP_FROM || 'DocTracker <noreply@doctracker.io>';

async function sendAccessEmail({ to, name, otp, pin, docTitle, orgName, accessUrl, customMessage }) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,sans-serif;background:#f4f6f9;margin:0;padding:0}
.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 36px;text-align:center}
.logo{color:#a78bfa;font-size:20px;font-weight:800}
.body{padding:32px 36px}
.doc{background:#f3f0ff;border-left:4px solid #7c3aed;padding:10px 16px;border-radius:0 8px 8px 0;font-weight:700;color:#1a1a2e;margin-bottom:24px}
.msg{background:#f8f9fb;border-radius:8px;padding:14px;color:#374151;font-size:14px;line-height:1.6;margin-bottom:24px}
.codes{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.code-box{background:#f3f0ff;border:2px solid #7c3aed;border-radius:12px;padding:18px;text-align:center}
.code-label{font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.code-val{font-size:30px;font-weight:900;color:#1a1a2e;font-family:monospace;letter-spacing:6px}
.code-single{background:#f3f0ff;border:2px solid #7c3aed;border-radius:12px;padding:18px;text-align:center;margin-bottom:24px}
.btn{display:block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px;border-radius:10px;font-weight:800;font-size:16px;text-align:center;margin-bottom:24px}
.steps{background:#f8f9fb;border-radius:10px;padding:16px 20px;margin-bottom:20px}
.step{display:flex;gap:10px;margin-bottom:8px;font-size:13px;color:#374151;align-items:flex-start}
.num{background:#7c3aed;color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.warn{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400e;margin-bottom:16px}
.footer{background:#f8f9fb;padding:20px 36px;text-align:center;font-size:12px;color:#9ca3af}
</style></head><body>
<div class="wrap">
<div class="header"><div class="logo">🔒 DocTracker</div><div style="color:#9ca3af;font-size:13px;margin-top:4px">Partage sécurisé de documents</div></div>
<div class="body">
<p style="margin:0 0 4px;font-size:14px;color:#6b7280">Bonjour ${name || to},</p>
<p style="font-size:20px;font-weight:800;color:#1a1a2e;margin:0 0 16px">${orgName} vous a partagé un document</p>
<div class="doc">📄 ${docTitle}</div>
${customMessage ? `<div class="msg">${customMessage.replace(/\n/g,'<br>')}</div>` : ''}
${(otp && pin) ? `
<p style="font-size:14px;color:#374151;margin:0 0 14px"><strong>Vos codes d'accès :</strong></p>
<div class="codes">
<div class="code-box"><div class="code-label">Code OTP</div><div class="code-val">${otp}</div><div style="font-size:11px;color:#7c3aed;margin-top:6px">Reçu par email</div></div>
<div class="code-box"><div class="code-label">Code PIN</div><div class="code-val">${pin}</div><div style="font-size:11px;color:#7c3aed;margin-top:6px">Confidentiel</div></div>
</div>` : otp ? `
<div class="code-single"><div class="code-label">Code OTP</div><div class="code-val">${otp}</div><div style="font-size:11px;color:#7c3aed;margin-top:6px">Valable 24h</div></div>` : pin ? `
<div class="code-single"><div class="code-label">Code PIN</div><div class="code-val">${pin}</div></div>` : ''}
<a href="${accessUrl}" class="btn">📄 Accéder au document →</a>
<div class="steps">
<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">Comment accéder :</div>
${pin ? `<div class="step"><div class="num">1</div><span>Cliquez sur le bouton ci-dessus</span></div>
<div class="step"><div class="num">2</div><span>Saisissez votre PIN : <strong>${pin}</strong></span></div>
${otp ? `<div class="step"><div class="num">3</div><span>Saisissez votre OTP : <strong>${otp}</strong></span></div>
<div class="step"><div class="num">4</div><span>Le document s'ouvre en lecture sécurisée</span></div>` :
`<div class="step"><div class="num">3</div><span>Le document s'ouvre en lecture sécurisée</span></div>`}` :
`<div class="step"><div class="num">1</div><span>Cliquez sur le bouton ci-dessus</span></div>
${otp ? `<div class="step"><div class="num">2</div><span>Saisissez votre OTP : <strong>${otp}</strong></span></div>
<div class="step"><div class="num">3</div><span>Le document s'ouvre en lecture sécurisée</span></div>` :
`<div class="step"><div class="num">2</div><span>Le document s'ouvre en lecture sécurisée</span></div>`}`}
</div>
<div class="warn">⚠️ Ne partagez pas ces codes. Ce document est tracé à votre nom. Toute tentative non autorisée est enregistrée.</div>
</div>
<div class="footer">DocTracker — ${orgName} · ${new Date().getFullYear()}</div>
</div>
</body></html>`;

  return getTransporter().sendMail({
    from: FROM,
    to,
    subject: `🔒 Votre accès sécurisé — ${docTitle}`,
    html,
  });
}

const sendOTP = sendAccessEmail;

async function sendInvitation({ to, orgName, inviterName, token, baseUrl }) {
  const url = `${baseUrl}/accept-invite?token=${token}`;
  return getTransporter().sendMail({
    from: FROM, to,
    subject: `Invitation à rejoindre ${orgName} sur DocTracker`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f4f6f9;margin:0;padding:20px">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
<div style="background:#1a1a2e;padding:24px;text-align:center;color:#a78bfa;font-size:18px;font-weight:800">🔒 DocTracker</div>
<div style="padding:24px">
<p style="font-size:20px;font-weight:800;color:#1a1a2e">Vous êtes invité(e) !</p>
<p><strong>${inviterName}</strong> vous invite à rejoindre <strong>${orgName}</strong>.</p>
<p style="text-align:center"><a href="${url}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-weight:700;display:inline-block">Accepter →</a></p>
<p style="color:#9ca3af;font-size:12px">Lien valable 7 jours.</p>
</div></div></body></html>`
  });
}

async function sendAlert({ to, severity, message, docTitle, recipientEmail, ip }) {
  const emoji = severity==='critical'?'🚨':severity==='warning'?'⚠️':'ℹ️';
  return getTransporter().sendMail({
    from: FROM, to,
    subject: `${emoji} Alerte DocTracker — ${docTitle}`,
    html: `<div style="font-family:sans-serif;padding:20px"><h3>${emoji} Alerte ${severity}</h3><p><b>Document:</b> ${docTitle}</p><p><b>Événement:</b> ${message}</p><p><b>Destinataire:</b> ${recipientEmail}</p><p><b>IP:</b> ${ip}</p></div>`
  });
}

module.exports = { sendOTP, sendAccessEmail, sendInvitation, sendAlert };
