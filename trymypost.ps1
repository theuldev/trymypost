<#
.SYNOPSIS
    Inicia o TryMyPost (Frontend + Backend) via Docker Compose

.DESCRIPTION
    Script para iniciar o projeto TryMyPost completo.
    Verifica se o Docker está rodando, sobe os containers e abre o navegador.

.PARAMETER Action
    Ação a executar: start, stop, restart, logs, status, clean

.PARAMETER Detached
    Executa em background (padrão: $true)

.EXAMPLE
    trymypost start
    trymypost stop
    trymypost logs
    trymypost status
    trymypost clean
#>

param(
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'clean', 'open')]
    [string]$Action = 'start',
    
    [switch]$Detached = $true,
    
    [switch]$NoBrowser
)

$ProjectRoot = "C:\Users\theul\source\repos\trymypost"
$EnvFile = Join-Path $ProjectRoot ".env"
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"

function Write-Status {
    param([string]$Message, [string]$Color = 'Green')
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Check-Docker {
    try {
        docker version --format '{{.Server.Version}}' | Out-Null
        return $true
    } catch {
        Write-Status "Docker não está rodando. Inicie o Docker Desktop." -Color Red
        return $false
    }
}

function Check-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        Write-Status "Arquivo .env não encontrado. Copiando de .env.example..." -Color Yellow
        Copy-Item (Join-Path $ProjectRoot ".env.example") $EnvFile -Force
        Write-Status "EDITE o arquivo .env com suas API keys (GOOGLE_API_KEY, TAVILY_API_KEY)" -Color Red
        notepad $EnvFile
        return $false
    }
    return $true
}

function Start-Project {
    if (-not (Check-Docker)) { return }
    if (-not (Check-EnvFile)) { return }
    
    Write-Status "Iniciando TryMyPost..."
    Set-Location $ProjectRoot
    
    $cmd = "docker-compose up --build"
    if ($Detached) { $cmd += " -d" }
    
    try {
        Invoke-Expression $cmd
        Write-Status "Containers iniciados com sucesso!" -Color Green
        
        if (-not $NoBrowser) {
            Start-Sleep -Seconds 5
            Write-Status "Abrindo no navegador..." -Color Cyan
            Start-Process "http://localhost"
        }
    } catch {
        Write-Status "Erro ao iniciar: $_" -Color Red
    }
}

function Stop-Project {
    Write-Status "Parando TryMyPost..."
    Set-Location $ProjectRoot
    docker-compose down
    Write-Status "Containers parados." -Color Green
}

function Restart-Project {
    Stop-Project
    Start-Sleep -Seconds 2
    Start-Project
}

function Show-Logs {
    Set-Location $ProjectRoot
    docker-compose logs -f --tail=100
}

function Show-Status {
    Set-Location $ProjectRoot
    docker-compose ps
    Write-Host ""
    Write-Host "Endpoints:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://localhost" -ForegroundColor Gray
    Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Gray
    Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor Gray
}

function Clean-Project {
    Write-Status "Limpando tudo (containers, volumes, imagens)..." -Color Yellow
    Set-Location $ProjectRoot
    docker-compose down -v --rmi all --remove-orphans
    Write-Status "Limpeza completa." -Color Green
}

# Main
switch ($Action) {
    'start'     { Start-Project }
    'stop'      { Stop-Project }
    'restart'   { Restart-Project }
    'logs'      { Show-Logs }
    'status'    { Show-Status }
    'clean'     { Clean-Project }
    'open'      { Start-Process "http://localhost" }
    default     { Write-Status "Ação inválida: $Action" -Color Red }
}