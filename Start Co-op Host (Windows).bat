@echo off
title Cato Capitalism Game - Co-op Host
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  ============================================================
  echo   Node.js is not installed yet.
  echo.
  echo   1. Go to https://nodejs.org
  echo   2. Download and install the "LTS" version (just click Next).
  echo   3. Then double-click this file again.
  echo  ============================================================
  echo.
  pause
  exit /b
)

echo.
echo  Starting the co-op host... a browser window will open.
echo  Keep THIS window open during class. Close it to end the session.
echo.
node "coop\coop-server.js"
pause
