@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 20 or newer from https://nodejs.org/ and run this file again.
 pause
 exit /b 1
)
node share-online.mjs
pause
