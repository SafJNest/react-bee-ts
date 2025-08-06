-- CreateTable
CREATE TABLE `SpotifyToken` (
    `accessToken` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `discordId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SpotifyToken_discordId_key`(`discordId`),
    PRIMARY KEY (`accessToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
