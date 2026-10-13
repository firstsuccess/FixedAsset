-- Run manually in SSMS, connected to the intended SQL Server as an authorized administrator.
-- Does not alter accounting. For another database name, edit this dedicated script before executing.
USE [master];
IF DB_ID(N'fixed-asset') IS NULL
    EXEC(N'CREATE DATABASE [fixed-asset]');
