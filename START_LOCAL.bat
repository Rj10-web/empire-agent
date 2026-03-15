@echo off
title Empire Agent - Running on localhost:3000
cd /d "%~dp0"
echo.
echo ================================================
echo   EMPIRE AGENT - Local Mode
echo ================================================
echo.
echo   http://localhost:3000    (this PC)
echo.
echo   Use same URL in browser on any device
echo   connected to this network via:
echo   http://[YOUR-IP]:3000
echo.
echo   Press Ctrl+C to stop
echo ================================================
echo.
npm run dev
