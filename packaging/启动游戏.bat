@echo off
setlocal
cd /d "%~dp0"
if not exist "runtime\node.exe" goto missing_runtime
if not exist "app\index.html" goto missing_app
start "Kashgar Game Server" /min "%~dp0runtime\node.exe" "%~dp0server.mjs" %KG_ARGS%
exit /b 0

:missing_runtime
echo runtime\node.exe is missing. Please extract the package again.
pause
exit /b 1

:missing_app
echo app\index.html is missing. Please build and package the game again.
pause
exit /b 1
