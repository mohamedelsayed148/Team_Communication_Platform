BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[TaskReminderLogs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [taskId] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(50) NOT NULL,
    [dueDate] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskReminderLogs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TaskReminderLogs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TaskReminderLogs_taskId_userId_type_dueDate_key] UNIQUE NONCLUSTERED ([taskId],[userId],[type],[dueDate])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskReminderLogs_taskId_idx] ON [dbo].[TaskReminderLogs]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskReminderLogs_userId_idx] ON [dbo].[TaskReminderLogs]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[TaskReminderLogs] ADD CONSTRAINT [TaskReminderLogs_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskReminderLogs] ADD CONSTRAINT [TaskReminderLogs_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
