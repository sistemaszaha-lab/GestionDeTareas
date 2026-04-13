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

# NextAuth/Auth.js (usado por middleware y logout)
AUTH_SECRET="cambia-esto-por-un-secreto-largo"

# Opcional (recomendado en producción)
NEXTAUTH_URL="http://localhost:3000"

# Login con Google (opcional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
# Restringe el acceso por dominio corporativo
ALLOWED_GOOGLE_DOMAIN="comerciointeligentebc.com"
```

Notas:
- `JWT_SECRET` es el secreto del login por username/contraseña (cookie `auth_token`).
- `AUTH_SECRET` es el secreto usado por `next-auth/jwt` y la ruta `/api/auth/[...nextauth]`.

Login con Google:
- Solo se permite el dominio configurado en `ALLOWED_GOOGLE_DOMAIN` (por defecto `comerciointeligentebc.com`).
- Si un usuario inicia sesion por primera vez con Google y el dominio es valido, se crea automaticamente en la base de datos.

Opcional para seed:

```bash
SEED_ADMIN_USERNAME="admin"
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
  - `USER`: ver tareas, mover estado si está asignado, comentar.
