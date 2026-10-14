#define SourceRoot "C:\fixed-asset"
#define AppName "もんじゃ固定資産管理"
#define AppVersion "1.0.0"

[Setup]
AppId={{4C87A98A-3F5A-4F70-A1E1-0A51E67F2E16}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=First Success
DefaultDirName={autopf}\MonjaFixedAsset
DefaultGroupName={#AppName}
OutputDir={#SourceRoot}\installer\output
OutputBaseFilename=MonjaFixedAssetSetup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName={#AppName}
SetupLogging=yes

[Files]
; Pre-build with `npm run build`. Only production output and runtime dependencies are deployed.
Source: "{#SourceRoot}\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\node_modules\*"; DestDir: "{app}\node_modules"; Excludes: "*.log,*.bak,*.bak.*,*.sqlite,*.sqlite3,*.env,*.env.*,npm-debug.log*"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\runtime\node.exe"; DestDir: "{app}\runtime"; Flags: ignoreversion
Source: "{#SourceRoot}\service\MonjaFixedAsset.exe"; DestDir: "{app}\service"; Flags: ignoreversion
Source: "{#SourceRoot}\service\MonjaFixedAsset.xml"; DestDir: "{app}\service"; Flags: ignoreversion
Source: "{#SourceRoot}\package.json"; DestDir: "{app}"; Flags: ignoreversion
; End-user configuration template (never package the actual .env)
Source: "{#SourceRoot}\.env.sample"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist

; Documentation and application license
Source: "{#SourceRoot}\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\readme.docx"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\機能一覧.xlsx"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceRoot}\LICENSE"; DestDir: "{app}"; Flags: ignoreversion

; SQL and IIS resources are copied, NOT executed/configured by Setup
Source: "{#SourceRoot}\sql\*"; DestDir: "{app}\sql"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\iis\*"; DestDir: "{app}\iis"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#SourceRoot}\installer\service-maintenance.ps1"; DestDir: "{app}\installer"; Flags: ignoreversion
Source: "{#SourceRoot}\installer\licenses\*"; DestDir: "{app}\licenses"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

[Code]
function RunMaintenance(const Action: String; const InstallDir: String): Boolean;
var
  ResultCode: Integer;
  Params: String;
begin
  Params := '-NoProfile -ExecutionPolicy Bypass -File "' + InstallDir +
    '\installer\service-maintenance.ps1" -Action ' + Action +
    ' -AppDir "' + InstallDir + '"';
  Result := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  Params: String;
begin
  Result := '';
  { On an upgrade, stop the old service BEFORE files are replaced.
    The helper must already exist on the destination for prior installations. }
  if FileExists(ExpandConstant('{app}\installer\service-maintenance.ps1')) then
  begin
    Params := '-NoProfile -ExecutionPolicy Bypass -File "' +
      ExpandConstant('{app}\installer\service-maintenance.ps1') +
      '" -Action preinstall -AppDir "' + ExpandConstant('{app}') + '"';
    if (not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode)) or (ResultCode <> 0) then
      Result := 'Windowsサービスを停止できませんでした。インストールを中止します。';
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    if not RunMaintenance('postinstall', ExpandConstant('{app}')) then
      MsgBox('サービス登録に失敗しました。インストールログとイベントログを確認してください。', mbError, MB_OK);
end;

function InitializeUninstall(): Boolean;
begin
  Result := RunMaintenance('uninstall', ExpandConstant('{app}'));
  if not Result then
    MsgBox('サービス削除に失敗したため、アンインストールを中止します。', mbError, MB_OK);
end;

[UninstallDelete]
; Deliberately do not delete {app} or .env, or SQL Server databases.
