#requires -version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -----------------------------
# Disable QuickEdit / selection pause (prevents "click-to-freeze")
# -----------------------------
$cs = @"
using System;
using System.Runtime.InteropServices;

public static class ConsoleQuickEdit {
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);

    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);

    public const int STD_INPUT_HANDLE = -10;
    public const uint ENABLE_QUICK_EDIT_MODE = 0x0040;
    public const uint ENABLE_EXTENDED_FLAGS  = 0x0080;
}
"@

try {
    Add-Type -TypeDefinition $cs -ErrorAction SilentlyContinue | Out-Null
    $hIn = [ConsoleQuickEdit]::GetStdHandle([ConsoleQuickEdit]::STD_INPUT_HANDLE)
    [uint32]$mode = 0
    if ([ConsoleQuickEdit]::GetConsoleMode($hIn, [ref]$mode)) {
        $mode = $mode -bor [ConsoleQuickEdit]::ENABLE_EXTENDED_FLAGS
        $mode = $mode -band (-bnot [ConsoleQuickEdit]::ENABLE_QUICK_EDIT_MODE)
        [void][ConsoleQuickEdit]::SetConsoleMode($hIn, $mode)
        Write-Host "[OK] QuickEdit disabled for this session (prevents click-to-freeze)." -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] Could not disable QuickEdit: $($_.Exception.Message)" -ForegroundColor Yellow
}

# -----------------------------
# Paths / environment
# -----------------------------
$ML_DIR = "C:\Projekty\Python\Flovers\ml"
Set-Location $ML_DIR

$venvActivate = Join-Path $ML_DIR ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) { throw "Virtualenv activation script not found: $venvActivate" }
. $venvActivate

$logDir = Join-Path $ML_DIR "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $logDir "train_web_scrapped_$ts.log"
$errFile = Join-Path $logDir "train_web_scrapped_$ts.err.log"

# Ensure files exist
New-Item -ItemType File -Force -Path $logFile | Out-Null
New-Item -ItemType File -Force -Path $errFile | Out-Null

# Unbuffered + silence PIL warning globally
$env:PYTHONUNBUFFERED = "1"
$env:PYTHONWARNINGS   = "ignore::UserWarning:PIL.Image"

Write-Host "[INFO] Running training from: $ML_DIR"
Write-Host "[INFO] STDOUT log: $logFile"
Write-Host "[INFO] STDERR log: $errFile"
Write-Host "[INFO] Command: python -u train_full.py"
Write-Host ""

# -----------------------------
# Start python as a separate process (no PowerShell stderr weirdness)
# -----------------------------
$psi = @{
    FilePath               = (Get-Command python).Source
    ArgumentList           = @("-u", "train_full.py")
    WorkingDirectory       = $ML_DIR
    RedirectStandardOutput = $logFile
    RedirectStandardError  = $errFile
    NoNewWindow            = $true
    PassThru               = $true
}

$proc = Start-Process @psi
Write-Host "[OK] Started python PID=$($proc.Id). Tailing log..." -ForegroundColor Green
Write-Host "----- LIVE OUTPUT (stdout) -----" -ForegroundColor Cyan

# Tail stdout live
Get-Content -Path $logFile -Wait

# When python ends, show any stderr content (warnings/errors)
Write-Host ""
Write-Host "----- STDERR (if any) -----" -ForegroundColor Yellow
Get-Content -Path $errFile
Write-Host ""
Write-Host "[DONE] Training process ended. Logs in: $logDir" -ForegroundColor Cyan
