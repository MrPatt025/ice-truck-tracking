@echo off
echo 📱 Ice Truck Mobile App - Development Server
echo ==========================================

echo 🔍 Checking dependencies...
call npm list --depth=0 > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Dependencies not installed. Running npm install...
    call npm install
)

echo ✅ Dependencies OK

echo 🧪 Running TypeScript check...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ❌ TypeScript errors found
    pause
    exit /b 1
)

echo ✅ TypeScript OK

echo 🚀 Starting Expo development server...
echo.
echo 📱 Scan QR code with Expo Go app to test on device
echo 🌐 Or press 'w' to open in web browser
echo.

call npx expo start

pause