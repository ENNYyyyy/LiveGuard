param(
    [switch]$SkipBackend,
    [switch]$SkipLiveGuard,
    [switch]$SkipWeb
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Ensure-EnvFile {
    param(
        [string]$ExamplePath,
        [string]$EnvPath
    )
    if (-not (Test-Path $EnvPath)) {
        Copy-Item $ExamplePath $EnvPath
        Write-Host "Created $EnvPath from template."
    } else {
        Write-Host "Exists: $EnvPath"
    }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Write-Host "Repository: $RepoRoot"

Ensure-Command "npm"
Ensure-Command "git"

if (-not $SkipBackend) {
    Ensure-Command "py"
}

if (-not $SkipBackend) {
    Write-Step "Backend setup (venv + pip + .env)"
    Push-Location (Join-Path $RepoRoot "emergency-alert-backend")
    try {
        if (-not (Test-Path ".\venv\Scripts\python.exe")) {
            py -3.13 -m venv venv
        }

        & ".\venv\Scripts\python.exe" -m pip install --upgrade pip
        & ".\venv\Scripts\python.exe" -m pip install -r requirements.txt
        Ensure-EnvFile ".env.example" ".env"
    } finally {
        Pop-Location
    }
}

if (-not $SkipLiveGuard) {
    Write-Step "LiveGuard setup (npm + .env)"
    Push-Location (Join-Path $RepoRoot "LiveGuard")
    try {
        npm install
        Ensure-EnvFile ".env.example" ".env"
    } finally {
        Pop-Location
    }
}

if (-not $SkipWeb) {
    Write-Step "Agency web setup (npm + .env)"
    Push-Location (Join-Path $RepoRoot "agency-web")
    try {
        npm install
        Ensure-EnvFile ".env.example" ".env"
    } finally {
        Pop-Location
    }

    Write-Step "Admin web setup (npm + .env)"
    Push-Location (Join-Path $RepoRoot "admin-web")
    try {
        npm install
        Ensure-EnvFile ".env.example" ".env"
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Setup completed." -ForegroundColor Green
Write-Host ""
Write-Host "Manual steps still required:"
Write-Host "1) Fill real secrets in:"
Write-Host "   - emergency-alert-backend\.env"
Write-Host "   - LiveGuard\.env"
Write-Host "   - agency-web\.env"
Write-Host "   - admin-web\.env"
Write-Host "2) Put Firebase service account JSON at:"
Write-Host "   - emergency-alert-backend\firebase-service-account.json"
Write-Host "3) Ensure MySQL is running and DB exists."
Write-Host "4) Run backend init commands:"
Write-Host "   cd emergency-alert-backend"
Write-Host "   .\venv\Scripts\Activate.ps1"
Write-Host "   python manage.py migrate"
Write-Host "   python manage.py seed_data"
Write-Host "   python manage.py runserver 0.0.0.0:8000"
Write-Host ""
