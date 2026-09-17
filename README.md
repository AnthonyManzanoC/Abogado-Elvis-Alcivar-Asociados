# Alcívar Legal

Sistema web integral para el despacho del Abg. Elvis Alcívar Burgos: sitio público, vitrina multimedia, agenda, WhatsApp, correo SMTP y panel administrativo. Usa PostgreSQL en Supabase; el frontend se publica en Vercel y la API en Render.

Para publicar de forma segura, sigue la guía paso a paso de [despliegue en Vercel, Render y Supabase](docs/DEPLOYMENT.md). Incluye la configuración de CORS, migraciones, disco persistente y la clave de cifrado sin exponer secretos.

## Arquitectura

| Parte | Carpeta | Destino |
| --- | --- | --- |
| Sitio público y ADMIN | `apps/web` | Vercel |
| API, agenda, SMTP, archivos y recordatorios | `apps/api` | Render |
| Datos | Supabase PostgreSQL | Supabase |

Las migraciones aditivas `001` a `005` crean el sitio, publicaciones, agenda, mapa, portal de seguimiento, comprobantes privados y la cola de correo. El proceso de migración registra cada archivo aplicado y no vuelve a ejecutarlo sobre la misma base.

## Funciones incluidas

- Páginas públicas: inicio, servicios, perfil, vitrina, publicación, contacto, agenda, privacidad y términos.
- Agenda con disponibilidad real, protección contra doble reserva y bloqueos; confirmación por WhatsApp.
- Confirmación por SMTP para cliente y abogado, más recordatorio programado entre 23 y 25 horas antes de la cita.
- Panel ADMIN protegido: agenda, estado de citas, CMS de publicaciones, carga de fotos/video, servicios, logo, contacto, horarios, SMTP, contraseña y contenido de redes.
- Vitrina de carga infinita: videos cargados se reproducen dentro del sitio; YouTube, TikTok e Instagram se cargan dentro de la web solo al pulsar **Reproducir aquí**. Si la plataforma no permite inserción, se abre su publicación original.

## Ejecutar localmente

1. Copia `apps/api/.env.example` como `apps/api/.env` y completa las variables privadas.
2. Copia `apps/web/.env.example` como `apps/web/.env`.
3. Instala dependencias con `npm install`.
4. Aplica estructura y datos iniciales con `npm run migrate` y `npm run seed`.
5. Inicia todo con `npm run dev`.

El sitio local abre en `http://localhost:5173`; la API y la verificación de salud están en `http://localhost:4000/api/health`.

Las credenciales del primer administrador se toman de `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD` en `apps/api/.env`. Después del primer ingreso, cámbialas desde **ADMIN → Configuración → Cambiar contraseña ADMIN**.

## Publicar

La guía de [despliegue seguro](docs/DEPLOYMENT.md) contiene el orden completo y las variables. En resumen: Render recibe `DATABASE_URL`, `FRONTEND_URL`, `PUBLIC_API_URL`, `JWT_SECRET` y una `CONFIG_ENCRYPTION_KEY` estable; Vercel recibe solo `VITE_API_URL`. En Vercel deja **Root Directory vacío**, porque [vercel.json](vercel.json) compila desde la raíz y publica `apps/web/dist`.

El certificado de Supabase está incluido en `apps/api/certs` y la API lo usa para verificar TLS. El administrador existente se conserva en Supabase: no ejecutes `seed` sobre producción. En una base nueva, configura temporalmente `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD` y ejecuta `npm run seed` una sola vez.

## Operación diaria

En `/admin` puedes:

- Subir el logo (PNG, JPG o WebP) y guardarlo para usarlo en cabecera y pie.
- Crear publicaciones y elegir borrador, publicado o archivado.
- Pegar un enlace exacto de TikTok, Instagram o YouTube; para videos propios usa **Subir foto o video**.
- Configurar el número de WhatsApp, correo, dirección, mapa, redes, agenda y duración de consulta.
- Guardar los datos SMTP y usar **Probar SMTP** antes de activar las notificaciones.

### Mapa y contacto configurables

En **ADMIN → Configuración** se puede cambiar el título y la presentación de Contacto, el mensaje inicial de WhatsApp, los canales, la dirección y las indicaciones para llegar a la oficina.

La sección **Mapa del despacho** permite mostrar u ocultar el mapa, elegir carga al pulsar o automática y ver una vista previa antes de guardar. Por defecto busca la dirección pública. Para señalar el lugar exacto, pega la URL o el HTML de **Google Maps → Compartir → Insertar un mapa → Copiar HTML**. El sistema extrae únicamente la URL HTTPS de Google; nunca ejecuta el HTML pegado. Los enlaces cortos se admiten en el campo de enlace externo, no como iframe. [Instrucciones oficiales de Google](https://support.google.com/maps/answer/7101463?co=GENIE.Platform%3DDesktop&hl=es).

Verifica en la vista previa el marcador y la ruta. **Dirección o coordenadas para el mapa** determina el destino de **Cómo llegar**; si está vacío se utiliza la dirección pública. Un mapa basado solo en una dirección es una referencia, no una verificación del negocio. No se necesita una clave para los [enlaces de búsqueda e indicaciones](https://developers.google.com/maps/documentation/urls/get-started).

La migración aditiva `003_contact_map.sql` incorpora estos campos sin reemplazar contenido ni contraseñas. Configuración y horarios ahora se guardan en una sola transacción; si falla una parte se revierte todo. Se conservan los turnos partidos existentes. Dejar la contraseña SMTP vacía mantiene la anterior. El sitio actualiza sus datos al volver a la pestaña, y mantiene la última configuración cargada ante un fallo temporal de conexión.

Pruebas de esta mejora: `npm test` (validación, enlaces y renderizado del mapa), `npm run typecheck` y `npm run build`. Para comprobar la integración real, desde `apps/api` ejecuta `node --import tsx ../../tests/contact-integration.mjs`: usa la base configurada, realiza todas sus escrituras dentro de una transacción que revierte al finalizar y no envía correos ni crea citas. Esta prueba incluye un error de guardado simulado deliberadamente para verificar la reversión.

Los recordatorios se ejecutan cada 15 minutos mientras la API esté activa. Para el despliegue en Render Starter, conserva una única instancia de API: así el programador no duplica envíos.

## Calidad y seguridad

Se validaron tipos, compilación de producción y el flujo completo de salud, disponibilidad, creación de cita, URL de WhatsApp y sesión ADMIN con `npm run smoke -w @alcivar/api`.

Las contraseñas de SMTP se cifran antes de guardarse. Los archivos admitidos son PNG, JPG, WebP, MP4, WebM y MOV; se guardan fuera de Git. El formulario tiene validación, límite de solicitudes, consentimiento de privacidad y evita recibir documentos sensibles.

> Importante: la contraseña de PostgreSQL compartida durante la creación debe rotarse desde Supabase antes de la publicación. Después actualiza únicamente `DATABASE_URL` en tus variables privadas locales y en Render.
