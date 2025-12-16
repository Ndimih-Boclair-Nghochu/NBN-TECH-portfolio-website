@echo off
rem Start loop for Node server; will restart on exit
cd /d %~dp0
:loop
echo [%date% %time%] Starting node >> server-exit-debug.log
node index.js >> server-log-out.txt 2>> server-log-err.txt
set rc=%ERRORLEVEL%
echo [%date% %time%] Node exited with code=%rc% >> server-exit-debug.log
timeout /t 2 /nobreak >nul
goto loop
