@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js LTS desde https://nodejs.org/en/download y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "node_modules\@solana\spl-token\package.json" (
  echo Instalando las dependencias del proyecto...
  call npm ci --ignore-scripts
  if errorlevel 1 (
    echo La instalacion ha fallado. Copia el error para revisarlo.
    pause
    exit /b 1
  )
)
call npm start
pause
