# Publicación segura: Vercel + Render + Supabase

Esta guía publica el frontend en Vercel, la API en Render y conserva Supabase PostgreSQL como la única base de datos. No copies credenciales en este archivo, en Git, ni en variables `VITE_*`.

## Antes de publicar

1. Rota cualquier contraseña o clave que haya sido compartida por chat o captura de pantalla.
2. Confirma que la base correcta de Supabase contiene las migraciones `001` a `005`. Render ejecuta `npm run migrate -w @alcivar/api` antes de cada despliegue y las migraciones ya aplicadas se omiten de forma segura.
3. Conserva una copia segura y privada de `CONFIG_ENCRYPTION_KEY`. Esta clave cifra la configuración de Brevo/SMTP y los enlaces privados de seguimiento que se guardan en PostgreSQL. **Todos los servidores que usen esta misma base deben usar exactamente la misma clave.** No la regeneres después de guardar configuración cifrada.
4. Usa una sola instancia de la API mientras se usan los recordatorios de correo y el disco de archivos. El disco de Render no se comparte entre instancias.

## 1. API en Render

En Render crea el servicio desde el Blueprint [render.yaml](../render.yaml), conectado al repositorio. El archivo ya configura:

- compilación de `apps/api`;
- migraciones antes del despliegue;
- inicio con `npm run start -w @alcivar/api`;
- comprobación de salud en `/api/health`;
- disco persistente en `/var/data` para los archivos públicos cargados desde ADMIN.

> **Revisión necesaria antes del primer deploy:** `apps/api` usa `typescript` y `tsx` para compilar y ejecutar las migraciones, y ambos están en `devDependencies`. Con `NODE_ENV=production`, npm puede omitirlas si el comando sigue siendo solo `npm install`. Verifica en el log que se instalen o usa un comando de build que incluya dependencias de desarrollo, por ejemplo `npm ci --include=dev && npm run build -w @alcivar/api`. Sin ello, la compilación o el predeploy de migraciones puede fallar.

Completa estas variables privadas en Render:

| Variable | Uso | Regla |
| --- | --- | --- |
| `DATABASE_URL` | Cadena PostgreSQL de Supabase | Usa la cadena de conexión de la base objetivo; codifica caracteres especiales de la contraseña dentro de la URL. No añadas parámetros SSL manuales. |
| `DATABASE_CA_CERT` | Certificado TLS de Supabase | Déjala como `certs/supabase-root-2021.crt`, ruta incluida dentro de `apps/api`. |
| `FRONTEND_URL` | Orígenes permitidos por CORS | URL HTTPS exacta de Vercel. Para más de un dominio autorizado, sepáralos por coma; no uses comodines. |
| `PUBLIC_API_URL` | URL pública de Render | URL HTTPS final de la API, sin barra final. |
| `JWT_SECRET` | Sesiones ADMIN | Secreto aleatorio de al menos 32 caracteres. Manténlo privado. |
| `CONFIG_ENCRYPTION_KEY` | Cifrado de datos configurados en ADMIN | Clave estable de 32 bytes: 64 caracteres hexadecimales o base64 válido. No la cambies sin migrar los datos cifrados. |
| `UPLOADS_DIR` | Archivos de publicaciones | Usa `/var/data/uploads`, que coincide con el disco del Blueprint. |
| `NODE_ENV` | Modo de ejecución | `production`. |
| `NODE_VERSION` | Runtime de Render | `22`; el Blueprint ya lo define. |

Render inyecta `PORT`; no hace falta crearla. `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD` solo se necesitan para inicializar una base totalmente nueva con `npm run seed`; no ejecutes el seed sobre la base de producción ya usada.

Para cargar el catálogo curado de casos sociales una sola vez, desde la raíz del repositorio ejecuta `npm run catalog:cases:apply -w @alcivar/api`. El comando únicamente inserta los enlaces oficiales que todavía no existan; no reemplaza publicaciones modificadas en ADMIN.

Después del primer despliegue, abre:

```
https://TU-API-RENDER/api/health
```

Debe responder con `ok: true` y `database: connected`.

### Brevo y SMTP

Las credenciales de Brevo o SMTP no se ponen en Render ni en Vercel. Se guardan cifradas desde **ADMIN → Experiencia y notificaciones**. Antes de guardar una clave de Brevo, verifica que `CONFIG_ENCRYPTION_KEY` ya es la clave definitiva de Render; de lo contrario Render no podrá descifrarla.

Usa el botón de prueba solo con un remitente validado en Brevo. Una aceptación de la API confirma que Brevo recibió la solicitud, no que el destinatario la haya abierto.

## 2. Frontend en Vercel

1. Importa el mismo repositorio en Vercel.
2. En **Settings → Build and Deployment**, deja **Root Directory vacío**. El archivo [vercel.json](../vercel.json) ya ejecuta la compilación desde la raíz y publica `apps/web/dist`.
3. No actives overrides para el comando de build ni para Output Directory salvo que reproduzcas exactamente estos valores:

   | Ajuste | Valor |
   | --- | --- |
   | Build Command | `npm run build -w @alcivar/web` |
   | Output Directory | `apps/web/dist` |

4. Crea la variable de entorno de **Production** `VITE_API_URL` con la URL HTTPS pública de Render, sin barra final.
5. Despliega y verifica que las rutas `/`, `/servicios`, `/vitrina`, `/contacto`, `/consultar`, `/seguimiento` y `/admin` carguen tras refrescar la página. Las reglas SPA de `vercel.json` ya redirigen esas rutas a Vite.

`VITE_API_URL` es visible en el navegador. Nunca uses ese prefijo para secretos, claves de Brevo, PostgreSQL, JWT o SMTP.

## 3. Cierre de la conexión entre ambos

1. Copia la URL final de producción de Vercel (incluido el dominio propio si se usa) en `FRONTEND_URL` de Render.
2. Si se autorizan dos dominios, escribe ambas URLs exactas separadas por coma, por ejemplo el dominio canónico y su variante `www`.
3. Guarda las variables y vuelve a desplegar la API de Render.
4. Prueba desde Vercel una lectura pública, una solicitud de consulta y el acceso ADMIN. Si el navegador muestra `Origen no permitido`, compara literalmente el origen del navegador con `FRONTEND_URL`: protocolo, dominio y sin ruta.

Los deployments de preview de Vercel no quedan autorizados automáticamente por seguridad. Para probar formularios contra la API de producción, añade temporalmente la URL exacta del preview a `FRONTEND_URL` y elimínala cuando termines. No uses `*`.

## Lista de verificación de producción

- [ ] `/api/health` responde con la base conectada.
- [ ] Vercel compila desde la raíz y encuentra `apps/web/dist`.
- [ ] `VITE_API_URL` apunta a Render por HTTPS.
- [ ] `FRONTEND_URL` coincide con el dominio público real de Vercel.
- [ ] `CONFIG_ENCRYPTION_KEY` es estable y está respaldada fuera de Git.
- [ ] Se ejecutó una prueba de Brevo/SMTP con un remitente autorizado.
- [ ] Las citas virtuales siguen en modo de prueba hasta que ADMIN tenga datos reales de cobro.
- [ ] Se revisó el backup de Supabase y el contenido de `/var/data/uploads`.

## Problemas conocidos y cómo evitarlos

| Síntoma | Causa más probable | Solución |
| --- | --- | --- |
| Vercel indica que no encuentra `dist` | Se configuró `apps/web` como Root Directory y el `vercel.json` ya añade esa ruta | Deja Root Directory vacío y vuelve a desplegar. |
| La web publica pero las consultas fallan | `VITE_API_URL` falta, apunta a localhost o CORS no reconoce Vercel | Corrige `VITE_API_URL` y `FRONTEND_URL`, luego redepliega la API. |
| Render no puede leer Brevo/SMTP | Se cambió `CONFIG_ENCRYPTION_KEY` después de guardar datos cifrados | Restaura la clave original desde el almacén seguro; no expongas ni copies la clave a Git. |
| Fotos antiguas dan 404 | No se conservó el disco `/var/data` o se usaron varias instancias | Mantén el disco persistente y una instancia; respalda los archivos de publicaciones. |
| No llegan recordatorios | La API está detenida, el remitente no está verificado o el proveedor rechaza el envío | Comprueba salud, cola de correo y remitente autorizado desde ADMIN. |
