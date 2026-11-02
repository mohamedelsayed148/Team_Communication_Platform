BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[RefreshTokens] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [tokenHash] NVARCHAR(64) NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshTokens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RefreshTokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshTokens_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshTokens_userId_idx] ON [dbo].[RefreshTokens]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshTokens] ADD CONSTRAINT [RefreshTokens_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
