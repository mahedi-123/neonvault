@echo off
title NEONVAULT
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js paowa jay nai. https://nodejs.org theke Node 22 LTS ^(ba 24^) install koro, tarpor abar ei file e double-click koro.
  pause
  exit /b 1
)

rem Backend uses Node's built-in SQLite (node:sqlite) - needs Node 22.13+ or 24+
node -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 (
  echo [X] Tomar Node version purono. https://nodejs.org theke latest Node 22 LTS ^(ba 24^) install koro.
  node -v
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo [*] Prothombar: packages install hocche, 1-2 minute lagbe...
  call npm ci --no-audit --no-fund
  if errorlevel 1 call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [X] npm install fail hoyeche. Internet check kore abar chalao.
    pause
    exit /b 1
  )
)

echo.
echo  ==============================================================
echo   NEONVAULT cholche
echo   Store  : http://localhost:5173/
echo   Admin  : http://localhost:5173/admin
echo   Admin login: niche console e dekhabe, ar server\data\admin-login.txt e save thakbe
echo   Design change: store er niche-bame "DESIGN" button ^(ba Alt+T^)
echo   Bondho korte: ei window e Ctrl+C
echo  ==============================================================
echo.
start "" "http://localhost:5173/"
call npm run dev
pause
