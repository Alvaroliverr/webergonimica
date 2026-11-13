# Guía de Instalación del Bot de Precios en ZimaBlade

Este bot rastrea los precios de tus productos en Amazon.es, detecta automáticamente ofertas y descuentos, actualiza `src/data/products.json` y hace un `git push origin main` para que **Vercel reconstruya tu web automáticamente en 30 segundos**.

---

## 🚀 Cómo funciona el circuito

```
[ ZimaBlade corriendo 24/7 en casa ]
           │
           ▼ (Cada 6 o 12 horas vía Cron)
1. Ejecuta scripts/actualizador-precios-bot.mjs
2. Consulta los ASINs en Amazon.es
3. Si detecta una bajada de precio:
   - Marca "en_oferta: true"
   - Guarda "precio_anterior" (tachado)
   - Actualiza el precio con el nuevo descuento
4. Hace "git commit" y "git push origin main"
           │
           ▼
[ GitHub ] ──(Webhook automático)──► [ Vercel ]
                                          │
                                          ▼
                         Web actualizada en todo el mundo
```

---

## 🛠️ Instalación en ZimaBlade (CasaOS / Linux)

### Paso 1: Conectarte por SSH a tu ZimaBlade
Abre la terminal en tu ordenador y conéctate:
```bash
ssh usuario@ip-de-tu-zimablade
```

### Paso 2: Clonar el repositorio
Asegúrate de tener instalado Git y Node.js (v18 o superior):
```bash
sudo apt update && sudo apt install -y git nodejs npm
```

Clona el repositorio en una carpeta de tu usuario:
```bash
git clone git@github.com:Alvaroliverr/webergonimica.git
cd webergonimica
```

### Paso 3: Configurar autenticación para `git push` desatendido
Para que el bot pueda hacer `git push` automáticamente sin pedirte usuario ni contraseña:

1. Genera una clave SSH en tu ZimaBlade si no tienes una:
   ```bash
   ssh-keygen -t ed25519 -C "bot-zimablade@eldeskops.com"
   ```
   *(Pulsa Enter a todo para dejar la contraseña en blanco).*

2. Muestra tu clave pública:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. Ve a tu repositorio en GitHub:
   * **Settings** > **Deploy keys** > **Add deploy key**.
   * Pega la clave, ponle de título `ZimaBlade Bot` y **marca la casilla "Allow write access"** (fundamental para que pueda hacer push).

4. Comprueba que funciona:
   ```bash
   ssh -T git@github.com
   # Debe responder: Hi Alvaroliverr/webergonimica! You've successfully authenticated...
   ```

5. Configura tu identidad de git en esa carpeta:
   ```bash
   git config user.name "ZimaBlade Price Bot"
   git config user.email "bot@eldeskops.com"
   ```

---

### Paso 4: Probar el bot manualmente
Ejecuta una prueba en seco (sin subir nada a git):
```bash
node scripts/actualizador-precios-bot.mjs --dry-run
```
Verás cómo va consultando los ASINs y comparando los precios.

---

### Paso 5: Programar la ejecución automática (Cron)

Edita el crontab de tu ZimaBlade:
```bash
crontab -e
```

Añade la siguiente línea al final para que se ejecute **2 veces al día** (por ejemplo, a las 08:00 y a las 20:00):
```cron
0 8,20 * * * cd /home/usuario/webergonimica && git pull origin main && node scripts/actualizador-precios-bot.mjs >> /home/usuario/bot-precios.log 2>&1
```
*(Sustituye `/home/usuario/` por tu ruta real).*

---

## 💡 Ventajas de esta arquitectura
* **Coste 0 €:** Tu ZimaBlade consume apenas unos vatios y está encendido todo el día.
* **Máximo SEO:** Los precios de oferta quedan grabados directamente en el HTML estático de Astro y en el Schema.org (`offers.price`), permitiendo que Google muestre insignias de oferta en los resultados de búsqueda.
* **Seguridad:** No expones tu servidor a internet ni abres puertos: es el ZimaBlade el que sale hacia fuera a consultar y empuja a GitHub.
