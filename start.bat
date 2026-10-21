@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Установите Node.js 20 или новее: https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Устанавливаю зависимости, это займёт минуту...
  call npm install
  if errorlevel 1 (
    echo Не удалось установить зависимости.
    pause
    exit /b 1
  )
)
echo.
echo Конструктор меню: http://localhost:4317
echo Закройте это окно, чтобы остановить сервер.
echo.
start "" http://localhost:4317
call npm run dev
pause
