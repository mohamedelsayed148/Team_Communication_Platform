BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Notifications] DROP CONSTRAINT [Notifications_taskId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[TaskReminderLogs] DROP CONSTRAINT [TaskReminderLogs_taskId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Tasks] DROP CONSTRAINT [Tasks_teamId_fkey];

-- AddForeignKey
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [Tasks_teamId_fkey] FOREIGN KEY ([teamId]) REFERENCES [dbo].[Teams]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notifications] ADD CONSTRAINT [Notifications_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Tasks]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskReminderLogs] ADD CONSTRAINT [TaskReminderLogs_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Tasks]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
