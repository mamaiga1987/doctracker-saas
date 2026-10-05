const { PDFDocument, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');

async function addWatermark(pdfPath, memberName, memberEmail, token) {
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  const name  = (memberName  || 'CONFIDENTIEL').toUpperCase();
  const email = (memberEmail || '').toLowerCase();
  const date  = new Date().toLocaleDateString('fr-FR');

  // Métadonnées
  pdfDoc.setTitle('Document Confidentiel — ' + name);
  pdfDoc.setAuthor('AirByte DocTracker');
  pdfDoc.setSubject('Document confidentiel assigné à : ' + email);
  pdfDoc.setKeywords(['confidentiel', name, email, date, token || '']);
  pdfDoc.setCreator('DocTracker AirByte — ' + new Date().toLocaleString('fr-FR'));
  pdfDoc.setProducer('Destinataire: ' + email + ' | Token: ' + (token || 'N/A'));

  // Générer QR code comme image PNG
  let qrImageBytes = null;
  if (token) {
    const trackingUrl = 'https://doctracker.monairbyte.eu/api/track/pixel/' + token;
    try {
      const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M'
      });
      // Convertir base64 en buffer
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      qrImageBytes = Buffer.from(base64Data, 'base64');
    } catch (e) {
      console.error('QR code error:', e.message);
    }
  }

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    // Bandeau haut
    page.drawText('CONFIDENTIEL  |  ' + name + '  |  ' + email, {
      x: 28, y: height - 16, size: 7.5,
      color: rgb(0.45, 0.45, 0.45), opacity: 0.75,
    });

    // Bandeau bas
    page.drawText('Document confidentiel  |  ' + email + '  |  ' + date, {
      x: 28, y: 14, size: 7.5,
      color: rgb(0.45, 0.45, 0.45), opacity: 0.75,
    });

    // Référence token court
    const shortToken = token ? token.substring(0, 12) + '...' : '';
    page.drawText('p.' + (pageIndex + 1) + '/' + pages.length + '  REF:' + shortToken, {
      x: width - 120, y: 14, size: 6,
      color: rgb(0.6, 0.6, 0.6), opacity: 0.6,
    });

    // QR code sur PREMIÈRE page seulement
    if (pageIndex === 0 && qrImageBytes) {
      try {
        const qrImage = await pdfDoc.embedPng(qrImageBytes);
        const qrSize = 70;
        const qrX = width - qrSize - 20;
        const qrY = height - qrSize - 20;

        page.drawImage(qrImage, {
          x: qrX, y: qrY,
          width: qrSize, height: qrSize,
          opacity: 0.85
        });

        page.drawText('Vérifier', {
          x: qrX + 8, y: qrY - 10, size: 6,
          color: rgb(0.5, 0.5, 0.5), opacity: 0.7,
        });
      } catch (e) {
        console.error('QR embed error:', e.message);
      }
    }
  }

  return Buffer.from(await pdfDoc.save());
}

module.exports = { addWatermark };
