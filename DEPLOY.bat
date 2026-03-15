@echo off
title Empire Agent — Deploy to Vercel
cd /d "%~dp0"

echo.
echo ================================================
echo   EMPIRE AGENT — Deploying to Vercel
echo ================================================
echo.
echo Step 1: Logging into Vercel (browser will open)
echo.
vercel login

echo.
echo Step 2: Setting environment variables...
vercel env add OPENROUTER_API_KEY production

echo.
echo Step 3: Deploying to production...
vercel --prod --yes

echo.
echo ================================================
echo   DONE! Your empire is live.
echo ================================================
echo.
pause
