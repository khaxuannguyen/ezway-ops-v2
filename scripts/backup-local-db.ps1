# EZWAY Ops — backup Postgres local Docker container hàng ngày.
# Output: D:\backups\ezway-ops-v2\ezway_YYYYMMDD_HHmmss.dump (Postgres custom format).
# Auto rotate: giữ 30 bản gần nhất.
#
# Setup:
#   1. Test thử: powershell -ExecutionPolicy Bypass -File scripts\backup-local-db.ps1
#   2. Task Scheduler Windows:
#      - Action: powershell.exe
#      - Arguments: -NoProfile -ExecutionPolicy Bypass -File D:\workspace\ezway-ops-v2\scripts\backup-local-db.ps1
#      - Trigger: daily 02:00 AM
#      - Run whether user logged in or not + Run with highest privileges
#
# Restore (khi cần):
#   docker exec -i ezway-postgres pg_restore -U postgres -d ezway_ops_v2 --clean --if-exists < D:\backups\...\ezway_*.dump

$ErrorActionPreference = "Stop"

$ContainerName = "ezway-postgres"
$DbName        = "ezway_ops_v2"
$DbUser        = "postgres"
$BackupDir     = "D:\backups\ezway-ops-v2"
$KeepCount     = 30

$timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "ezway_$timestamp.dump"

# 1. Verify Docker container running.
$running = docker inspect -f '{{.State.Running}}' $ContainerName 2>$null
if ($running -ne "true") {
    Write-Error "Container $ContainerName chưa chạy. Mở Docker Desktop + start container."
    exit 1
}

# 2. Ensure backup directory exists.
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

# 3. Run pg_dump inside container, output sang /tmp rồi copy ra host.
$containerDumpPath = "/tmp/ezway_backup.dump"
docker exec $ContainerName pg_dump -U $DbUser -d $DbName --format=custom --no-owner --no-acl -f $containerDumpPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed (exit $LASTEXITCODE)"
    exit 1
}

docker cp "${ContainerName}:${containerDumpPath}" $backupFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker cp failed"
    exit 1
}
docker exec $ContainerName rm $containerDumpPath | Out-Null

# 4. Verify file ra đúng.
if (-not (Test-Path $backupFile)) {
    Write-Error "Backup file không tồn tại: $backupFile"
    exit 1
}
$sizeMb = [math]::Round((Get-Item $backupFile).Length / 1MB, 2)
Write-Host ("[OK] {0} ({1} MB)" -f $backupFile, $sizeMb)

# 5. Rotate: giữ N bản gần nhất, xoá cũ.
$old = Get-ChildItem $BackupDir -Filter "ezway_*.dump" |
       Sort-Object LastWriteTime -Descending |
       Select-Object -Skip $KeepCount
foreach ($f in $old) {
    Remove-Item $f.FullName -Force
    Write-Host ("[ROTATE] removed {0}" -f $f.Name)
}
