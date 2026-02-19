@echo off
title Oderwall POS - Local Server
if not exist node_modules (
    echo Installing dependencies for the first time...
    call npm install
)
echo.
echo ============================
echo  Oderwall POS Server
echo ============================
echo  POS Screen   : http://localhost:8080
echo  Kitchen Screen: http://localhost:8080/kitchen.html
echo  Customer Screen: http://localhost:8080/customer.html
echo ============================
echo.
node server.js
pause
