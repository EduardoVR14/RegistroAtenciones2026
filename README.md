# Registro diario de atenciones — app instalable

App web instalable (PWA) para registrar atenciones diarias desde el celular (iOS o Android) y armar la lista del día para copiarla al HIS. Funciona sin internet una vez instalada; nada de datos de pacientes sale del celular (no hay servidor ni base de datos compartida).

## Publicar en GitHub Pages (una sola vez)

1. Entra a [github.com](https://github.com) e inicia sesión (o crea una cuenta gratis).
2. Clic en **New repository**. Nómbralo, por ejemplo, `registro-atenciones`. Marca **Public**. No agregues README. Clic en **Create repository**.
3. En la página del repo recién creado, clic en **uploading an existing file**.
4. Arrastra ahí **el contenido** de esta carpeta (los archivos `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest` y las carpetas `icons/` y `lib/` — no la carpeta `registro-atenciones-app` en sí, sino lo que hay adentro). Espera a que termine de cargar y clic en **Commit changes**.
5. Ve a **Settings → Pages** (menú de la izquierda).
6. En "Build and deployment", elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`. Clic en **Save**.
7. Espera 1–2 minutos y recarga la página: aparecerá el link, algo como `https://tu-usuario.github.io/registro-atenciones/`.

## Instalar en el celular

Comparte ese link con tus compañeros. Cada quien, desde su propio celular:

- **iPhone (Safari)**: abre el link → botón Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome)**: abre el link → menú (⋮) → **Instalar app** (o "Añadir a pantalla de inicio").

Cada instalación es independiente: lo que cada persona registra se guarda solo en su propio celular. Para consolidar el trabajo del equipo, cada quien comparte su Excel del día (botón "Compartir / descargar Excel") como ya se hacía antes.

## Actualizar la app más adelante

Si en el futuro necesitas cambiar algo, edita los archivos y repite el paso 4 (subir de nuevo los archivos modificados al mismo repositorio) — GitHub Pages se actualiza solo.
