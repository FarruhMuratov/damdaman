@echo off
echo Installing Node.js dependencies...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    echo Please check your Node.js installation
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version
echo.

echo Installing dependencies...
npm install

if %errorlevel% equ 0 (
    echo.
    echo ✅ Dependencies installed successfully!
    echo.
    echo To start the server, run:
    echo   npm start
    echo.
    echo To apply the database schema, run:
    echo   npm run apply-schema
    echo.
) else (
    echo.
    echo ❌ Failed to install dependencies
    echo.
)

pause
