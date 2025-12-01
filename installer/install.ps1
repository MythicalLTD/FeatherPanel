# FeatherPanel Windows Installer
# PowerShell installer for Windows with Docker Desktop support

#Requires -Version 5.1

param(
    [switch]$SkipOSCheck,
    [switch]$Dev,
    [string]$DevBranch = "",
    [string]$DevSha = "",
    [switch]$Help
)

# Check for admin privileges and request UAC elevation if needed
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This installer requires Administrator privileges." -ForegroundColor Yellow
    Write-Host "A UAC prompt will appear. Please click 'Yes' to continue." -ForegroundColor Cyan
    Write-Host ""
    Start-Sleep -Seconds 2
    
    # Get the script path and arguments
    $scriptPath = $MyInvocation.MyCommand.Path
    
    # If script path is empty, try alternative methods
    if ([string]::IsNullOrEmpty($scriptPath)) {
        $scriptPath = $PSCommandPath
    }
    if ([string]::IsNullOrEmpty($scriptPath)) {
        $scriptPath = Join-Path $PSScriptRoot "install.ps1"
    }
    
    # Build arguments array
    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$scriptPath`""
    )
    
    # Add parameters
    if ($SkipOSCheck) { $arguments += "-SkipOSCheck" }
    if ($Dev) { $arguments += "-Dev" }
    if ($DevBranch) { $arguments += "-DevBranch"; $arguments += "`"$DevBranch`"" }
    if ($DevSha) { $arguments += "-DevSha"; $arguments += "`"$DevSha`"" }
    if ($Help) { $arguments += "-Help" }
    
    # Re-launch with UAC elevation
    try {
        $process = Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments -PassThru -Wait
        exit $process.ExitCode
    } catch {
        # User likely cancelled UAC prompt
        if ($_.Exception.Message -match "cancel|denied|access") {
            Write-Host ""
            Write-Host "Elevation was cancelled or denied." -ForegroundColor Red
            Write-Host "Please run the script again and click 'Yes' on the UAC prompt." -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "Failed to elevate privileges: $_" -ForegroundColor Red
            Write-Host "Please right-click the script and select 'Run as Administrator'" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

# If we reach here, we have admin privileges
Write-Host "Running with Administrator privileges..." -ForegroundColor Green
Write-Host ""

# Script configuration
$Script:InstallDir = "C:\featherpanel"
$Script:LogDir = $Script:InstallDir
$Script:LogFile = Join-Path $Script:LogDir "install.log"
$Script:BackupDir = Join-Path $Script:InstallDir "backups"
$Script:MigrationDir = Join-Path $Script:InstallDir "migrations"
$Script:ComposeFile = Join-Path $Script:InstallDir "docker-compose.yml"
$Script:InstalledMarker = Join-Path $Script:InstallDir ".installed"

# Initialize logging
function Initialize-Logging {
    if (-not (Test-Path $Script:LogDir)) {
        New-Item -ItemType Directory -Path $Script:LogDir -Force | Out-Null
    }
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $Script:LogFile -Value "========================================"
    Add-Content -Path $Script:LogFile -Value "[START] $timestamp"
    Add-Content -Path $Script:LogFile -Value "Script: FeatherPanel Windows Installer"
    Add-Content -Path $Script:LogFile -Value "========================================"
}

function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
    Add-Content -Path $Script:LogFile -Value "[INFO] $Message"
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[ OK ] $Message" -ForegroundColor Green
    Add-Content -Path $Script:LogFile -Value "[OK] $Message"
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    Add-Content -Path $Script:LogFile -Value "[FAIL] $Message"
}

function Write-LogWarn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
    Add-Content -Path $Script:LogFile -Value "[WARN] $Message"
}

function Write-LogStep {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Magenta
    Add-Content -Path $Script:LogFile -Value "[STEP] $Message"
}

# Check if Docker is installed and running
function Test-Docker {
    # Refresh PATH to include Docker Desktop paths
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Common Docker Desktop installation paths
    $dockerPaths = @(
        "${env:ProgramFiles}\Docker\Docker\resources\bin",
        "${env:ProgramFiles}\Docker\Docker\resources",
        "${env:ProgramFiles(x86)}\Docker\Docker\resources\bin",
        "${env:ProgramFiles(x86)}\Docker\Docker\resources",
        "${env:LOCALAPPDATA}\Programs\Docker\Docker\resources\bin",
        "${env:LOCALAPPDATA}\Programs\Docker\Docker\resources"
    )
    
    # Add Docker paths to current session PATH if they exist
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            if ($env:Path -notlike "*$path*") {
                $env:Path = "$path;$env:Path"
            }
        }
    }
    
    # Try to find docker.exe in common locations
    $dockerExe = $null
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        $dockerExe = "docker"
    } else {
        foreach ($path in $dockerPaths) {
            $dockerPath = Join-Path $path "docker.exe"
            if (Test-Path $dockerPath) {
                $dockerExe = $dockerPath
                break
            }
        }
    }
    
    if ($null -eq $dockerExe) {
        Write-LogError "Docker is not found in PATH or common installation locations"
        Write-LogInfo "Please ensure Docker Desktop is installed from: https://www.docker.com/products/docker-desktop"
        return $false
    }
    
    # Test Docker version
    try {
        if ($dockerExe -eq "docker") {
            $dockerVersion = docker --version 2>&1
        } else {
            $dockerVersion = & $dockerExe --version 2>&1
        }
        
        if ($LASTEXITCODE -ne 0 -and $dockerVersion -notmatch "version") {
            Write-LogError "Docker command failed. Please check your Docker installation."
            return $false
        }
        
        Write-LogInfo "Docker found: $dockerVersion"
    } catch {
        Write-LogError "Failed to execute Docker command: $_"
        return $false
    }
    
    # Test Docker daemon (info command)
    try {
        if ($dockerExe -eq "docker") {
            $dockerInfo = docker info 2>&1
        } else {
            $dockerInfo = & $dockerExe info 2>&1
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-LogError "Docker is installed but the daemon is not running."
            Write-LogInfo "Please start Docker Desktop and wait for it to fully start, then try again."
            return $false
        }
        
        Write-LogSuccess "Docker is installed and running"
        return $true
    } catch {
        Write-LogError "Docker daemon is not accessible. Please start Docker Desktop."
        return $false
    }
}

# Check if Docker Compose is available
function Test-DockerCompose {
    # Refresh PATH (same as Docker check)
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Try docker compose (v2 plugin)
    try {
        $composeVersion = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0 -or $composeVersion -match "version") {
            Write-LogSuccess "Docker Compose is available (v2 plugin)"
            return $true
        }
    } catch {
        # Continue to check standalone docker-compose
    }
    
    # Try standalone docker-compose
    try {
        if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
            $composeVersion = docker-compose --version 2>&1
            if ($LASTEXITCODE -eq 0 -or $composeVersion -match "version") {
                Write-LogSuccess "Docker Compose is available (standalone)"
                return $true
            }
        }
    } catch {
        # Continue
    }
    
    Write-LogWarn "Docker Compose not found, but Docker Compose v2 (plugin) should be included with Docker Desktop"
    Write-LogInfo "Trying to continue anyway..."
    return $true  # Docker Desktop includes compose, so we'll assume it's available
}

# Banner
function Show-Banner {
    Clear-Host
    Write-Host @"
╔════════════════════════════════════════════════════════╗
║                                                        ║
║                    FeatherPanel                       ║
║              Windows Installation Script               ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

  Website:  www.mythical.systems
  Github:   github.com/mythicalltd/featherpanel
  Discord:  discord.mythical.systems
  Docs:     docs.mythical.systems

"@ -ForegroundColor Cyan
}

function Draw-HR {
    Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray
}

function Show-MainMenu {
    Show-Banner
    Draw-HR
    Write-Host "Choose a component:" -ForegroundColor White
    Write-Host "  [0] Panel (Web Interface)" -ForegroundColor Green
    Write-Host "  [1] Exit" -ForegroundColor Red
    Draw-HR
}

function Show-PanelMenu {
    Show-Banner
    Draw-HR
    Write-Host "Panel Operations" -ForegroundColor Cyan
    Draw-HR
    Write-Host ""
    Write-Host "  [0] Install Panel" -ForegroundColor Green
    Write-Host "     → Install FeatherPanel web interface using Docker"
    Write-Host "     → Choose release type (Stable Release or Development Build)"
    Write-Host ""
    Write-Host "  [1] Uninstall Panel" -ForegroundColor Red
    Write-Host "     ⚠️  WARNING: This will remove all Panel data and containers"
    Write-Host ""
    Write-Host "  [2] Update Panel" -ForegroundColor Yellow
    Write-Host "     → Pull latest Docker images and restart containers"
    Write-Host ""
    Write-Host "  [3] Backup Manager" -ForegroundColor Cyan
    Write-Host "     → Create, list, restore, and manage backups"
    Write-Host ""
    Draw-HR
}

function Show-BackupMenu {
    Show-Banner
    Draw-HR
    Write-Host "Backup Manager" -ForegroundColor Cyan
    Draw-HR
    Write-Host ""
    Write-Host "  [0] Create Backup" -ForegroundColor Green
    Write-Host "  [1] List Backups" -ForegroundColor Blue
    Write-Host "  [2] Restore Backup" -ForegroundColor Yellow
    Write-Host "  [3] Delete Backup" -ForegroundColor Red
    Write-Host "  [4] Export for Migration" -ForegroundColor Cyan
    Write-Host "  [5] Import Migration" -ForegroundColor Green
    Write-Host ""
    Draw-HR
}

function Show-ReleaseTypeMenu {
    Show-Banner
    Draw-HR
    Write-Host "Choose release type:" -ForegroundColor White
    Write-Host "  [1] Stable Release (Recommended for production)" -ForegroundColor Green
    Write-Host "  [2] Development Build (Latest from main branch)" -ForegroundColor Yellow
    Write-Host "  [3] Custom Development Build (Specify branch/commit)" -ForegroundColor Cyan
    Draw-HR
}

function Get-DevImageTag {
    param(
        [string]$Branch = "",
        [string]$Sha = ""
    )
    
    if ([string]::IsNullOrEmpty($Branch)) {
        return "dev-main"
    }
    
    $sanitizedBranch = $Branch -replace '/', '-'
    $tag = "dev-$sanitizedBranch"
    
    if (-not [string]::IsNullOrEmpty($Sha)) {
        $shortSha = $Sha.Substring(0, [Math]::Min(7, $Sha.Length))
        $tag = "dev-$sanitizedBranch-$shortSha"
    }
    
    return $tag
}

function Update-ComposeForDev {
    param(
        [string]$BackendTag,
        [string]$FrontendTag
    )
    
    Write-LogInfo "Modifying docker-compose.yml for dev images..."
    Write-LogInfo "Backend tag: $BackendTag"
    Write-LogInfo "Frontend tag: $FrontendTag"
    
    if (Test-Path $Script:ComposeFile) {
        Copy-Item $Script:ComposeFile "$Script:ComposeFile.backup" -Force
    }
    
    $content = Get-Content $Script:ComposeFile -Raw
    $content = $content -replace 'image: ghcr\.io/mythicalltd/featherpanel-backend:[^\s]+', "image: ghcr.io/mythicalltd/featherpanel-backend:$BackendTag"
    $content = $content -replace 'image: ghcr\.io/mythicalltd/featherpanel-frontend:[^\s]+', "image: ghcr.io/mythicalltd/featherpanel-frontend:$FrontendTag"
    
    Set-Content -Path $Script:ComposeFile -Value $content -NoNewline
    Write-LogSuccess "docker-compose.yml modified for dev images"
}

function Test-IsDevInstallation {
    if (Test-Path $Script:ComposeFile) {
        $content = Get-Content $Script:ComposeFile -Raw
        if ($content -match 'featherpanel-backend:dev') {
            return $true
        }
    }
    return $false
}

# Get actual Docker volume names
function Get-FeatherPanelVolumes {
    $volumes = @()
    
    # Get volumes from running containers
    $containers = @("featherpanel_mysql", "featherpanel_backend", "featherpanel_redis")
    foreach ($container in $containers) {
        try {
            $inspect = docker inspect $container 2>&1 | ConvertFrom-Json
            if ($inspect) {
                foreach ($mount in $inspect.Mounts) {
                    if ($mount.Type -eq "volume" -and $mount.Name -notin $volumes) {
                        $volumes += $mount.Name
                    }
                }
            }
        } catch {
            # Container might not exist
        }
    }
    
    # Fallback: Get volumes from docker volume ls
    if ($volumes.Count -eq 0) {
        try {
            $volumeList = docker volume ls --format "{{.Name}}" 2>&1
            foreach ($vol in $volumeList) {
                if ($vol -like "featherpanel_*" -and $vol -notin $volumes) {
                    $volumes += $vol
                }
            }
        } catch {
            Write-LogWarn "Could not list Docker volumes"
        }
    }
    
    # Final fallback: Known volume names
    if ($volumes.Count -eq 0) {
        $volumes = @(
            "featherpanel_mariadb_data",
            "featherpanel_redis_data",
            "featherpanel_featherpanel_attachments",
            "featherpanel_featherpanel_config",
            "featherpanel_featherpanel_snapshots"
        )
    }
    
    return $volumes
}

# Create backup
function New-Backup {
    Write-LogStep "Creating FeatherPanel backup..."
    
    if (-not (Test-Path $Script:InstalledMarker)) {
        Write-LogError "FeatherPanel is not installed. Nothing to backup."
        return $false
    }
    
    # Check if containers are running - better detection for PowerShell
    try {
        $runningContainers = docker ps --format "{{.Names}}" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-LogError "Failed to check Docker containers. Is Docker running?"
            return $false
        }
        
        $containerNames = $runningContainers -split "`n" | Where-Object { $_ -match "featherpanel" }
        $hasBackend = $containerNames | Where-Object { $_ -match "featherpanel_backend" }
        $hasMysql = $containerNames | Where-Object { $_ -match "featherpanel_mysql" }
        
        if (-not $hasBackend -or -not $hasMysql) {
            Write-LogError "FeatherPanel containers are not running. Cannot create backup."
            Write-LogInfo "Running containers: $($containerNames -join ', ')"
            Write-LogInfo "Please start FeatherPanel first using: Install Panel"
            return $false
        }
        
        Write-LogInfo "Found running containers: $($containerNames -join ', ')"
    } catch {
        Write-LogError "Error checking containers: $_"
        return $false
    }
    
    # Create backup directory with error handling
    try {
        if (-not (Test-Path $Script:BackupDir)) {
            $null = New-Item -ItemType Directory -Path $Script:BackupDir -Force -ErrorAction Stop
            Write-LogInfo "Created backup directory: $Script:BackupDir"
        } else {
            Write-LogInfo "Backup directory exists: $Script:BackupDir"
        }
    } catch {
        Write-LogError "Failed to create backup directory: $_"
        return $false
    }
    
    # Generate backup filename
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "featherpanel_backup_$timestamp.tar.gz"
    $backupPath = Join-Path $Script:BackupDir $backupName
    
    Write-LogInfo "Backup will be saved to: $backupPath"
    
    # Create temporary directory
    $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    
    try {
        # Get volumes
        $volumes = Get-FeatherPanelVolumes
        $volumesDir = Join-Path $tempDir.FullName "volumes"
        New-Item -ItemType Directory -Path $volumesDir -Force | Out-Null
        
        $volumesFound = 0
        $mariadbBackedUp = $false
        
        Write-LogInfo "Backing up Docker volumes..."
        foreach ($volume in $volumes) {
            try {
                $volumeInfo = docker volume inspect $volume 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-LogInfo "Backing up volume: $volume"
                    $volumeFile = Join-Path $volumesDir "$volume.tar.gz"
                    
                    # Use Docker to backup volume
                    docker run --rm -v "${volume}:/source" -v "${volumesDir}:/backup" alpine tar czf "/backup/$volume.tar.gz" -C /source . 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0 -and (Test-Path $volumeFile)) {
                        Write-LogSuccess "Volume $volume backed up"
                        $volumesFound++
                        if ($volume -like "*mariadb_data*") {
                            $mariadbBackedUp = $true
                        }
                    } else {
                        Write-LogWarn "Failed to backup volume $volume"
                    }
                }
            } catch {
                Write-LogWarn "Volume $volume does not exist, skipping"
            }
        }
        
        if ($volumesFound -eq 0) {
            Write-LogError "No volumes found to backup"
            return $false
        }
        
        if (-not $mariadbBackedUp) {
            Write-LogError "mariadb_data volume not found or could not be backed up"
            return $false
        }
        
        # Backup config files
        $configDir = Join-Path $tempDir.FullName "config"
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        
        if (Test-Path $Script:ComposeFile) {
            Copy-Item $Script:ComposeFile $configDir -Force
        }
        
        $envFile = Join-Path $Script:InstallDir ".env"
        if (Test-Path $envFile) {
            Copy-Item $envFile $configDir -Force
        }
        
        # Create backup info
        $infoFile = Join-Path $tempDir.FullName "backup_info.txt"
        $version = "unknown"
        if (Test-Path $Script:ComposeFile) {
            $composeContent = Get-Content $Script:ComposeFile -Raw
            if ($composeContent -match 'image: ghcr\.io/mythicalltd/featherpanel-backend:([^\s]+)') {
                $version = $matches[1]
            }
        }
        
        @"
FeatherPanel Backup
Created: $(Get-Date)
Backup Name: $backupName
Version: $version
Backup Method: Volume-only backup (safest and most reliable)
Volumes Backed Up: $volumesFound
Database: Backed up via mariadb_data volume (raw files)
"@ | Out-File -FilePath $infoFile -Encoding UTF8
        
        # Create archive using tar (Windows 10+ has tar)
        Write-LogInfo "Compressing backup..."
        Push-Location $tempDir.FullName
        try {
            tar -czf $backupPath * 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0 -and (Test-Path $backupPath)) {
                $backupSize = (Get-Item $backupPath).Length / 1MB
                Write-LogSuccess "Backup created successfully: $backupName ($([math]::Round($backupSize, 2)) MB)"
                return $true
            } else {
                Write-LogError "Failed to create backup archive"
                return $false
            }
        } finally {
            Pop-Location
        }
    } finally {
        Remove-Item $tempDir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# List backups
function Get-Backups {
    Write-LogStep "Listing FeatherPanel backups..."
    
    # Ensure backup directory exists
    if (-not (Test-Path $Script:BackupDir)) {
        try {
            $null = New-Item -ItemType Directory -Path $Script:BackupDir -Force -ErrorAction Stop
            Write-LogInfo "Created backup directory: $Script:BackupDir"
        } catch {
            Write-LogError "Failed to create backup directory: $_"
            return
        }
    }
    
    $backups = Get-ChildItem -Path $Script:BackupDir -Filter "featherpanel_backup_*.tar.gz" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-LogWarn "No backups found"
        return
    }
    
    Write-Host ""
    Write-Host "Available Backups:" -ForegroundColor Cyan
    Write-Host ""
    $index = 1
    foreach ($backup in $backups) {
        $size = [math]::Round($backup.Length / 1MB, 2)
        Write-Host "  [$index] $($backup.Name)" -ForegroundColor Green
        Write-Host "      Size: $size MB | Date: $($backup.LastWriteTime)"
        $index++
    }
    Write-Host ""
}

# Restore backup
function Restore-Backup {
    Write-LogStep "Restoring FeatherPanel from backup..."
    
    if (-not (Test-Path $Script:InstalledMarker)) {
        Write-LogError "FeatherPanel is not installed. Please install first before restoring."
        return $false
    }
    
    # Ensure backup directory exists
    if (-not (Test-Path $Script:BackupDir)) {
        try {
            $null = New-Item -ItemType Directory -Path $Script:BackupDir -Force -ErrorAction Stop
            Write-LogInfo "Created backup directory: $Script:BackupDir"
        } catch {
            Write-LogError "Failed to create backup directory: $_"
            return $false
        }
    }
    
    $backups = Get-ChildItem -Path $Script:BackupDir -Filter "featherpanel_backup_*.tar.gz" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-LogError "No backups found"
        return $false
    }
    
    # Show backup selection
    Get-Backups
    $selection = Read-Host "Select backup to restore (1-$($backups.Count))"
    
    if (-not ($selection -match '^\d+$') -or [int]$selection -lt 1 -or [int]$selection -gt $backups.Count) {
        Write-LogError "Invalid selection"
        return $false
    }
    
    $selectedBackup = $backups[[int]$selection - 1]
    $confirm = Read-Host "Are you absolutely sure you want to restore from $($selectedBackup.Name)? (type 'yes' to confirm)"
    
    if ($confirm -ne "yes") {
        Write-Host "Restore cancelled." -ForegroundColor Green
        return $false
    }
    
    # Stop containers
    Write-LogInfo "Stopping containers..."
    Push-Location $Script:InstallDir
    docker compose down 2>&1 | Out-Null
    Pop-Location
    
    # Extract backup
    $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    
    try {
        Write-LogInfo "Extracting backup..."
        Push-Location $tempDir.FullName
        tar -xzf $selectedBackup.FullName 2>&1 | Out-Null
        Pop-Location
        
        # Restore volumes
        $volumesDir = Join-Path $tempDir.FullName "volumes"
        if (Test-Path $volumesDir) {
            Write-LogInfo "Restoring volumes..."
            $mariadbVolumeFile = $null
            
            # Find mariadb_data volume
            foreach ($file in Get-ChildItem -Path $volumesDir -Filter "*.tar.gz") {
                if ($file.Name -like "*mariadb_data*") {
                    $mariadbVolumeFile = $file
                    break
                }
            }
            
            if ($mariadbVolumeFile) {
                $volumeName = $mariadbVolumeFile.BaseName
                Write-LogInfo "Restoring volume: $volumeName"
                
                # Remove existing volume
                docker volume rm $volumeName 2>&1 | Out-Null
                
                # Create and restore volume
                docker volume create $volumeName 2>&1 | Out-Null
                docker run --rm -v "${volumeName}:/target" -v "$($volumesDir):/backup" alpine sh -c "cd /target && tar xzf /backup/$($mariadbVolumeFile.Name)" 2>&1 | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    Write-LogSuccess "Volume $volumeName restored"
                } else {
                    Write-LogError "Failed to restore volume $volumeName"
                    return $false
                }
            }
            
            # Restore other volumes
            foreach ($file in Get-ChildItem -Path $volumesDir -Filter "*.tar.gz") {
                if ($file.Name -notlike "*mariadb_data*") {
                    $volumeName = $file.BaseName
                    Write-LogInfo "Restoring volume: $volumeName"
                    
                    docker volume rm $volumeName 2>&1 | Out-Null
                    docker volume create $volumeName 2>&1 | Out-Null
                    docker run --rm -v "${volumeName}:/target" -v "$($volumesDir):/backup" alpine sh -c "cd /target && tar xzf /backup/$($file.Name)" 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-LogSuccess "Volume $volumeName restored"
                    } else {
                        Write-LogWarn "Failed to restore volume $volumeName"
                    }
                }
            }
        }
        
        # Restore config files (optional)
        $configDir = Join-Path $tempDir.FullName "config"
        if (Test-Path $configDir) {
            $restoreConfig = Read-Host "Restore configuration files (docker-compose.yml, .env)? (y/n)"
            if ($restoreConfig -eq "y") {
                $composeBackup = Join-Path $configDir "docker-compose.yml"
                if (Test-Path $composeBackup) {
                    Copy-Item $composeBackup $Script:ComposeFile -Force
                    Write-LogInfo "docker-compose.yml restored"
                }
                
                $envBackup = Join-Path $configDir ".env"
                if (Test-Path $envBackup) {
                    Copy-Item $envBackup (Join-Path $Script:InstallDir ".env") -Force
                    Write-LogInfo ".env restored"
                }
            }
        }
        
        # Start containers
        Write-LogInfo "Starting containers..."
        Push-Location $Script:InstallDir
        docker compose up -d 2>&1 | Out-Null
        Pop-Location
        
        Write-LogSuccess "Backup restored successfully"
        return $true
    } finally {
        Remove-Item $tempDir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Install Panel
function Install-Panel {
    Write-LogStep "Installing FeatherPanel..."
    
    if (Test-Path $Script:InstalledMarker) {
        Write-LogError "FeatherPanel is already installed. Use Update Panel instead."
        return $false
    }
    
    # Create installation directory and subdirectories
    try {
        if (-not (Test-Path $Script:InstallDir)) {
            $null = New-Item -ItemType Directory -Path $Script:InstallDir -Force -ErrorAction Stop
            Write-LogInfo "Created installation directory: $Script:InstallDir"
        }
        
        # Create backup and migration directories upfront
        if (-not (Test-Path $Script:BackupDir)) {
            $null = New-Item -ItemType Directory -Path $Script:BackupDir -Force -ErrorAction Stop
            Write-LogInfo "Created backup directory: $Script:BackupDir"
        }
        
        if (-not (Test-Path $Script:MigrationDir)) {
            $null = New-Item -ItemType Directory -Path $Script:MigrationDir -Force -ErrorAction Stop
            Write-LogInfo "Created migration directory: $Script:MigrationDir"
        }
    } catch {
        Write-LogError "Failed to create directories: $_"
        return $false
    }
    
    # Download docker-compose.yml
    Write-LogInfo "Downloading docker-compose.yml..."
    $composeUrl = "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml"
    try {
        Invoke-WebRequest -Uri $composeUrl -OutFile $Script:ComposeFile -UseBasicParsing
        Write-LogSuccess "docker-compose.yml downloaded"
    } catch {
        Write-LogError "Failed to download docker-compose.yml: $_"
        return $false
    }
    
    # Release type selection
    $useDev = $false
    $devBranch = ""
    $devSha = ""
    
    if ($Dev) {
        $useDev = $true
        $devBranch = if ($DevBranch) { $DevBranch } else { "main" }
        $devSha = $DevSha
    } else {
        Show-ReleaseTypeMenu
        $releaseChoice = Read-Host "Select release type (1/2/3)"
        
        switch ($releaseChoice) {
            "1" { $useDev = $false }
            "2" { 
                $useDev = $true
                $devBranch = "main"
            }
            "3" {
                $useDev = $true
                $devBranch = Read-Host "Enter branch name (default: main)"
                if ([string]::IsNullOrEmpty($devBranch)) {
                    $devBranch = "main"
                }
                $devSha = Read-Host "Enter commit SHA (optional, press Enter to skip)"
            }
        }
    }
    
    # Modify compose file for dev if needed
    if ($useDev) {
        $backendTag = Get-DevImageTag -Branch $devBranch -Sha $devSha
        $frontendTag = if ($devSha) { $backendTag } else { if ($devBranch) { "dev-$devBranch" } else { "dev" } }
        Update-ComposeForDev -BackendTag $backendTag -FrontendTag $frontendTag
    }
    
    # Pull images
    Write-LogInfo "Pulling Docker images..."
    Push-Location $Script:InstallDir
    docker compose pull 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Failed to pull Docker images"
        Pop-Location
        return $false
    }
    Pop-Location
    
    # Start containers
    Write-LogInfo "Starting containers..."
    Push-Location $Script:InstallDir
    docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Failed to start containers"
        Pop-Location
        return $false
    }
    Pop-Location
    
    # Create installed marker
    New-Item -ItemType File -Path $Script:InstalledMarker -Force | Out-Null
    
    Write-LogSuccess "Panel installation completed successfully!"
    if ($useDev) {
        Write-LogWarn "DEVELOPMENT RELEASE: This is a dev build and may be unstable."
    }
    Write-LogWarn "IMPORTANT: The Panel may take up to 5 minutes to fully initialize."
    Write-LogInfo "Please wait at least 5 minutes before trying to access the Panel."
    
    Write-Host ""
    Draw-HR
    Write-Host "Panel Access Information" -ForegroundColor Cyan
    Draw-HR
    Write-Host ""
    
    if ($useDev) {
        $devTag = Get-DevImageTag -Branch $devBranch -Sha $devSha
        Write-Host "  ⚠️  Development Release" -ForegroundColor Yellow
        Write-Host "     • Using dev images with tag: $devTag" -ForegroundColor Cyan
        if ($devBranch) {
            Write-Host "     • Branch: $devBranch" -ForegroundColor Cyan
        }
        if ($devSha) {
            Write-Host "     • Commit: $devSha" -ForegroundColor Cyan
        }
        Write-Host ""
    }
    
    # Get public IP for display
    $publicIP = "Unable to detect"
    try {
        $publicIP = (Invoke-WebRequest -Uri "https://ifconfig.me" -UseBasicParsing -TimeoutSec 5).Content.Trim()
    } catch {
        try {
            $publicIP = (Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing -TimeoutSec 5).Content.Trim()
        } catch {
            # Keep default
        }
    }
    
    Write-Host "  ✓ Direct Access:" -ForegroundColor Green
    Write-Host "     • Local: http://localhost:4831" -ForegroundColor Cyan
    if ($publicIP -ne "Unable to detect") {
        Write-Host "     • Public: http://$publicIP:4831" -ForegroundColor Cyan
        Write-Host "     • Ensure port 4831 is open in Windows Firewall" -ForegroundColor Yellow
    } else {
        Write-Host "     • Public: http://YOUR_SERVER_IP:4831" -ForegroundColor Cyan
        Write-Host "     • Replace YOUR_SERVER_IP with your actual server IP" -ForegroundColor Yellow
        Write-Host "     • Ensure port 4831 is open in Windows Firewall" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Draw-HR
    Write-Host "👤 Administrator Account" -ForegroundColor Yellow
    Draw-HR
    Write-Host ""
    Write-Host "  IMPORTANT: The first user to register will automatically become the administrator." -ForegroundColor Yellow
    Write-Host "  Make sure you are the first person to create an account!" -ForegroundColor Cyan
    Write-Host ""
    Draw-HR
    Write-Host "📋 Next Steps" -ForegroundColor Cyan
    Draw-HR
    Write-Host ""
    Write-Host "  1. Wait 5 minutes for the Panel to fully initialize" -ForegroundColor White
    Write-Host "  2. Open the Panel URL in your web browser" -ForegroundColor White
    Write-Host "  3. Register the first account (this will be the administrator)" -ForegroundColor White
    Write-Host "  4. Complete the initial setup in the Panel interface" -ForegroundColor White
    Write-Host "  5. Consider adding SSL certificate for security (if using domain)" -ForegroundColor White
    Write-Host ""
    Draw-HR
    Write-Host ""
    Write-LogInfo "Installation log saved at: $Script:LogFile"
    
    return $true
}

# Uninstall Panel
function Uninstall-Panel {
    Write-LogStep "Uninstalling FeatherPanel..."
    
    if (-not (Test-Path $Script:InstalledMarker)) {
        Write-LogError "FeatherPanel is not installed."
        return $false
    }
    
    $confirm = Read-Host "Are you absolutely sure you want to uninstall FeatherPanel? This will remove all data. (type 'yes' to confirm)"
    if ($confirm -ne "yes") {
        Write-Host "Uninstall cancelled." -ForegroundColor Green
        return $false
    }
    
    # Stop and remove containers
    if (Test-Path $Script:ComposeFile) {
        Write-LogInfo "Stopping and removing containers..."
        Push-Location $Script:InstallDir
        docker compose down -v 2>&1 | Out-Null
        Pop-Location
    }
    
    # Remove installation directory
    if (Test-Path $Script:InstallDir) {
        Write-LogInfo "Removing installation files..."
        Remove-Item $Script:InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Write-LogSuccess "FeatherPanel uninstalled successfully"
    return $true
}

# Update Panel
function Update-Panel {
    Write-LogStep "Updating FeatherPanel..."
    
    if (-not (Test-Path $Script:InstalledMarker)) {
        Write-LogError "FeatherPanel is not installed. Please install first."
        return $false
    }
    
    # Check current installation type
    $isDev = Test-IsDevInstallation
    
    # Release type selection
    $useDev = $false
    $devBranch = ""
    $devSha = ""
    
    if ($Dev) {
        $useDev = $true
        $devBranch = if ($DevBranch) { $DevBranch } else { "main" }
        $devSha = $DevSha
    } else {
        Show-ReleaseTypeMenu
        Write-Host ""
        if ($isDev) {
            Write-Host "Current installation: Development Build" -ForegroundColor Yellow
        } else {
            Write-Host "Current installation: Stable Release" -ForegroundColor Green
        }
        Write-Host ""
        $releaseChoice = Read-Host "Select release type (1/2/3)"
        
        switch ($releaseChoice) {
            "1" { $useDev = $false }
            "2" { 
                $useDev = $true
                $devBranch = "main"
            }
            "3" {
                $useDev = $true
                $devBranch = Read-Host "Enter branch name (default: main)"
                if ([string]::IsNullOrEmpty($devBranch)) {
                    $devBranch = "main"
                }
                $devSha = Read-Host "Enter commit SHA (optional, press Enter to skip)"
            }
        }
    }
    
    # Refresh docker-compose.yml
    Write-LogInfo "Refreshing docker-compose.yml..."
    $composeUrl = "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml"
    try {
        Invoke-WebRequest -Uri $composeUrl -OutFile $Script:ComposeFile -UseBasicParsing
        Write-LogSuccess "docker-compose.yml refreshed"
    } catch {
        Write-LogWarn "Failed to refresh docker-compose.yml, using existing file"
    }
    
    # Modify for dev if needed
    if ($useDev) {
        $backendTag = Get-DevImageTag -Branch $devBranch -Sha $devSha
        $frontendTag = if ($devSha) { $backendTag } else { if ($devBranch) { "dev-$devBranch" } else { "dev" } }
        Update-ComposeForDev -BackendTag $backendTag -FrontendTag $frontendTag
    }
    
    # Pull images
    Write-LogInfo "Pulling latest images..."
    Push-Location $Script:InstallDir
    docker compose pull 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Failed to pull Docker images"
        Pop-Location
        return $false
    }
    Pop-Location
    
    # Restart containers
    Write-LogInfo "Restarting containers..."
    Push-Location $Script:InstallDir
    docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Failed to restart containers"
        Pop-Location
        return $false
    }
    Pop-Location
    
    Write-LogSuccess "FeatherPanel updated successfully"
    Write-Host ""
    Draw-HR
    Write-Host "Update Complete" -ForegroundColor Green
    Draw-HR
    Write-Host ""
    
    if ($useDev) {
        $devTag = Get-DevImageTag -Branch $devBranch -Sha $devSha
        Write-Host "  ⚠️  Development Release" -ForegroundColor Yellow
        Write-Host "     • Using dev images with tag: $devTag" -ForegroundColor Cyan
        if ($devBranch) {
            Write-Host "     • Branch: $devBranch" -ForegroundColor Cyan
        }
        if ($devSha) {
            Write-Host "     • Commit: $devSha" -ForegroundColor Cyan
        }
        Write-Host ""
    }
    
    Write-Host "  Panel Access:" -ForegroundColor Cyan
    Write-Host "     • Local: http://localhost:4831" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Note: Containers are restarting. Wait 2-3 minutes before accessing." -ForegroundColor Yellow
    Write-Host ""
    Draw-HR
    
    return $true
}

# Delete backup
function Remove-Backup {
    Write-LogStep "Deleting FeatherPanel backup..."
    
    # Ensure backup directory exists
    if (-not (Test-Path $Script:BackupDir)) {
        try {
            $null = New-Item -ItemType Directory -Path $Script:BackupDir -Force -ErrorAction Stop
            Write-LogInfo "Created backup directory: $Script:BackupDir"
        } catch {
            Write-LogError "Failed to create backup directory: $_"
            return $false
        }
    }
    
    $backups = Get-ChildItem -Path $Script:BackupDir -Filter "featherpanel_backup_*.tar.gz" | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-LogError "No backups found"
        return $false
    }
    
    # Show backup selection
    Get-Backups
    $selection = Read-Host "Select backup to delete (1-$($backups.Count))"
    
    if (-not ($selection -match '^\d+$') -or [int]$selection -lt 1 -or [int]$selection -gt $backups.Count) {
        Write-LogError "Invalid selection"
        return $false
    }
    
    $selectedBackup = $backups[[int]$selection - 1]
    $confirm = Read-Host "Are you absolutely sure you want to delete $($selectedBackup.Name)? (type 'yes' to confirm)"
    
    if ($confirm -ne "yes") {
        Write-Host "Deletion cancelled." -ForegroundColor Green
        return $false
    }
    
    try {
        Remove-Item $selectedBackup.FullName -Force
        Write-LogSuccess "Backup deleted: $($selectedBackup.Name)"
        return $true
    } catch {
        Write-LogError "Failed to delete backup: $_"
        return $false
    }
}

# Export migration
function Export-Migration {
    Write-LogStep "Creating migration package for FeatherPanel..."
    
    if (-not (Test-Path $Script:InstalledMarker)) {
        Write-LogError "FeatherPanel is not installed. Nothing to export."
        return $false
    }
    
    # Check if containers are running - better detection for PowerShell
    try {
        $runningContainers = docker ps --format "{{.Names}}" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-LogError "Failed to check Docker containers. Is Docker running?"
            return $false
        }
        
        $containerNames = $runningContainers -split "`n" | Where-Object { $_ -match "featherpanel" }
        $hasBackend = $containerNames | Where-Object { $_ -match "featherpanel_backend" }
        $hasMysql = $containerNames | Where-Object { $_ -match "featherpanel_mysql" }
        
        if (-not $hasBackend -or -not $hasMysql) {
            Write-LogError "FeatherPanel containers are not running. Cannot create migration package."
            Write-LogInfo "Running containers: $($containerNames -join ', ')"
            Write-LogInfo "Please start FeatherPanel first using: Install Panel"
            return $false
        }
        
        Write-LogInfo "Found running containers: $($containerNames -join ', ')"
    } catch {
        Write-LogError "Error checking containers: $_"
        return $false
    }
    
    # Create migration directory with error handling
    try {
        if (-not (Test-Path $Script:MigrationDir)) {
            $null = New-Item -ItemType Directory -Path $Script:MigrationDir -Force -ErrorAction Stop
            Write-LogInfo "Created migration directory: $Script:MigrationDir"
        } else {
            Write-LogInfo "Migration directory exists: $Script:MigrationDir"
        }
    } catch {
        Write-LogError "Failed to create migration directory: $_"
        return $false
    }
    
    # Generate migration filename
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $migrationName = "featherpanel_migration_$timestamp.tar.gz"
    $migrationPath = Join-Path $Script:MigrationDir $migrationName
    
    Write-LogInfo "Migration package will be saved to: $migrationPath"
    
    # Create temporary directory
    $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    
    try {
        # Export volumes
        $volumes = Get-FeatherPanelVolumes
        $volumesDir = Join-Path $tempDir.FullName "volumes"
        New-Item -ItemType Directory -Path $volumesDir -Force | Out-Null
        
        $volumesFound = 0
        $mariadbExported = $false
        
        Write-LogInfo "Exporting Docker volumes..."
        foreach ($volume in $volumes) {
            try {
                $volumeInfo = docker volume inspect $volume 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-LogInfo "Exporting volume: $volume"
                    $volumeFile = Join-Path $volumesDir "$volume.tar.gz"
                    
                    docker run --rm -v "${volume}:/source" -v "${volumesDir}:/backup" alpine tar czf "/backup/$volume.tar.gz" -C /source . 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0 -and (Test-Path $volumeFile)) {
                        Write-LogSuccess "Volume $volume exported"
                        $volumesFound++
                        if ($volume -like "*mariadb_data*") {
                            $mariadbExported = $true
                        }
                    } else {
                        Write-LogWarn "Failed to export volume $volume"
                    }
                }
            } catch {
                Write-LogWarn "Volume $volume does not exist, skipping"
            }
        }
        
        if ($volumesFound -eq 0) {
            Write-LogError "No volumes found to export"
            return $false
        }
        
        if (-not $mariadbExported) {
            Write-LogError "mariadb_data volume not found or could not be exported"
            return $false
        }
        
        # Export config files
        $configDir = Join-Path $tempDir.FullName "config"
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        
        if (Test-Path $Script:ComposeFile) {
            Copy-Item $Script:ComposeFile $configDir -Force
        }
        
        $envFile = Join-Path $Script:InstallDir ".env"
        if (Test-Path $envFile) {
            Copy-Item $envFile $configDir -Force
        }
        
        # Create migration info
        $infoFile = Join-Path $tempDir.FullName "migration_info.txt"
        $version = "unknown"
        if (Test-Path $Script:ComposeFile) {
            $composeContent = Get-Content $Script:ComposeFile -Raw
            if ($composeContent -match 'image: ghcr\.io/mythicalltd/featherpanel-backend:([^\s]+)') {
                $version = $matches[1]
            }
        }
        
        @"
FeatherPanel Migration Package
Created: $(Get-Date)
Migration Name: $migrationName
Source Server: $env:COMPUTERNAME
Backup Method: Volume-only backup (safest and most reliable)

IMPORTANT: This is a migration package for moving FeatherPanel to another server.
To import this package on the destination server:
1. Transfer this file to the destination server
2. Launch the FeatherPanel installer and navigate to: Panel > Backup Manager > Import Migration
3. Follow the import wizard to complete the migration

This package contains:
- All Docker volumes (mariadb_data, attachments, config, snapshots, redis_data, etc.)
- Configuration files (docker-compose.yml, .env)
- Database is included in mariadb_data volume (raw files - safest method)
"@ | Out-File -FilePath $infoFile -Encoding UTF8
        
        # Create README
        $readmeFile = Join-Path $tempDir.FullName "README_MIGRATION.txt"
        @"
========================================
FeatherPanel Migration Package
========================================

This package contains a complete export of your FeatherPanel installation
that can be imported on another server.

TRANSFER METHODS:

Method 1: SCP (Recommended)
----------------------------
On the DESTINATION server, run:
  scp user@source-server:/path/to/migration/featherpanel_migration_*.tar.gz ./

Method 2: Manual Download
-------------------------
1. Download this file from the source server using:
   - SFTP client (FileZilla, WinSCP, etc.)
   - HTTP server (if configured)
   - Cloud storage (upload from source, download on destination)

2. Transfer to destination server at:
   /var/www/featherpanel/migrations/ (Linux)
   C:\featherpanel\migrations\ (Windows)

Method 3: rsync
---------------
On the DESTINATION server, run:
  rsync -avz user@source-server:/path/to/migration/featherpanel_migration_*.tar.gz ./

IMPORT INSTRUCTIONS:
--------------------
1. Ensure FeatherPanel is installed on the destination server
2. Launch the FeatherPanel installer
3. Navigate to: Panel > Backup Manager > Import Migration
4. Follow the import wizard to complete the migration

NOTE: The destination server must have FeatherPanel installed before
importing this migration package.
"@ | Out-File -FilePath $readmeFile -Encoding UTF8
        
        # Create archive
        Write-LogInfo "Compressing migration package..."
        Push-Location $tempDir.FullName
        try {
            tar -czf $migrationPath * 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0 -and (Test-Path $migrationPath)) {
                $migrationSize = (Get-Item $migrationPath).Length / 1MB
                Write-LogSuccess "Migration package created: $migrationName ($([math]::Round($migrationSize, 2)) MB)"
                
                Show-Banner
                Draw-HR
                Write-Host "Migration Package Created" -ForegroundColor Green
                Draw-HR
                Write-Host ""
                Write-Host "  ✓ Migration package: $migrationName" -ForegroundColor Green
                Write-Host "  • Size: $([math]::Round($migrationSize, 2)) MB" -ForegroundColor Cyan
                Write-Host "  • Location: $migrationPath" -ForegroundColor Cyan
                Write-Host ""
                Draw-HR
                Write-Host "Transfer Instructions:" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "On the destination server:" -ForegroundColor White
                Write-Host "  1. Ensure FeatherPanel is installed"
                Write-Host "  2. Launch the FeatherPanel installer"
                Write-Host "  3. Navigate to: Panel > Backup Manager > Import Migration"
                Write-Host ""
                Draw-HR
                
                return $true
            } else {
                Write-LogError "Failed to create migration package"
                return $false
            }
        } finally {
            Pop-Location
        }
    } finally {
        Remove-Item $tempDir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Import migration
function Import-Migration {
    Write-LogStep "Importing FeatherPanel migration package..."
    
    # Look for migration packages
    $migrationFiles = @()
    
    if (Test-Path $Script:MigrationDir) {
        $migrationFiles += Get-ChildItem -Path $Script:MigrationDir -Filter "featherpanel_migration_*.tar.gz" | Sort-Object LastWriteTime -Descending
    }
    
    # Also check current directory and common locations
    $additionalLocations = @(
        $PSScriptRoot,
        "$env:USERPROFILE\Downloads",
        "$env:USERPROFILE\Desktop"
    )
    
    foreach ($location in $additionalLocations) {
        if (Test-Path $location) {
            $migrationFiles += Get-ChildItem -Path $location -Filter "featherpanel_migration_*.tar.gz" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
        }
    }
    
    $selectedMigration = $null
    
    if ($migrationFiles.Count -eq 0) {
        Write-LogWarn "No migration packages found"
        $customPath = Read-Host "Enter full path to migration package (or press Enter to cancel)"
        if ([string]::IsNullOrEmpty($customPath)) {
            Write-Host "Import cancelled." -ForegroundColor Green
            return $false
        }
        if (Test-Path $customPath) {
            $selectedMigration = Get-Item $customPath
        } else {
            Write-LogError "File not found: $customPath"
            return $false
        }
    } else {
        # Show selection menu
        Show-Banner
        Draw-HR
        Write-Host "Select Migration Package" -ForegroundColor Cyan
        Draw-HR
        Write-Host ""
        $index = 1
        foreach ($migration in $migrationFiles) {
            $size = [math]::Round($migration.Length / 1MB, 2)
            Write-Host "  [$index] $($migration.Name)" -ForegroundColor Green
            Write-Host "      Size: $size MB | Date: $($migration.LastWriteTime)"
            Write-Host "      Path: $($migration.FullName)"
            Write-Host ""
            $index++
        }
        Write-Host "  [$index] Specify custom path" -ForegroundColor Cyan
        Write-Host ""
        Draw-HR
        Write-Host "⚠️  WARNING: Importing will replace all current Panel data!" -ForegroundColor Red
        Write-Host ""
        Draw-HR
        
        $selection = Read-Host "Select migration package (1-$index)"
        
        if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $migrationFiles.Count) {
            $selectedMigration = $migrationFiles[[int]$selection - 1]
        } elseif ($selection -match '^\d+$' -and [int]$selection -eq $index) {
            $customPath = Read-Host "Enter full path to migration package"
            if (-not [string]::IsNullOrEmpty($customPath) -and (Test-Path $customPath)) {
                $selectedMigration = Get-Item $customPath
            } else {
                Write-LogError "Invalid path or file not found"
                return $false
            }
        } else {
            Write-LogError "Invalid selection"
            return $false
        }
    }
    
    $confirm = Read-Host "Are you absolutely sure you want to import from $($selectedMigration.Name)? (type 'yes' to confirm)"
    if ($confirm -ne "yes") {
        Write-Host "Import cancelled." -ForegroundColor Green
        return $false
    }
    
    # Check if Panel is installed
    $freshInstall = -not (Test-Path $Script:InstalledMarker)
    
    if (-not $freshInstall) {
        Write-LogInfo "Stopping FeatherPanel containers..."
        Push-Location $Script:InstallDir
        docker compose down 2>&1 | Out-Null
        Pop-Location
    } else {
        Write-LogInfo "FeatherPanel not installed. Will install with imported data."
        if (-not (Test-Path $Script:InstallDir)) {
            New-Item -ItemType Directory -Path $Script:InstallDir -Force | Out-Null
        }
    }
    
    # Extract migration package
    $tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
    
    try {
        Write-LogInfo "Extracting migration package..."
        Push-Location $tempDir.FullName
        tar -xzf $selectedMigration.FullName 2>&1 | Out-Null
        Pop-Location
        
        # Fresh install setup
        if ($freshInstall) {
            Write-LogInfo "Setting up FeatherPanel..."
            
            # Download docker-compose.yml if not in migration
            $composeBackup = Join-Path $tempDir.FullName "config\docker-compose.yml"
            if (Test-Path $composeBackup) {
                Copy-Item $composeBackup $Script:ComposeFile -Force
                Write-LogInfo "Using docker-compose.yml from migration package"
            } else {
                Write-LogInfo "Downloading docker-compose.yml..."
                $composeUrl = "https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/refs/heads/main/docker-compose.yml"
                try {
                    Invoke-WebRequest -Uri $composeUrl -OutFile $Script:ComposeFile -UseBasicParsing
                    Write-LogSuccess "docker-compose.yml downloaded"
                } catch {
                    Write-LogError "Failed to download docker-compose.yml: $_"
                    return $false
                }
            }
            
            # Copy .env if present
            $envBackup = Join-Path $tempDir.FullName "config\.env"
            if (Test-Path $envBackup) {
                Copy-Item $envBackup (Join-Path $Script:InstallDir ".env") -Force
                Write-LogInfo "Restored .env from migration package"
            }
        }
        
        # Restore volumes
        $volumesDir = Join-Path $tempDir.FullName "volumes"
        if (Test-Path $volumesDir) {
            Write-LogInfo "Restoring volumes..."
            $mariadbVolumeFile = $null
            
            # Find and restore mariadb_data first
            foreach ($file in Get-ChildItem -Path $volumesDir -Filter "*.tar.gz") {
                if ($file.Name -like "*mariadb_data*") {
                    $mariadbVolumeFile = $file
                    $volumeName = $file.BaseName
                    Write-LogInfo "Restoring volume: $volumeName"
                    
                    docker volume rm $volumeName 2>&1 | Out-Null
                    docker volume create $volumeName 2>&1 | Out-Null
                    docker run --rm -v "${volumeName}:/target" -v "$($volumesDir):/backup" alpine sh -c "cd /target && tar xzf /backup/$($file.Name)" 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-LogSuccess "Volume $volumeName restored"
                    } else {
                        Write-LogError "Failed to restore volume $volumeName"
                        return $false
                    }
                    break
                }
            }
            
            # Restore other volumes
            foreach ($file in Get-ChildItem -Path $volumesDir -Filter "*.tar.gz") {
                if ($file.Name -notlike "*mariadb_data*") {
                    $volumeName = $file.BaseName
                    Write-LogInfo "Restoring volume: $volumeName"
                    
                    docker volume rm $volumeName 2>&1 | Out-Null
                    docker volume create $volumeName 2>&1 | Out-Null
                    docker run --rm -v "${volumeName}:/target" -v "$($volumesDir):/backup" alpine sh -c "cd /target && tar xzf /backup/$($file.Name)" 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-LogSuccess "Volume $volumeName restored"
                    } else {
                        Write-LogWarn "Failed to restore volume $volumeName"
                    }
                }
            }
        } else {
            Write-LogError "Volumes backup not found in migration package"
            return $false
        }
        
        # Start containers
        Write-LogInfo "Starting FeatherPanel containers..."
        Push-Location $Script:InstallDir
        docker compose up -d 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-LogError "Failed to start containers"
            Pop-Location
            return $false
        }
        Pop-Location
        
        # Mark as installed
        New-Item -ItemType File -Path $Script:InstalledMarker -Force | Out-Null
        
        Write-LogSuccess "Migration import completed successfully from $($selectedMigration.Name)"
        
        Show-Banner
        Draw-HR
        Write-Host "Migration Import Complete" -ForegroundColor Green
        Draw-HR
        Write-Host ""
        Write-Host "  ✓ Migration package imported: $($selectedMigration.Name)" -ForegroundColor Green
        Write-Host ""
        Draw-HR
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Draw-HR
        Write-Host ""
        Write-Host "  1. Wait 2-3 minutes for containers to fully start"
        Write-Host "  2. Update DNS records if domain changed"
        Write-Host "  3. Update SSL certificates if using different domain"
        Write-Host "  4. Verify Panel access and test functionality"
        Write-Host ""
        Draw-HR
        
        return $true
    } finally {
        Remove-Item $tempDir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Main execution
Initialize-Logging

# Check Docker
if (-not (Test-Docker)) {
    Write-LogError "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

if (-not (Test-DockerCompose)) {
    Write-LogError "Docker Compose is required but not available"
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Main menu loop
while ($true) {
    Show-MainMenu
    $choice = Read-Host "Enter component (0/1)"
    
    switch ($choice) {
        "0" {
            # Panel menu
            while ($true) {
                Show-PanelMenu
                $panelChoice = Read-Host "Select operation (0/1/2/3)"
                
                switch ($panelChoice) {
                    "0" {
                        if (Install-Panel) {
                            Write-Host "Press any key to continue..."
                            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                        }
                    }
                    "1" {
                        if (Uninstall-Panel) {
                            Write-Host "Press any key to continue..."
                            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                        }
                    }
                    "2" {
                        if (Update-Panel) {
                            Write-Host "Press any key to continue..."
                            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                        }
                    }
                    "3" {
                        # Backup Manager
                        while ($true) {
                            Show-BackupMenu
                            $backupChoice = Read-Host "Select backup operation (0/1/2/3/4/5)"
                            
                            switch ($backupChoice) {
                                "0" {
                                    if (New-Backup) {
                                        Write-Host "Press any key to continue..."
                                        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                                    }
                                }
                                "1" {
                                    Get-Backups
                                    Write-Host "Press any key to continue..."
                                    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                                }
                                "2" {
                                    if (Restore-Backup) {
                                        Write-Host "Press any key to continue..."
                                        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                                    }
                                }
                                "3" {
                                    if (Remove-Backup) {
                                        Write-Host "Press any key to continue..."
                                        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                                    }
                                }
                                "4" {
                                    if (Export-Migration) {
                                        Write-Host "Press any key to continue..."
                                        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                                    }
                                }
                                "5" {
                                    if (Import-Migration) {
                                        Write-Host "Press any key to continue..."
                                        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
                                    }
                                }
                                default {
                                    break
                                }
                            }
                        }
                    }
                    default {
                        break
                    }
                }
            }
        }
        "1" {
            Write-Host "Exiting..." -ForegroundColor Yellow
            exit 0
        }
        default {
            Write-Host "Invalid choice. Please try again." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}


