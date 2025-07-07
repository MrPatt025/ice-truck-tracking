@echo off
echo 🚛❄️ Ice Truck Tracking System - Professional Start
echo ================================================

echo 📋 Checking prerequisites...
where docker >nul 2>&1 || (echo ❌ Docker not found & pause & exit /b 1)
where node >nul 2>&1 || (echo ❌ Node.js not found & pause & exit /b 1)

echo ✅ Prerequisites OK
echo.

echo 🐳 Starting Docker services...
docker-compose up -d

echo ⏳ Waiting for services to initialize...
timeout /t 20 /nobreak > nul

echo 🏥 Health check...
curl -s http://localhost:5000/api/health >nul 2>&1 && echo ✅ Backend API: Ready || echo ⚠️ Backend API: Starting
curl -s http://localhost:3000 >nul 2>&1 && echo ✅ Dashboard: Ready || echo ⚠️ Dashboard: Starting

echo.
echo 🎯 System Status: RUNNING
echo ================================================
echo 📊 Access Points:
echo   🖥️  Dashboard: http://localhost:3000
echo   🔧 API Server: http://localhost:5000
echo   📚 API Docs: http://localhost:5000/api-docs
echo.
echo 🛠️  Development:
echo   Backend: cd api && npm run dev
echo   Frontend: cd web && npm run dev
echo   Mobile: cd mobile && npm start
echo.
echo 🐳 Docker Commands:
echo   Stop: docker-compose down
echo   Logs: docker-compose logs -f
echo   Rebuild: docker-compose build
echo.
pause