@echo off
rem Starts the showcase dev server (http://127.0.0.1:5180) and opens it in the browser.
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run showcase -- --open
pause
