@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

where npm >nul 2>&1
if errorlevel 1 (
  echo [RaceWolf] npm introuvable. Installez Node.js depuis https://nodejs.org/
  pause
  exit /b 1
)

echo [RaceWolf] Reparation d'Electron...
echo [RaceWolf] Si un antivirus bloque, autorisez le dossier du projet.
echo.

set ELECTRON_SKIP_BINARY_DOWNLOAD=
call node scripts\ensure-electron.js
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo [RaceWolf] OK — double-cliquez RaceWolf.lnk
pause
