-- This is an operator-run native backup example. The destination is on the SQL Server host.
DECLARE @db sysname=N'fixed-asset';
DECLARE @file nvarchar(4000)=N'C:\SqlBackups\fixed-asset.bak';
IF LOWER(@db)=N'accounting' THROW 51000,'accounting is forbidden',1;
BACKUP DATABASE @db TO DISK=@file WITH COPY_ONLY,CHECKSUM;
RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM;
-- Native RESTORE is an offline DBA operation. Examine FILELISTONLY and target logical files first.
-- Do not use WITH REPLACE or single-user mode against accounting.
