-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `phone_number` VARCHAR(32) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_phone_number_key`(`phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_challenges` (
    `id` CHAR(36) NOT NULL,
    `phone_number` VARCHAR(32) NOT NULL,
    `otp_hash` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_challenges_phone_number_created_at_idx`(`phone_number`, `created_at`),
    INDEX `otp_challenges_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `friend_name` VARCHAR(160) NOT NULL,
    `friend_phone` VARCHAR(32) NULL,
    `original_amount` DECIMAL(13, 2) NOT NULL,
    `loan_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `loans_user_id_due_date_idx`(`user_id`, `due_date`),
    INDEX `loans_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `loans_user_id_friend_name_idx`(`user_id`, `friend_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `loans` ADD CONSTRAINT `loans_original_amount_positive` CHECK (`original_amount` > 0);
ALTER TABLE `loans` ADD CONSTRAINT `loans_due_date_not_before_loan_date` CHECK (`due_date` >= `loan_date`);

-- CreateTable
CREATE TABLE `repayments` (
    `id` CHAR(36) NOT NULL,
    `loan_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(13, 2) NOT NULL,
    `repayment_date` DATE NOT NULL,
    `note` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `repayments_loan_id_repayment_date_created_at_idx`(`loan_id`, `repayment_date`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `repayments` ADD CONSTRAINT `repayments_amount_positive` CHECK (`amount` > 0);

-- CreateTable
CREATE TABLE `receipts` (
    `id` CHAR(36) NOT NULL,
    `loan_id` CHAR(36) NOT NULL,
    `storage_key` VARCHAR(512) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(100) NOT NULL,
    `size_bytes` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receipts_loan_id_idx`(`loan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repayments` ADD CONSTRAINT `repayments_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

