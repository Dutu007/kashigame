@echo off
cd /d %~dp0
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo Server already running on port 8080, opening the game page.
) else (
  echo Starting game server (minimized window)...
  start "kashigame-server" /min python server.py 8080
  timeout /t 1 >nul
)
start "" "http://localhost:8080/"
