# Alcívar Legal

Sistema web integral para el despacho del Abg. Elvis Alcívar Burgos: sitio público, vitrina multimedia, agenda, WhatsApp, correo SMTP y panel administrativo. Usa PostgreSQL en Supabase; el frontend se publica en Vercel y la API en Render.

## Arquitectura

| Parte | Carpeta | Destino |
| --- | --- | --- |
| Sitio público y ADMIN | `apps/web` | Vercel |
| API, agenda, SMTP, archivos y recordatorios | `apps/api` | Render |
| Datos | Supabase PostgreSQL | Supabase |

Las migraciones `001_initial_schema.sql` y `002_brand_and_feed.sql` ya se aplicaron a la instancia Supabase configurada. Incluyen los datos iniciales del sitio, cuatro servicios, publicaciones de muestra, horarios, usuarios de administración, citas, correo y el campo de logo.

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

### API en Render

1. Sube este proyecto a un repositorio Git privado.
2. En Render, crea un Blueprint usando [render.yaml](render.yaml). El archivo compila la API, ejecuta las migraciones antes de publicar y crea un disco persistente para fotografías y videos.
3. Proporciona en Render:
   - `DATABASE_URL`: cadena de conexión de Supabase.
   - `FRONTEND_URL`: URL final de Vercel, por ejemplo `https://tudominio.vercel.app`.
   - `PUBLIC_API_URL`: URL final de Render, por ejemplo `https://alcivar-legal-api.onrender.com`.
4. El Blueprint genera `JWT_SECRET` y `CONFIG_ENCRYPTION_KEY` de forma segura. No copies los valores locales a un repositorio.

El certificado de Supabase está incluido en `apps/api/certs` y la API lo usa para verificar la conexión de producción.

El administrador existente se conserva en Supabase: no necesitas ejecutar `seed` ni configurar `ADMIN_SEED_PASSWORD` para arrancar la API en Render. En una base nueva, configura temporalmente `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD` y ejecuta `npm run seed`. No añadas parámetros SSL a `DATABASE_URL`: la API configura TLS con el certificado incluido.

### Frontend en Vercel

1. Importa el mismo repositorio en Vercel.
2. Vercel detecta [vercel.json](vercel.json); usa `apps/web/dist` como salida.
3. Añade `VITE_API_URL` con la URL HTTPS de la API publicada en Render, sin barra final.
4. Publica. Luego actualiza `FRONTEND_URL` de Render con la URL de Vercel y vuelve a desplegar la API.

## Operación diaria

En `/admin` puedes:

- Subir el logo (PNG, JPG o WebP) y guardarlo para usarlo en cabecera y pie.
- Crear publicaciones y elegir borrador, publicado o archivado.
- Pegar un enlace exacto de TikTok, Instagram o YouTube; para videos propios usa **Subir foto o video**.
- Configurar el número de WhatsApp, correo, dirección, mapa, redes, agenda y duración de consulta.
- Guardar los datos SMTP y usar **Probar SMTP** antes de activar las notificaciones.

Los recordatorios se ejecutan cada 15 minutos mientras la API esté activa. Para el despliegue en Render Starter, conserva una única instancia de API: así el programador no duplica envíos.

## Calidad y seguridad

Se validaron tipos, compilación de producción y el flujo completo de salud, disponibilidad, creación de cita, URL de WhatsApp y sesión ADMIN con `npm run smoke -w @alcivar/api`.

Las contraseñas de SMTP se cifran antes de guardarse. Los archivos admitidos son PNG, JPG, WebP, MP4, WebM y MOV; se guardan fuera de Git. El formulario tiene validación, límite de solicitudes, consentimiento de privacidad y evita recibir documentos sensibles.

> Importante: la contraseña de PostgreSQL compartida durante la creación debe rotarse desde Supabase antes de la publicación. Después actualiza únicamente `DATABASE_URL` en tus variables privadas locales y en Render.
