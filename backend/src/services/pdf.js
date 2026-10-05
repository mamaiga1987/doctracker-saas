const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

async function addWatermark(inputPath, outputPath, { recipientName, recipientEmail, date, orgName }) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  const font     = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages    = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();

    // ── Filigrane diagonal visible (nom + email) ──────────
    const name  = recipientName || recipientEmail || 'CONFIDENTIEL';
    const email = recipientEmail || '';
    const fontSize = Math.min(width, height) * 0.045;

    // Ligne 1 : nom en diagonal centré
    page.drawText(name.toUpperCase(), {
      x:       width * 0.1,
      y:       height * 0.55,
      size:    fontSize,
      font,
      color:   rgb(0.75, 0.75, 0.75),
      opacity: 0.35,
      rotate:  { type: 'degrees', angle: -35 },
    });

    // Ligne 2 : email en diagonal
    page.drawText(email, {
      x:       width * 0.08,
      y:       height * 0.42,
      size:    fontSize * 0.65,
      font:    fontReg,
      color:   rgb(0.75, 0.75, 0.75),
      opacity: 0.3,
      rotate:  { type: 'degrees', angle: -35 },
    });

    // Ligne 3 : CONFIDENTIEL en diagonal
    page.drawText('CONFIDENTIEL', {
      x:       width * 0.12,
      y:       height * 0.32,
      size:    fontSize * 0.55,
      font,
      color:   rgb(0.8, 0.2, 0.2),
      opacity: 0.15,
      rotate:  { type: 'degrees', angle: -35 },
    });

    // ── Pied de page discret ──────────────────────────────
    const footerText = `${orgName||'Confidentiel'} — ${email} — ${date} — Page ${pages.indexOf(page)+1}/${pages.length}`;
    const footerSize = 7;
    page.drawText(footerText, {
      x:       20,
      y:       8,
      size:    footerSize,
      font:    fontReg,
      color:   rgb(0.5, 0.5, 0.5),
      opacity: 0.7,
    });
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(outputPath, out);
  return outputPath;
}

async function addQRCode(inputPath, outputPath, { trackingUrl }) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  const pages    = pdfDoc.getPages();

  const qrBuffer = await QRCode.toBuffer(trackingUrl, { width:60, margin:1 });
  const qrImage  = await pdfDoc.embedPng(qrBuffer);

  for (const page of pages) {
    const { width } = page.getSize();
    page.drawImage(qrImage, {
      x: width - 48, y: 20,
      width: 36, height: 36,
      opacity: 0.35,
    });
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(outputPath, out);
  return outputPath;
}

async function addMetadata(inputPath, outputPath, { title, recipientEmail, shareToken, orgName }) {
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc   = await PDFDocument.load(pdfBytes);
  pdfDoc.setTitle(title || 'Document confidentiel');
  pdfDoc.setAuthor(orgName || 'DocTracker');
  pdfDoc.setSubject(`Partagé avec ${recipientEmail}`);
  pdfDoc.setKeywords([`token:${shareToken}`, `recipient:${recipientEmail}`]);
  pdfDoc.setProducer('DocTracker SaaS');
  pdfDoc.setCreationDate(new Date());
  const out = await pdfDoc.save();
  fs.writeFileSync(outputPath, out);
  return outputPath;
}

async function processPDF({ inputPath, orgId, shareToken, recipientName, recipientEmail, orgName, version='A', watermarkEnabled=true, qrCodeEnabled=true, metadataEnabled=true, trackingBaseUrl }) {
  const date = new Date().toLocaleDateString('fr-FR');
  const trackingUrl = `${trackingBaseUrl}/view/${shareToken}`;
  const tmpDir = path.join(UPLOAD_DIR, orgId);
  fs.mkdirSync(tmpDir, { recursive: true });
  let currentPath = inputPath;

  if (watermarkEnabled) {
    const wmPath = path.join(tmpDir, `${shareToken.slice(0,8)}_wm.pdf`);
    await addWatermark(currentPath, wmPath, { recipientName, recipientEmail, date, orgName });
    currentPath = wmPath;
  }

  if (qrCodeEnabled) {
    const qrPath = path.join(tmpDir, `${shareToken.slice(0,8)}_qr.pdf`);
    await addQRCode(currentPath, qrPath, { trackingUrl });
    if (currentPath !== inputPath) fs.unlinkSync(currentPath);
    currentPath = qrPath;
  }

  if (metadataEnabled) {
    const finalPath = path.join(tmpDir, `${shareToken.slice(0,8)}_final.pdf`);
    await addMetadata(currentPath, finalPath, { title:'Document', recipientEmail, shareToken, orgName });
    if (currentPath !== inputPath) fs.unlinkSync(currentPath);
    currentPath = finalPath;
  }

  return currentPath;
}

module.exports = { addWatermark, addQRCode, addMetadata, processPDF };
