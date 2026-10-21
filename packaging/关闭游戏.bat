@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f = Join-Path '%~dp0' '.server-info.json'; if (Test-Path $f) { $info = Get-Content $f -Raw | ConvertFrom-Json; Stop-Process -Id $info.pid -Force -ErrorAction SilentlyContinue; Remove-Item $f -Force -ErrorAction SilentlyContinue; Write-Host 'Game server stopped.' } else { Write-Host 'Game server is not running.' }"
ping -n 3 127.0.0.1 >nul
