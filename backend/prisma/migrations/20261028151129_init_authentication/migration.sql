BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [firstName] NVARCHAR(100) NOT NULL,
    [lastName] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Users_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    [description] NVARCHAR(255),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[UserRoles] (
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [UserRoles_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserRoles_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- AddForeignKey
ALTER TABLE [dbo].[UserRoles] ADD CONSTRAINT [UserRoles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserRoles] ADD CONSTRAINT [UserRoles_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
