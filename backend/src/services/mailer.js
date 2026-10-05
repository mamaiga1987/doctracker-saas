const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: '9ee9d6001@smtp-brevo.com',
    pass: 'xsmtpsib-4155a8ae270d7823c743bd99fdc452bb4e91d227ac5366fcc39e28c0b5504200-laP3xYsAIUCUCcQW'
  }
});

async function sendOTP(toEmail, memberName, code, expiresMinutes = 10) {
  await transporter.sendMail({
    from: '"DocTracker AirByte" <adhesion@monairbyte.eu>',
    to: toEmail,
    subject: `🔐 Votre code d'accès : ${code}`,
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="utf-8"/></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8f9fc;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div style="text-align:center;margin-bottom:32px">
            <div style="font-size:48px;margin-bottom:12px">🔐</div>
            <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px">Code d'accès document</h1>
            <p style="color:#6b7280;font-size:14px;margin:0">Bonjour ${memberName},</p>
          </div>
          
          <p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:24px">
            Un document confidentiel vous a été envoyé. Utilisez le code ci-dessous pour y accéder. Ce code est valable <strong>${expiresMinutes} minutes</strong>.
          </p>

          <div style="background:#f0f0ff;border:2px solid #6366f1;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
            <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#6366f1;font-family:monospace">
              ${code}
            </div>
          </div>

          <p style="color:#9ca3af;font-size:12px;text-align:center;line-height:1.6">
            ⚠️ Ne partagez jamais ce code.<br/>
            Si vous n'avez pas demandé ce code, ignorez cet email.<br/>
            Toute tentative d'accès non autorisée est enregistrée.
          </p>

          <div style="border-top:1px solid #f3f4f6;margin-top:24px;padding-top:16px;text-align:center">
            <p style="color:#9ca3af;font-size:11px;margin:0">DocTracker — AirByte · Document confidentiel</p>
          </div>
        </div>
      </body>
      </html>
    `
  });
}



async function sendPIN(toEmail, memberName, pin) {
  await transporter.sendMail({
    from: '"DocTracker AirByte" <adhesion@monairbyte.eu>',
    to: toEmail,
    subject: '🔑 Votre code PIN DocTracker',
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="utf-8"/></head>
      <body style="font-family:-apple-system,sans-serif;background:#f8f9fc;padding:40px 20px;margin:0">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div style="text-align:center;margin-bottom:32px">
            <div style="font-size:48px;margin-bottom:12px">🔑</div>
            <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px">Votre code PIN personnel</h1>
            <p style="color:#6b7280;font-size:14px;margin:0">Bonjour ${memberName},</p>
          </div>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:24px">
            Voici votre code PIN personnel pour accéder aux documents confidentiels de l'association.
          </p>
          <div style="background:#f0f0ff;border:2px solid #6366f1;border-radius:16px;padding:24px;text-align:center;margin:24px 0">
            <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#4338ca;font-family:monospace">${pin}</div>
          </div>
          <div style="background:#fff5f5;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="color:#dc2626;font-weight:700;margin:0 0 6px">⚠️ Important</p>
            <p style="color:#374151;font-size:13px;margin:0">Ce code est strictement personnel. Ne le partagez avec personne. Il vous sera demandé à chaque connexion.</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">DocTracker — Les Usagers de 3F Yvelines</p>
        </div>
      </body>
      </html>
    `
  });
}



async function sendNotificationEmail(adminEmail, member, info) {
  const time = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  await transporter.sendMail({
    from: '"DocTracker Alerte" <adhesion@monairbyte.eu>',
    to: adminEmail,
    subject: 'Alerte : ' + member.name + ' a ouvert le document',
    html: '<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">' +
      '<div style="background:#1e1b4b;border-radius:10px;padding:16px;text-align:center;margin-bottom:24px">' +
      '<h1 style="color:#fff;font-size:18px;margin:0">Alerte DocTracker</h1></div>' +
      '<p style="font-size:15px;color:#374151"><strong>' + member.name + '</strong> vient d\'ouvrir le document.</p>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Membre</td><td style="padding:8px;font-weight:700">' + member.name + '</td></tr>' +
      '<tr><td style="padding:8px;color:#6b7280">Email</td><td style="padding:8px">' + member.email + '</td></tr>' +
      '<tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Date/Heure</td><td style="padding:8px;font-weight:700">' + time + '</td></tr>' +
      '<tr><td style="padding:8px;color:#6b7280">IP</td><td style="padding:8px;font-family:monospace">' + (info.ip || '-') + '</td></tr>' +
      '<tr style="background:#f9fafb"><td style="padding:8px;color:#6b7280">Localisation</td><td style="padding:8px">' + (info.city || '') + ' ' + (info.country || '') + '</td></tr>' +
      '<tr><td style="padding:8px;color:#6b7280">Navigateur</td><td style="padding:8px">' + (info.browser || '-') + ' - ' + (info.os || '-') + '</td></tr>' +
      '</table>' +
      '<div style="margin-top:24px;text-align:center">' +
      '<a href="https://doctracker.monairbyte.eu" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">Voir le dashboard</a>' +
      '</div></div>'
  });
}

module.exports = { sendOTP, sendPIN, sendNotificationEmail };
