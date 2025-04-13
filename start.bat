@echo off
REM Script para iniciar los servidores de desarrollo Frontend y Backend
setlocal

ECHO ===============================
ECHO == Iniciando la Aplicación ==
ECHO ===============================
ECHO.

REM --- Iniciar Frontend ---
ECHO [*] Iniciando Frontend (npm run dev) en una NUEVA ventana...
IF NOT EXIST "%~dp0Frontend\package.json" (
    ECHO [X] ERROR: No se encontró package.json en la carpeta Frontend.
    goto :error_exit
)
START "Frontend (npm run dev)" /D "%~dp0Frontend" cmd /k "npm run dev"
ECHO [*] Servidor Frontend iniciado en la nueva ventana.
ECHO.

REM --- Iniciar Backend ---
ECHO [*] Iniciando Backend (uvicorn) en ESTA ventana...
IF NOT EXIST "%~dp0Backend\Pipfile" (
    ECHO [X] ERROR: No se encontró Pipfile en la carpeta Backend.
    goto :error_exit
)

ECHO [*] Cambiando al directorio Backend...
cd /D "%~dp0Backend"
if %errorlevel% neq 0 (
    ECHO [X] ERROR: No se pudo cambiar al directorio Backend.
    goto :error_exit
)

ECHO [*] Ejecutando: pipenv run uvicorn main:app --reload
ECHO [*] (Pulsa Ctrl+C para detener el servidor Backend)
pipenv run uvicorn main:app --reload

ECHO.
ECHO [!] El servidor Backend ha terminado.
goto :eof


:error_exit
ECHO.
ECHO ===========================
ECHO == Error al iniciar ==
ECHO ===========================
ECHO Por favor, revisa los mensajes de error anteriores.
pause
goto :eof

:eof
endlocal
