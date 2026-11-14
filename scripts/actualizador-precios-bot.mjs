#!/usr/bin/env node
/**
 * Bot actualizador de precios para ElDeskOps.
 * Diseñado para ejecutarse periódicamente en tu servidor ZimaBlade (CasaOS / Linux) vía Cron o Docker.
 *
 * Modo de uso:
 *   node scripts/actualizador-precios-bot.mjs                    # Ejecución normal y push a Git si hay cambios
 *   node scripts/actualizador-precios-bot.mjs --dry-run          # Modo prueba (no modifica Git ni hace push)
 *   node scripts/actualizador-precios-bot.mjs --dry-run --limit 3 # Prueba rápida de los 3 primeros productos
 *   node scripts/actualizador-precios-bot.mjs --fast             # Espera reducida entre peticiones
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = resolve(__dirname, "../src/data/products.json");

const isDryRun = process.argv.includes("--dry-run");
const isFast = process.argv.includes("--fast");
const limitIndex = process.argv.indexOf("--limit");
const maxProducts = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : Infinity;

const DELAY_MS = isFast ? 800 : 2500;
const curlBin = process.platform === "win32" ? "curl.exe" : "curl";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function parseSpanishPrice(priceStr) {
  if (!priceStr) return null;
  const clean = priceStr.replace(/[^\d,.]/g, "").trim();
  if (!clean) return null;

  if (clean.includes(",")) {
    // Formato español clásico: 179,99 o 1.299,00
    const num = parseFloat(clean.replace(/\./g, "").replace(",", "."));
    return isNaN(num) ? null : num;
  } else if (clean.includes(".")) {
    // Formato numérico con punto decimal: 179.99
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

export function formatSpanishPrice(num) {
  return `${num.toFixed(2).replace(".", ",")} €`;
}

/**
 * Obtiene el HTML de Amazon usando curl (vía spawn de streaming) para evitar bloqueos TLS/WAF.
 * Si curl no estuviera disponible, utiliza fetch como fallback.
 */
function fetchWithCurl(url) {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(curlBin, [
        "-s",
        "-L",
        url,
        "-H", `User-Agent: ${getRandomUserAgent()}`,
        "-H", "Accept-Language: es-ES,es;q=0.9,en;q=0.8",
        "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ]);

      const chunks = [];
      child.stdout.on("data", (chunk) => chunks.push(chunk));
      child.stderr.on("data", () => {});

      child.on("close", (code) => {
        if (code === 0) {
          const html = Buffer.concat(chunks).toString("utf8");
          resolve(html);
        } else {
          reject(new Error(`curl finalizó con código ${code}`));
        }
      });

      child.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function fetchWithFetch(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

export async function fetchAmazonPrice(asin) {
  const url = `https://www.amazon.es/dp/${asin}`;
  let html = "";

  try {
    html = await fetchWithCurl(url);
  } catch (_curlErr) {
    try {
      html = await fetchWithFetch(url);
    } catch (fetchErr) {
      console.warn(`  [WARN] Error al consultar ASIN ${asin}:`, fetchErr.message);
      return null;
    }
  }

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
}

async function main() {
  console.log(`=======================================================`);
  console.log(`  BOT RASTREADOR DE PRECIOS - ELDESKOPS`);
  console.log(`  Fecha: ${new Date().toLocaleString("es-ES")}`);
  console.log(`  Modo: ${isDryRun ? "DRY-RUN (Simulación sin push)" : "PRODUCCIÓN (Actualiza y sube a Git)"}`);
  if (limitIndex !== -1) console.log(`  Límite de prueba: Primeros ${maxProducts} productos`);
  console.log(`=======================================================\n`);

  const rawData = JSON.parse(readFileSync(PRODUCTS_PATH, "utf8"));
  let changesCount = 0;
  let matchesCount = 0;
  let errorsCount = 0;
  const changesList = [];

  const totalToScan = Math.min(rawData.products.length, maxProducts);

  for (let i = 0; i < totalToScan; i++) {
    const p = rawData.products[i];
    if (!p.asin) continue;

    process.stdout.write(`[${i + 1}/${totalToScan}] ${p.nombre} (${p.asin})... `);
    const currentPrice = parseFloat(p.precio_raw);
    const newPrice = await fetchAmazonPrice(p.asin);

    if (newPrice === null) {
      errorsCount++;
      console.log(`⚠️ No se pudo obtener precio (posible bloqueo temporal)`);
      await delay(DELAY_MS);
      continue;
    }

    if (Math.abs(newPrice - currentPrice) >= 0.5) {
      // Tomamos el precio regular base para calcular el % de descuento
      const regularPrice = p.precio_anterior ? parseSpanishPrice(p.precio_anterior) || currentPrice : currentPrice;
      const isDiscount = newPrice < regularPrice;
      const pctDrop = isDiscount ? Math.round(((regularPrice - newPrice) / regularPrice) * 100) : 0;

      if (isDiscount && pctDrop >= 5) {
        // Marcamos oferta activa
        p.en_oferta = true;
        p.precio_anterior = p.precio_anterior || p.precio_aproximado;
        p.badge_oferta = `-${pctDrop}%`;
        console.log(`🔥 OFERTA: ${currentPrice} € -> ${newPrice} € (${p.badge_oferta})`);
      } else {
        // Si subió o volvió al precio regular, desactivamos oferta
        if (p.en_oferta) {
          p.en_oferta = false;
          delete p.precio_anterior;
          delete p.badge_oferta;
        }
        console.log(`📈 AJUSTE: ${currentPrice} € -> ${newPrice} €`);
      }

      p.precio_raw = String(newPrice.toFixed(2));
      p.precio_aproximado = formatSpanishPrice(newPrice);
      changesCount++;
      changesList.push({
        id: p.id,
        nombre: p.nombre,
        anterior: `${currentPrice} €`,
        nuevo: `${newPrice} €`,
        oferta: p.badge_oferta || "No",
      });
    } else {
      matchesCount++;
      console.log(`✓ Al día (${p.precio_aproximado})`);
    }

    await delay(DELAY_MS);
  }

  console.log(`\n-------------------------------------------------------`);
  console.log(`  RESUMEN DE EJECUCIÓN`);
  console.log(`  - Productos escaneados: ${totalToScan}`);
  console.log(`  - Precios al día (sin cambios): ${matchesCount}`);
  console.log(`  - Cambios detectados: ${changesCount}`);
  console.log(`  - No obtenidos (timeouts o captcha): ${errorsCount}`);
  console.log(`-------------------------------------------------------`);

  if (changesCount > 0) {
    console.log(`\nDetalle de variaciones:`);
    console.table(changesList);

    if (!isDryRun) {
      console.log(`[INFO] Guardando datos en ${PRODUCTS_PATH}...`);
      writeFileSync(PRODUCTS_PATH, JSON.stringify(rawData, null, 2) + "\n", "utf8");

      try {
        console.log("[INFO] Haciendo commit y push a GitHub para desplegar en Vercel...");
        execSync("git add src/data/products.json", { stdio: "inherit" });
        execSync(`git commit -m "Actualiza precios automáticos de Amazon [Bot ZimaBlade ${new Date().toLocaleDateString("es-ES")}]"`, { stdio: "inherit" });
        execSync("git push origin main", { stdio: "inherit" });
        console.log("[SUCCESS] Cambios subidos correctamente. Vercel reconstruirá la web automáticamente.");
      } catch (gitErr) {
        console.error("[ERROR] Error al hacer git push:", gitErr.message);
      }
    } else {
      console.log("[DRY-RUN] Modo prueba activo: no se han guardado archivos ni realizado git push.");
    }
  } else {
    console.log("\n[INFO] Todos los productos analizados tienen el precio exacto al día. Ninguna acción requerida.");
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
