@echo off
cd offline_version
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Starting Offline Server...
echo Access at http://localhost:8080
node server.js
pause
