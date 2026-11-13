#!/usr/bin/env node
/**
 * Bot actualizador de precios para ElDeskOps.
 * Diseñado para ejecutarse periódicamente en tu servidor ZimaBlade (CasaOS / Linux) vía Cron o Docker.
 *
 * Modo de uso:
 *   node scripts/actualizador-precios-bot.mjs            # Ejecución normal y push a Git si hay cambios
 *   node scripts/actualizador-precios-bot.mjs --dry-run  # Modo prueba (no modifica Git ni hace push)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = resolve(__dirname, "../src/data/products.json");
const isDryRun = process.argv.includes("--dry-run");

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseSpanishPrice(priceStr) {
  if (!priceStr) return null;
  // Ej: "179,99 €" o "179.99" o "179,99"
  const clean = priceStr.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function formatSpanishPrice(num) {
  return `${num.toFixed(2).replace(".", ",")} €`;
}

async function fetchAmazonPrice(asin) {
  const url = `https://www.amazon.es/dp/${asin}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      console.warn(`[WARN] HTTP ${res.status} al consultar ASIN ${asin}`);
      return null;
    }

    const html = await res.text();

    // 1. Selector clásico de precio Amazon (.a-price .a-offscreen)
    const offscreenMatch = html.match(/class="a-offscreen"[^>]*>([^<]+)<\/span>/i);
    if (offscreenMatch && offscreenMatch[1]) {
      const parsed = parseSpanishPrice(offscreenMatch[1]);
      if (parsed) return parsed;
    }

    // 2. Selector de precio en oferta apexPriceToPay
    const apexMatch = html.match(/id="corePriceDisplay_desktop_feature_div"[\s\S]*?class="a-offscreen"[^>]*>([^<]+)<\/span>/i);
    if (apexMatch && apexMatch[1]) {
      const parsed = parseSpanishPrice(apexMatch[1]);
      if (parsed) return parsed;
    }

    // 3. Fallback de microdata JSON-LD o meta tag de precio
    const metaMatch = html.match(/itemprop="price"\s+content="([\d.]+)"/i);
    if (metaMatch && metaMatch[1]) {
      const parsed = parseFloat(metaMatch[1]);
      if (parsed) return parsed;
    }

    return null;
  } catch (err) {
    console.error(`[ERROR] Fallo al consultar ASIN ${asin}:`, err.message);
    return null;
  }
}

async function main() {
  console.log(`[INFO] Iniciando rastreo de precios ElDeskOps (${new Date().toISOString()})...`);
  const rawData = JSON.parse(readFileSync(PRODUCTS_PATH, "utf8"));
  let changesCount = 0;

  for (let i = 0; i < rawData.products.length; i++) {
    const p = rawData.products[i];
    if (!p.asin) continue;

    console.log(`[${i + 1}/${rawData.products.length}] Consultando ${p.nombre} (ASIN: ${p.asin})...`);
    const currentPrice = parseFloat(p.precio_raw);
    const newPrice = await fetchAmazonPrice(p.asin);

    if (newPrice && Math.abs(newPrice - currentPrice) >= 0.5) {
      const isDiscount = newPrice < currentPrice;
      const pctDrop = isDiscount ? Math.round(((currentPrice - newPrice) / currentPrice) * 100) : 0;

      console.log(`  -> Cambio de precio detectado: ${currentPrice} € => ${newPrice} € (${isDiscount ? `Oferta -${pctDrop}%` : "Subida"})`);

      if (isDiscount && pctDrop >= 5) {
        // Marcamos oferta activa
        p.en_oferta = true;
        p.precio_anterior = p.precio_anterior || p.precio_aproximado;
        p.badge_oferta = `-${pctDrop}%`;
      } else if (!isDiscount && p.en_oferta) {
        // Si subió o volvió al precio normal, desactivamos oferta
        p.en_oferta = false;
        delete p.precio_anterior;
        delete p.badge_oferta;
      }

      p.precio_raw = String(newPrice.toFixed(2));
      p.precio_aproximado = formatSpanishPrice(newPrice);
      changesCount++;
    } else {
      console.log(`  -> Sin cambios significativos (Actual: ${p.precio_aproximado}).`);
    }

    // Espera respetuosa de 3 segundos entre peticiones para evitar bloqueos
    await delay(3000);
  }

  if (changesCount > 0) {
    console.log(`[INFO] Se encontraron ${changesCount} cambios de precio. Guardando products.json...`);
    if (!isDryRun) {
      writeFileSync(PRODUCTS_PATH, JSON.stringify(rawData, null, 2) + "\n", "utf8");

      try {
        console.log("[INFO] Haciendo commit y push a GitHub para desplegar en Vercel...");
        execSync('git add src/data/products.json', { stdio: "inherit" });
        execSync(`git commit -m "Actualiza precios automáticos de Amazon [Bot ZimaBlade ${new Date().toLocaleDateString("es-ES")}]"`, { stdio: "inherit" });
        execSync("git push origin main", { stdio: "inherit" });
        console.log("[SUCCESS] Cambios subidos correctamente. Vercel reconstruirá la web automáticamente.");
      } catch (gitErr) {
        console.error("[ERROR] Error al hacer git push:", gitErr.message);
      }
    } else {
      console.log("[DRY-RUN] Modo prueba: no se escribieron cambios en git.");
    }
  } else {
    console.log("[INFO] Todos los precios están al día. Ningún cambio necesario.");
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
