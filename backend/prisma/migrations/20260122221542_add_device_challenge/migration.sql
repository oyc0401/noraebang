-- CreateTable
CREATE TABLE "device_challenge" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "device_id" TEXT NOT NULL,
    "nonce_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "device_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_challenge_device_id_used_at_idx" ON "device_challenge"("device_id", "used_at");

-- CreateIndex
CREATE INDEX "device_challenge_device_id_expires_at_idx" ON "device_challenge"("device_id", "expires_at");

-- AddForeignKey
ALTER TABLE "device_challenge" ADD CONSTRAINT "device_challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
