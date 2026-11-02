BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Notifications] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [taskId] UNIQUEIDENTIFIER,
    [type] NVARCHAR(50) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [message] NVARCHAR(max) NOT NULL,
    [isRead] BIT NOT NULL CONSTRAINT [Notifications_isRead_df] DEFAULT 0,
    [readAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[EmailOutbox] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [toEmail] NVARCHAR(255) NOT NULL,
    [subject] NVARCHAR(255) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [EmailOutbox_status_df] DEFAULT 'PENDING',
    [attempts] INT NOT NULL CONSTRAINT [EmailOutbox_attempts_df] DEFAULT 0,
    [lastError] NVARCHAR(max),
    [sentAt] DATETIME2,
    [nextRetryAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailOutbox_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EmailOutbox_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notifications_userId_isRead_createdAt_idx] ON [dbo].[Notifications]([userId], [isRead], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notifications_taskId_idx] ON [dbo].[Notifications]([taskId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailOutbox_status_nextRetryAt_idx] ON [dbo].[EmailOutbox]([status], [nextRetryAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailOutbox_userId_idx] ON [dbo].[EmailOutbox]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[Notifications] ADD CONSTRAINT [Notifications_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notifications] ADD CONSTRAINT [Notifications_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Tasks]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[EmailOutbox] ADD CONSTRAINT [EmailOutbox_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
