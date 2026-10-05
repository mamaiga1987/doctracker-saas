require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const path     = require('path');
const { initDB }       = require('./db');
const { initSocket }   = require('./socket');
const authRoutes       = require('./routes/auth');
const documentRoutes   = require('./routes/documents');
const shareRoutes      = require('./routes/shares');
const trackingRoutes   = require('./routes/tracking');
const analyticsRoutes  = require('./routes/analytics');
const billingRoutes    = require('./routes/billing');
const membersRoutes    = require('./routes/members');
const campaignsRoutes  = require('./routes/campaigns');
const aiRoutes         = require('./routes/ai');
const eventsRoutes     = require('./routes/events');
const devicesRoutes    = require('./routes/devices');
const liveRoutes       = require('./routes/live');
const alertsRoutes     = require('./routes/alerts');
const sessionsRoutes   = require('./routes/sessions');
const notificationsRoutes = require('./routes/notifications');
const reportRoutes     = require('./routes/report');
const notifyRoutes     = require('./routes/notify');
const settingsRoutes   = require('./routes/settings');
const importRoutes     = require('./routes/import');

const app    = express();
const server = http.createServer(app);
initSocket(server);

// ── Middlewares ──────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Stripe webhook doit être avant express.json()
app.use('/api/billing/webhook', require('express').raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/shares',    shareRoutes);
app.use('/api/track',     trackingRoutes);
app.use('/api/tracking',  trackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing',   billingRoutes);
app.use('/api/members',  membersRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/events',        eventsRoutes);
app.use('/api/devices',       devicesRoutes);
app.use('/api/alerts',        alertsRoutes);
app.use('/api/sessions',      sessionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/report',        reportRoutes);
app.use('/api/notify',        notifyRoutes);
app.use('/api/live',          liveRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/import',        importRoutes);

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  version: '2.0.0-saas',
  db: 'postgresql',
  timestamp: new Date()
}));

// ── Démarrage ────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 DocTracker SaaS backend — port ${PORT}`);
      console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Erreur démarrage:', err.message);
    process.exit(1);
  }
}

start();
