ALTER TABLE "Task" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "deletedById" TEXT;

CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");
CREATE INDEX "Task_deletedById_idx" ON "Task"("deletedById");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
