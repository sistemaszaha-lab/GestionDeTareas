-- Update roles to match new ADMIN/USER naming.
ALTER TYPE "UserRole" RENAME VALUE 'EMPLOYEE' TO 'USER';

-- Rename password column to reflect hashed storage.
ALTER TABLE "User" RENAME COLUMN "passwordHash" TO "password";

-- New user fields.
ALTER TABLE "User"
ADD COLUMN     "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "lastName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '';

-- Backfill email for existing users, then enforce constraints.
UPDATE "User"
SET "email" = COALESCE(NULLIF("email", ''), lower("username") || '@local')
WHERE "email" IS NULL OR "email" = '';

ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- Ensure password isn't NULL for existing seeded users that had passwordHash.
-- (passwordHash -> password rename already copied the data).

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
