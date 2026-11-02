BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Notifications] DROP CONSTRAINT [Notifications_taskId_fkey];

-- AddForeignKey
ALTER TABLE [dbo].[Notifications] ADD CONSTRAINT [Notifications_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Tasks]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
