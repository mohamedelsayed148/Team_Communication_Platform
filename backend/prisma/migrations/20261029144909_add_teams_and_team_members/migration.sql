BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Teams] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(500),
    [createdById] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Teams_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Teams_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Teams_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[TeamMembers] (
    [teamId] UNIQUEIDENTIFIER NOT NULL,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [TeamMembers_role_df] DEFAULT 'MEMBER',
    [joinedAt] DATETIME2 NOT NULL CONSTRAINT [TeamMembers_joinedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TeamMembers_pkey] PRIMARY KEY CLUSTERED ([teamId],[userId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TeamMembers_userId_idx] ON [dbo].[TeamMembers]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[Teams] ADD CONSTRAINT [Teams_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TeamMembers] ADD CONSTRAINT [TeamMembers_teamId_fkey] FOREIGN KEY ([teamId]) REFERENCES [dbo].[Teams]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TeamMembers] ADD CONSTRAINT [TeamMembers_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
