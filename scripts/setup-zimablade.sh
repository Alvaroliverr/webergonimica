#!/usr/bin/env bash
# ==============================================================================
# Script de instalación y configuración automática del Bot en ZimaBlade / Linux
# ==============================================================================
set -e

echo "=== [1/5] Comprobando dependencias del sistema ==="
sudo apt-get update -qq
sudo apt-get install -y -qq git nodejs npm curl

NODE_VER=$(node -v 2>/dev/null || echo "v0")
echo "Node.js versión detectada: $NODE_VER"

echo ""
echo "=== [2/5] Configuración de clave SSH para GitHub ==="
SSH_KEY="$HOME/.ssh/id_ed25519"
if [ ! -f "$SSH_KEY" ]; then
  echo "Generando nueva clave SSH para ZimaBlade..."
  ssh-keygen -t ed25519 -C "zimablade-bot@eldeskops.com" -f "$SSH_KEY" -N ""
else
  echo "Clave SSH ya existente en $SSH_KEY"
fi

echo ""
echo "------------------------------------------------------------------------"
echo ">> COPIA ESTA CLAVE PÚBLICA Y PÉGALA EN GITHUB:"
echo ">> En: https://github.com/Alvaroliverr/webergonimica/settings/keys"
echo ">> (Marca la casilla 'Allow write access')"
echo "------------------------------------------------------------------------"
cat "${SSH_KEY}.pub"
echo "------------------------------------------------------------------------"
echo ""

read -p "Pulsa [ENTER] una vez hayas añadido la clave en GitHub con permiso de escritura..."

echo "Probando conexión con GitHub..."
ssh -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true

echo ""
echo "=== [3/5] Clonando o actualizando el repositorio ==="
TARGET_DIR="$HOME/webergonimica"
if [ -d "$TARGET_DIR" ]; then
  echo "El repositorio ya existe en $TARGET_DIR. Actualizando..."
  cd "$TARGET_DIR"
  git pull origin main
else
  echo "Clonando repositorio en $TARGET_DIR..."
  git clone git@github.com:Alvaroliverr/webergonimica.git "$TARGET_DIR"
  cd "$TARGET_DIR"
fi

git config user.name "ZimaBlade Bot"
git config user.email "bot-zimablade@eldeskops.com"

echo ""
echo "=== [4/5] Prueba del script en modo dry-run ==="
node scripts/actualizador-precios-bot.mjs --dry-run || echo "Prueba completada."

echo ""
echo "=== [5/5] Programando tarea en Cron (2 veces al día: 08:00 y 20:00) ==="
CRON_CMD="0 8,20 * * * cd $TARGET_DIR && git pull origin main && node scripts/actualizador-precios-bot.mjs >> $HOME/bot-precios.log 2>&1"

# Añadir a crontab si no existe
(crontab -l 2>/dev/null | grep -Fv "actualizador-precios-bot.mjs" ; echo "$CRON_CMD") | crontab -

echo ""
echo "========================================================================"
echo " ¡INSTALACIÓN COMPLETADA CON ÉXITO EN TU ZIMABLADE!"
echo " - Repositorio en: $TARGET_DIR"
echo " - Tarea programada en cron: Todos los días a las 08:00 y 20:00"
echo " - Registro de logs en: $HOME/bot-precios.log"
echo "========================================================================"
