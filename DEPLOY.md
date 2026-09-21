# Cómo publicar esta web (guía para no-técnicos)

Esta guía asume que no has usado Git ni GitHub antes. Sigue los pasos en orden, uno detrás de otro,
sin saltarte ninguno. Cuando dice "terminal" nos referimos a la ventana negra de comandos que usas
para ejecutar `npm run dev` — la misma que has usado hasta ahora.

Solo necesitas hacer esto **una vez**. A partir de ahí, cada vez que cambies algo (por ejemplo, un
enlace de afiliado en `src/data/products.json`), solo tendrás que repetir el **Paso 4** y la web se
actualizará sola en 1-2 minutos.

---

## Paso 0 — Requisitos previos

- Una cuenta gratuita en [github.com](https://github.com) (si no tienes, créala primero).
- Una cuenta gratuita en [vercel.com](https://vercel.com) (puedes crearla usando tu cuenta de GitHub, es un clic).
- Tener [Git](https://git-scm.com/downloads) instalado en tu ordenador. Para comprobarlo, escribe en la terminal:

```bash
git --version
```

Si te devuelve un número de versión (ej. `git version 2.43.0`), ya lo tienes. Si da error, instálalo
desde el enlace de arriba y reinicia la terminal.

---

## Paso 1 — Inicializar el repositorio en tu ordenador

Abre la terminal **dentro de la carpeta del proyecto** (`WEBErgonimica`) y ejecuta estos comandos
uno por uno, esperando a que termine cada uno antes de escribir el siguiente:

```bash
git init
```

Esto convierte la carpeta en un repositorio Git (solo se hace una vez en la vida del proyecto).

```bash
git add .
```

Esto "selecciona" todos los archivos del proyecto para subirlos.

```bash
git commit -m "Primera versión de la web"
```

Esto guarda esa selección como el primer "punto de guardado" del proyecto.

> Si `git commit` te pide un nombre y un email, es la primera vez que usas Git en este ordenador.
> Ejecuta estas dos líneas (con tus datos reales) y vuelve a intentar el `commit`:
> ```bash
> git config --global user.name "Tu Nombre"
> git config --global user.email "tu@email.com"
> ```

---

## Paso 2 — Subir el código a GitHub

1. Ve a [github.com/new](https://github.com/new) en tu navegador.
2. Ponle un nombre al repositorio, por ejemplo `webergonimica`.
3. **NO marques** ninguna casilla de "Add a README" ni ".gitignore" — el proyecto ya los tiene.
4. Haz clic en **"Create repository"**.
5. GitHub te mostrará una página con unos comandos bajo el título *"…or push an existing repository
   from the command line"*. Se ven así (con tu usuario en vez de `TU-USUARIO`):

```bash
git remote add origin https://github.com/TU-USUARIO/webergonimica.git
git branch -M main
git push -u origin main
```

Copia esos 3 comandos **exactamente como te los da GitHub** (tu URL será distinta a la de este
ejemplo) y pégalos en la terminal, uno por uno.

La primera vez que hagas `git push`, es posible que se abra una ventana del navegador pidiéndote
iniciar sesión en GitHub para autorizar tu terminal — acepta.

Cuando termine, recarga la página de tu repositorio en GitHub: deberías ver todos los archivos del
proyecto (`src`, `public`, `package.json`, etc.) ya subidos.

---

## Paso 3 — Conectar el repositorio a Vercel

1. Ve a [vercel.com/new](https://vercel.com/new) e inicia sesión (con tu cuenta de GitHub, es lo más
   rápido).
2. Verás una lista de tus repositorios de GitHub. Busca `webergonimica` y haz clic en **"Import"**.
3. Vercel detecta automáticamente que es un proyecto **Astro** — no toques nada en la configuración,
   déjalo todo como viene por defecto.
4. Haz clic en **"Deploy"**.
5. Espera 1-2 minutos. Cuando termine, Vercel te da una URL pública tipo
   `https://webergonimica.vercel.app` — esa es tu web, ya en vivo.

A partir de aquí, Vercel queda **conectado permanentemente** a ese repositorio de GitHub.

---

## Paso 4 — Cómo actualizar la web a partir de ahora

Cada vez que cambies algo en el proyecto (por ejemplo, edites un enlace de afiliado en
`src/data/products.json`, o me pidas que te añada una review nueva), para que el cambio se vea en
la web pública solo tienes que repetir estos 3 comandos en la terminal:

```bash
git add .
git commit -m "Actualizo enlaces de afiliado"
git push
```

(Puedes cambiar el texto entre comillas por una descripción corta de lo que has cambiado — es solo
una nota para ti mismo, no afecta a nada.)

En cuanto hagas `git push`, Vercel se entera automáticamente, reconstruye la web con los cambios y
la publica sola en 1-2 minutos, sin que tengas que volver a entrar a Vercel ni tocar nada allí.

---

## Cómo editar tus enlaces de afiliado (el día a día)

No necesitas tocar ningún componente ni archivo `.astro`. Todos los productos y enlaces de Amazon
viven en un único archivo:

```
src/data/products.json
```

Ábrelo con cualquier editor de texto (o pídeme que lo edite yo). Cada producto es un bloque como
este — el único campo que sueles necesitar cambiar es `amazon_affiliate_link`:

```json
{
  "id": "sihoo-m18",
  "nombre": "SIHOO M18",
  "precio_aproximado": "179,99 €",
  "amazon_affiliate_link": "https://www.amazon.es/dp/B07GNDDNMW?tag=TU-TAG-21",
  ...
}
```

1. Entra a la ficha del producto en Amazon.
2. Usa la barra de SiteStripe (aparece arriba si tienes activado el programa de afiliados) para
   generar tu enlace corto.
3. Pega ese enlace como valor de `"amazon_affiliate_link"`, sustituyendo el que hay.
4. Guarda el archivo.
5. Repite el **Paso 4** de esta guía (`git add .`, `git commit`, `git push`).

Ese cambio se propaga automáticamente a **todos los sitios donde aparece ese producto**: su página
de review, la tabla comparativa de la categoría, y la barra flotante móvil — porque todos leen del
mismo archivo, no tienes que buscar y cambiar el enlace en varios sitios.
