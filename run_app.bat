@echo off
echo Starting Oderwall (Static)...
echo.
echo Trying to start a local web server...
echo.
python -m http.server 8080
if %errorlevel% neq 0 (
    echo Python not found. Trying npx...
    call npx http-server -p 8080
)
echo.
echo If the server started, open: http://localhost:8080
pause
