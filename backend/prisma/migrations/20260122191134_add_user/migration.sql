-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT,
    "email" TEXT,
    "password" TEXT,
    "refresh_token" TEXT,
    "last_login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_device_id_key" ON "user"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
