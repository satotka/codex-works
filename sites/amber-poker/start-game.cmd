@echo off
cd /d "%~dp0"
if not exist "%~dp0PLAY.html" (
  echo PLAY.html not found. Please extract the whole ZIP first.
  pause
  exit /b 1
)
start "" "%~dp0PLAY.html"
