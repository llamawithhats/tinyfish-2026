ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "passwordHash" TEXT;

UPDATE "User"
SET "username" = LOWER(COALESCE(NULLIF("name", ''), SPLIT_PART(COALESCE("email", ''), '@', 1), id))
WHERE "username" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
