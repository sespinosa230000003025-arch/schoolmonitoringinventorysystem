-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'faculty', 'staff');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'admin',
    "status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrower" (
    "id" SERIAL NOT NULL,
    "m_school_id" VARCHAR(50) NOT NULL,
    "m_fname" VARCHAR(50) NOT NULL,
    "m_lname" VARCHAR(50) NOT NULL,
    "m_gender" VARCHAR(10) NOT NULL,
    "m_contact" VARCHAR(20) NOT NULL,
    "m_department" VARCHAR(100) NOT NULL,
    "m_year_section" VARCHAR(50) NOT NULL,
    "m_type" INTEGER NOT NULL,
    "m_password" VARCHAR(255) NOT NULL,
    "m_status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "borrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" SERIAL NOT NULL,
    "i_deviceID" VARCHAR(50) NOT NULL,
    "i_model" VARCHAR(100) NOT NULL,
    "i_category" VARCHAR(50) NOT NULL,
    "i_brand" VARCHAR(50) NOT NULL,
    "i_description" TEXT NOT NULL,
    "i_type" VARCHAR(50) NOT NULL,
    "item_rawstock" INTEGER NOT NULL DEFAULT 1,
    "i_status" INTEGER NOT NULL DEFAULT 1,
    "i_mr" VARCHAR(50) NOT NULL,
    "i_price" DECIMAL(10,2) NOT NULL,
    "i_photo" VARCHAR(255) NOT NULL DEFAULT 'default.jpg',
    "no_of_items" INTEGER,
    "remarks" TEXT,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" SERIAL NOT NULL,
    "r_name" VARCHAR(100) NOT NULL,
    "r_description" TEXT,
    "r_status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "b_date_borrowed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "b_date_returned" TIMESTAMP(3),
    "b_due_date" TIMESTAMP(3) NOT NULL,
    "b_quantity" INTEGER NOT NULL DEFAULT 1,
    "b_status" INTEGER NOT NULL DEFAULT 1,
    "b_purpose" TEXT,
    "b_notes" TEXT,

    CONSTRAINT "borrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" SERIAL NOT NULL,
    "borrow_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "r_date_returned" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "r_quantity" INTEGER NOT NULL DEFAULT 1,
    "r_condition" TEXT,
    "r_notes" TEXT,
    "r_late_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "r_damage_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "borrower_m_school_id_key" ON "borrower"("m_school_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_i_deviceID_key" ON "item"("i_deviceID");

-- CreateIndex
CREATE UNIQUE INDEX "returns_borrow_id_key" ON "returns"("borrow_id");

-- CreateIndex
CREATE INDEX "returns_borrow_id_idx" ON "returns"("borrow_id");

-- CreateIndex
CREATE INDEX "returns_member_id_idx" ON "returns"("member_id");

-- CreateIndex
CREATE INDEX "returns_item_id_idx" ON "returns"("item_id");

-- CreateIndex
CREATE INDEX "returns_r_date_returned_idx" ON "returns"("r_date_returned");

-- AddForeignKey
ALTER TABLE "borrow" ADD CONSTRAINT "borrow_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow" ADD CONSTRAINT "borrow_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow" ADD CONSTRAINT "borrow_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_borrow_id_fkey" FOREIGN KEY ("borrow_id") REFERENCES "borrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "borrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
