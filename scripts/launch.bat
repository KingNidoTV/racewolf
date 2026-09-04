@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
title RaceWolf

where npm >nul 2>&1
if errorlevel 1 (
  call :fail "Node.js / npm introuvable. Installez Node.js depuis https://nodejs.org/"
  exit /b 1
)

if not exist "node_modules\" (
  echo [RaceWolf] Installation des dependances...
  call npm install
  if errorlevel 1 (
    call :fail "Echec npm install. En terminal: npm install"
    exit /b 1
  )
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo [RaceWolf] Binaire Electron manquant - telechargement...
  call node scripts\ensure-electron.js
  if errorlevel 1 (
    call :fail "Binaire Electron manquant. En terminal: npm run install:electron"
    exit /b 1
  )
)

if not exist "dist-electron\electron\main.js" goto :build
if not exist "dist\launcher.html" goto :build
goto :run

:build
echo [RaceWolf] Compilation (une seule fois)...
call npm run build
if errorlevel 1 (
  call :fail "Erreur compilation. En terminal: npm run build"
  exit /b 1
)

:run
if exist "node_modules\electron\dist\electron.exe" (
  start "" /D "%CD%" "node_modules\electron\dist\electron.exe" .
  exit /b 0
)

call npx electron .
exit /b %ERRORLEVEL%

:fail
echo [RaceWolf] %~1
if "%RACEWOLF_SILENT%"=="1" (
  powershell -NoProfile -WindowStyle Hidden -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('%~1','RaceWolf','OK','Error')" >nul 2>&1
) else (
  pause
)
exit /b 1
