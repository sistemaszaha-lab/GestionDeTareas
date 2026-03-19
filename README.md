# Gestión de tareas (herramienta interna)

Proyecto interno para una sola empresa (máx. ~20 usuarios). Next.js (App Router) + TypeScript + Prisma + PostgreSQL + Tailwind.

## Requisitos

- Node.js 20+ (recomendado)
- PostgreSQL (Railway o local)

## Variables de entorno

Crea un archivo `.env` en la raíz:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"
JWT_SECRET="cambia-esto-por-un-secreto-largo"

# NextAuth (Google OAuth)
AUTH_SECRET="cambia-esto-por-un-secreto-largo"
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"

# Opcional (recomendado en producción)
NEXTAUTH_URL="http://localhost:3000"
```

Notas:
- `AUTH_SECRET` es el secreto que usa la configuración de NextAuth en `auth.ts`.
- `JWT_SECRET` es el secreto del login actual por email/contraseña (cookie `auth_token`).

Opcional para seed:

```bash
SEED_ADMIN_EMAIL="admin@empresa.local"
SEED_ADMIN_PASSWORD="Admin12345!"
```

## Instalación y ejecución

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Abre `http://localhost:3000`.

## Uso

- No hay registro público: crea usuarios en la DB (o usa `prisma:seed`).
- Roles:
  - `ADMIN`: crear/editar/eliminar tareas, reasignar.
  - `EMPLOYEE`: ver tareas, mover estado si está asignado, comentar.

## Google OAuth (NextAuth)

1) En Google Cloud Console crea credenciales OAuth (tipo: Web application).
2) Agrega estas URLs autorizadas:
   - Origin: `http://localhost:3000`
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`
3) Configura `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
4) Ejecuta las migraciones de Prisma (ver arriba) para crear las tablas `Account`/`Session` y campos nuevos en `User`.

Importante: el proveedor está configurado para enlazar cuentas por email; si ya existe un usuario en la DB con el mismo email, podrá iniciar sesión con Google.
