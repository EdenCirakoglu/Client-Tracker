param([string]$ApprovedTestInbox)
$ErrorActionPreference = 'Stop'
$root = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'ClientOpsTracker'
$dir = Join-Path $root 'private-staging'
$target = Join-Path $dir 'operator.json'
$template = Join-Path $PSScriptRoot '../ops/personal-staging.example.json'
$config = Get-Content -LiteralPath $template -Raw | ConvertFrom-Json
if ($ApprovedTestInbox) {
    $config.mail.approvedTestInbox = ([Net.Mail.MailAddress]::new($ApprovedTestInbox)).Address
}

# Never follow a redirected project folder or modify an existing private file.
foreach ($item in @($root, $dir, $target)) {
    if ((Test-Path -LiteralPath $item) -and
        ((Get-Item -Force -LiteralPath $item).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Private configuration path contains a reparse point.'
    }
}
if (Test-Path -LiteralPath $target) {
    Write-Output "Existing operator configuration preserved: $target"
    return
}
if (!(Test-Path -LiteralPath $root)) { [void][IO.Directory]::CreateDirectory($root) }
$owner = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($owner)
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @($owner, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
        $sid, 'FullControl', 'ContainerInherit, ObjectInherit', 'None', 'Allow'))
}
if (!(Test-Path -LiteralPath $dir)) { [void][IO.Directory]::CreateDirectory($dir) }
Set-Acl -LiteralPath $dir -AclObject $acl
$data = [Text.UTF8Encoding]::new($false).GetBytes(($config | ConvertTo-Json -Depth 5))
$stream = [IO.File]::Open($target, 'CreateNew', 'Write', 'None')
try { $stream.Write($data, 0, $data.Length) } finally { $stream.Dispose() }
Write-Output "Created private operator configuration: $target"
