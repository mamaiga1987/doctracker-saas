#!/bin/bash
# ============================================================
# DocTracker SaaS — Script de déploiement OVH
# Usage : ./scripts/deploy.sh [first-deploy|update|rollback]
# ============================================================
set -e

STACK_DIR="/opt/bi-stack/doctracker-saas"
COMPOSE="docker compose -f $STACK_DIR/docker-compose.yml"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[DocTracker SaaS]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Vérifications ────────────────────────────────────────────
check_env() {
  [ -f "$STACK_DIR/.env" ] || error ".env manquant — cp .env.example .env et le remplir"
  source "$STACK_DIR/.env"
  [ -z "$PG_PASSWORD" ]  && error "PG_PASSWORD manquant dans .env"
  [ -z "$JWT_SECRET" ]   && error "JWT_SECRET manquant dans .env"
  log "✅ Variables d'environnement OK"
}

# ── Premier déploiement ──────────────────────────────────────
first_deploy() {
  log "🚀 Premier déploiement DocTracker SaaS..."
  check_env

  # Vérifier que le réseau bi-stack_analytics-net existe
  docker network ls | grep bi-stack_analytics-net > /dev/null || \
    error "Réseau bi-stack_analytics-net introuvable. Lancez d'abord le stack principal."

  # DNS check
  log "📡 Pensez à ajouter un enregistrement DNS A :"
  log "   ${SAAS_DOMAIN} → $(curl -s ifconfig.me)"

  # Build & démarrage
  log "🔨 Build des images..."
  $COMPOSE build --no-cache

  log "▶️  Démarrage des services..."
  $COMPOSE up -d

  log "⏳ Attente base de données..."
  sleep 15

  # Vérification
  $COMPOSE ps
  $COMPOSE logs doctracker-saas-backend | tail -5

  log ""
  log "✅ DocTracker SaaS déployé !"
  log "   URL: https://${SAAS_DOMAIN}"
  log "   Inscrivez-vous sur /register pour créer le premier compte"
}

# ── Mise à jour ───────────────────────────────────────────────
update() {
  log "🔄 Mise à jour DocTracker SaaS..."
  check_env

  log "🔨 Build..."
  $COMPOSE build

  log "♻️  Redémarrage rolling..."
  $COMPOSE up -d --no-deps doctracker-saas-backend
  sleep 5
  $COMPOSE up -d --no-deps doctracker-saas-frontend

  $COMPOSE ps
  log "✅ Mise à jour terminée"
}

# ── Logs ─────────────────────────────────────────────────────
logs() {
  $COMPOSE logs -f --tail=50
}

# ── Status ───────────────────────────────────────────────────
status() {
  $COMPOSE ps
  echo ""
  echo "Health check API :"
  curl -sk "https://${SAAS_DOMAIN}/api/health" | python3 -m json.tool 2>/dev/null || echo "API non joignable"
}

# ── Stop ─────────────────────────────────────────────────────
stop() {
  $COMPOSE down
  log "Services arrêtés"
}

# ── Main ─────────────────────────────────────────────────────
case "${1:-help}" in
  first-deploy) first_deploy ;;
  update)       update ;;
  logs)         logs ;;
  status)       status ;;
  stop)         stop ;;
  *)
    echo "Usage: $0 {first-deploy|update|logs|status|stop}"
    exit 1 ;;
esac
