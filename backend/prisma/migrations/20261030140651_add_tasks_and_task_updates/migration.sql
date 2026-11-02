BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Tasks] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(max),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Tasks_status_df] DEFAULT 'TODO',
    [priority] NVARCHAR(20) NOT NULL CONSTRAINT [Tasks_priority_df] DEFAULT 'MEDIUM',
    [dueDate] DATETIME2,
    [teamId] UNIQUEIDENTIFIER NOT NULL,
    [createdById] UNIQUEIDENTIFIER NOT NULL,
    [assignedToId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Tasks_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Tasks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TaskUpdates] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [taskId] UNIQUEIDENTIFIER NOT NULL,
    [authorId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TaskUpdates_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TaskUpdates_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tasks_teamId_idx] ON [dbo].[Tasks]([teamId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tasks_assignedToId_idx] ON [dbo].[Tasks]([assignedToId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tasks_createdById_idx] ON [dbo].[Tasks]([createdById]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tasks_status_idx] ON [dbo].[Tasks]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Tasks_dueDate_idx] ON [dbo].[Tasks]([dueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskUpdates_taskId_createdAt_idx] ON [dbo].[TaskUpdates]([taskId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TaskUpdates_authorId_idx] ON [dbo].[TaskUpdates]([authorId]);

-- AddForeignKey
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [Tasks_teamId_fkey] FOREIGN KEY ([teamId]) REFERENCES [dbo].[Teams]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [Tasks_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Tasks] ADD CONSTRAINT [Tasks_assignedToId_fkey] FOREIGN KEY ([assignedToId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskUpdates] ADD CONSTRAINT [TaskUpdates_taskId_fkey] FOREIGN KEY ([taskId]) REFERENCES [dbo].[Tasks]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TaskUpdates] ADD CONSTRAINT [TaskUpdates_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
