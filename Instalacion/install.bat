@echo off
REM Cambia la página de códigos de la consola a UTF-8 para mostrar acentos correctamente
chcp 65001 > nul
setlocal  REM <-- Usando setlocal simple
set "PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin"

REM =====================================================================
REM == Script de Instalación de Proyecto para Windows                  ==
REM == (v5: Rutas relativas ajustadas para script en subcarpeta)       ==
REM == !! ADVERTENCIA: El script principal NO ESPERA a las installs !! ==
REM =====================================================================

REM --- Definiciones de Variables ---
REM ** NOTA: %~dp0 ahora es la carpeta 'Instalacion' donde reside este script **
SET "SQL_SCRIPT_NAME=setup_db.sql"
SET "DB_NAME=pimpoyo_db"
SET "DB_USER=laydatfm"
SET "DB_PASS=Pimpoyo7+"
SET "PYTHON_MISSING_MSG=ERROR: No se encontró Python o Pip en el PATH. Por favor, instala Python (https://www.python.org/) y asegúrate de que esté añadido a tu PATH."
SET "NODE_MISSING_MSG=ERROR: No se encontró npm en el PATH. Por favor, instala Node.js (https://nodejs.org/) y asegúrate de que esté añadido a tu PATH."
SET "POSTGRES_MISSING_MSG=ERROR: psql (PostgreSQL client) no encontrado en PATH. Instala PostgreSQL (postgresql.org) y añade su 'bin' dir al PATH."
SET "PIPENV_INSTALL_FAIL_MSG=ERROR: Falló la instalación de pipenv."
SET "PIPENV_MISSING_MSG=ERROR: Comando pipenv no encontrado después del intento de instalación."
SET "SQL_SCRIPT_MISSING_MSG=ERROR: Script de configuración de base de datos '%SQL_SCRIPT_NAME%' no encontrado en %~dp0"

ECHO ===============================================================
ECHO == Iniciando Instalación del Proyecto (con installs separadas) ==
ECHO == Script ejecutado desde: %~dp0                               ==
ECHO ===============================================================
ECHO.

REM --- Pasos 1 y 2 (Python/Pip, Pipenv) sin cambios funcionales ---
ECHO [1] Comprobando Python y Pip...
where python >nul 2>nul & if errorlevel 1 goto CheckFailed_START_v5
where pip >nul 2>nul & if errorlevel 1 goto CheckFailed_START_v5
ECHO [V] Python y Pip encontrados.
:PipenvCheck_START_v5
ECHO.
ECHO [2] Comprobando Pipenv...
where pipenv >nul 2>nul
if %errorlevel% == 0 goto PipenvFound_START_v5
ECHO [!] Pipenv no encontrado... Instalando...
pip install pipenv
if errorlevel 1 goto PipenvInstallFailed_START_v5
where pipenv >nul 2>nul
if errorlevel 1 goto PipenvStillMissing_START_v5
ECHO [V] Pipenv encontrado después de la instalación.
goto LaunchBackendInstall_START_v5
:PipenvInstallFailed_START_v5
ECHO %PIPENV_INSTALL_FAIL_MSG% & goto :error_exit_final_START_v5
:PipenvStillMissing_START_v5
ECHO %PIPENV_MISSING_MSG% & ECHO [!] Reinicia terminal? & goto :error_exit_final_START_v5
:PipenvFound_START_v5
ECHO [V] Pipenv encontrado.

REM --- Pasos 3 y 5 (Lanzar Installs) con rutas corregidas ---
:LaunchBackendInstall_START_v5
ECHO.
ECHO [3] Lanzando instalación Backend (Pipenv) en una NUEVA ventana (se cerrará sola)...
REM *** CORREGIDO: Usar ruta relativa ..\Backend ***
IF NOT EXIST "%~dp0..\Backend\Pipfile" goto BackendPipfileMissing_START_v5
START "Instalación Backend (Pipenv)" /D "%~dp0..\Backend" cmd /c "echo Ejecutando pipenv install en %~dp0..\Backend ... & pipenv install & echo. & echo *** Instalación Backend Finalizada. Cerrando... ***"
ECHO [*] Instalación Backend iniciada en ventana separada.
:NpmCheck_START_v5
ECHO.
ECHO [4] Comprobando Node.js y npm...
where npm >nul 2>nul & if errorlevel 1 goto NpmCheckFailed_START_v5
ECHO [V] npm encontrado.
:LaunchFrontendInstall_START_v5
ECHO.
ECHO [5] Lanzando instalación Frontend (npm) en una NUEVA ventana (se cerrará sola)...
REM *** CORREGIDO: Usar ruta relativa ..\Frontend ***
IF NOT EXIST "%~dp0..\Frontend\package.json" goto FrontendPackageMissing_START_v5
START "Instalación Frontend (npm)" /D "%~dp0..\Frontend" cmd /c "echo Ejecutando npm install en %~dp0..\Frontend ... & npm install & echo. & echo *** Instalación Frontend Finalizada. Cerrando... ***"
ECHO [*] Instalación Frontend iniciada en ventana separada.
goto PsqlCheck_START_v5

REM --- Bloques de Error para Pasos 1-5 ---
:CheckFailed_START_v5
ECHO %PYTHON_MISSING_MSG% & goto :error_exit_final_START_v5
:BackendPipfileMissing_START_v5
ECHO [X] ERROR: Pipfile no encontrado en %~dp0..\Backend\ & goto :error_exit_final_START_v5
:NpmCheckFailed_START_v5
ECHO %NODE_MISSING_MSG% & goto :error_exit_final_START_v5
:FrontendPackageMissing_START_v5
ECHO [X] ERROR: Frontend\package.json no encontrado en %~dp0..\Frontend\ & goto :error_exit_final_START_v5

:PsqlCheck_START_v5
ECHO.
ECHO ======================================================================
ECHO == ATENCION: Continuando con los pasos de PostgreSQL AHORA MISMO.   ==
ECHO ======================================================================
ECHO.
REM --- 6. Comprobar PostgreSQL ---
ECHO [6] Comprobando PostgreSQL (comando psql)...
where psql >nul 2>nul
if %errorlevel% neq 0 goto PsqlCheckFailed_START_v5
ECHO [V] Comando psql encontrado.
goto DbSetup_START_v5

:PsqlCheckFailed_START_v5
ECHO %POSTGRES_MISSING_MSG%
goto :error_exit_final_START_v5

:DbSetup_START_v5
ECHO.
REM --- 7. Configurar Base de Datos y Usuario PostgreSQL ---
ECHO [7] Configurando Base de Datos y Usuario PostgreSQL...
ECHO [*]   Base de Datos: %DB_NAME%
ECHO [*]   Usuario:       %DB_USER%
ECHO [!] IMPORTANTE: Se te pedirá la contraseña para el usuario administrativo de PostgreSQL (ej. 'postgres').
set /p PG_ADMIN_PASS="Introduce la contraseña para el usuario administrador de PostgreSQL (ej. postgres): "
if "%PG_ADMIN_PASS%"=="" ( ECHO [X] ERROR: La contraseña de admin no puede estar vacía. & goto :error_exit_final_START_v5 )

ECHO [*] Conectando como admin para verificar/configurar DB y permisos...
SET PGPASSWORD=%PG_ADMIN_PASS%

REM --- Asegurar que el usuario laydatfm existe ---
psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='%DB_USER%'" | findstr "1" > nul
if %errorlevel% == 0 goto DbUserExists_START_v5
ECHO [*] El usuario '%DB_USER%' no existe. Creando...
psql -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASS%';"
if %errorlevel% neq 0 goto DbCreateUserFailed_START_v5
ECHO [V] Usuario '%DB_USER%' creado.
goto DbCheckDatabase_START_v5
:DbUserExists_START_v5
ECHO [*] El usuario '%DB_USER%' ya existe.

REM --- Asegurar que la base de datos existe y laydatfm es dueño ---
:DbCheckDatabase_START_v5
psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" | findstr "1" > nul
if %errorlevel% == 0 goto DbCheckOwner_START_v5
ECHO [*] La base de datos '%DB_NAME%' no existe. Creando con owner '%DB_USER%'...
psql -U postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;"
if %errorlevel% neq 0 goto DbCreateDatabaseFailed_START_v5
ECHO [V] Base de datos '%DB_NAME%' creada.
goto DbGrantSchemaPerms_START_v5
:DbCheckOwner_START_v5
ECHO [*] La base de datos '%DB_NAME%' ya existe. Verificando dueño...
psql -U postgres -d %DB_NAME% -tAc "SELECT 1 FROM pg_database WHERE datname = '%DB_NAME%' AND pg_get_userbyid(datdba) = '%DB_USER%';" | findstr "1" > nul
if %errorlevel% == 0 goto DbGrantSchemaPerms_START_v5
ECHO [*] Dueño incorrecto. Cambiando dueño de la BD a '%DB_USER%'...
psql -U postgres -c "ALTER DATABASE %DB_NAME% OWNER TO %DB_USER%;"
if %errorlevel% neq 0 goto DbAlterOwnerFailed_START_v5
ECHO [V] Dueño de la BD cambiado a '%DB_USER%'.

REM --- Asegurar permisos CREATE en schema public para laydatfm ---
:DbGrantSchemaPerms_START_v5
ECHO [*] Otorgando permiso CREATE en schema public a '%DB_USER%'...
psql -U postgres -d %DB_NAME% -c "GRANT CREATE ON SCHEMA public TO %DB_USER%;"
if %errorlevel% neq 0 goto DbGrantPermsFailed_START_v5
ECHO [V] Permiso CREATE otorgado.

SET PGPASSWORD=
ECHO [V] Configuración de usuario y base de datos PostgreSQL completada.
goto RunSqlScript_START_v5

REM --- Bloques de Error para Paso 7 ---
:DbCreateUserFailed_START_v5
ECHO [X] ERROR: Falló la creación del usuario PostgreSQL '%DB_USER%'. Comprueba pass/permisos. Errorlevel: %errorlevel% & SET PGPASSWORD= & goto :error_exit_final_START_v5
:DbCreateDatabaseFailed_START_v5
ECHO [X] ERROR: Falló la creación de la base de datos PostgreSQL '%DB_NAME%'. Errorlevel: %errorlevel% & SET PGPASSWORD= & goto :error_exit_final_START_v5
:DbAlterOwnerFailed_START_v5
ECHO [X] ERROR: Falló el cambio de dueño de la base de datos '%DB_NAME%'. Errorlevel: %errorlevel% & SET PGPASSWORD= & goto :error_exit_final_START_v5
:DbGrantPermsFailed_START_v5
ECHO [X] ERROR: Falló el otorgar permiso CREATE en schema public a '%DB_USER%'. Errorlevel: %errorlevel% & SET PGPASSWORD= & goto :error_exit_final_START_v5


:RunSqlScript_START_v5
ECHO.
REM --- 8. Ejecutar Script SQL del Esquema ---
ECHO [8] Ejecutando script de configuración del esquema (%SQL_SCRIPT_NAME%)...
REM *** CORREGIDO: Usar ruta desde la carpeta del script ***
IF NOT EXIST "%~dp0%SQL_SCRIPT_NAME%" goto SqlScriptMissing_START_v5
ECHO [*] Ejecutando script SQL como '%DB_USER%' en '%DB_NAME%' (con ON_ERROR_STOP)...
SET PGPASSWORD=%DB_PASS%
psql -U %DB_USER% -d %DB_NAME% -a -f "%~dp0%SQL_SCRIPT_NAME%" -v ON_ERROR_STOP=1
if %errorlevel% neq 0 goto SqlScriptFailed_START_v5
SET PGPASSWORD=
ECHO [V] Script de esquema de base de datos ejecutado correctamente.
ECHO.
goto CreateEnvFile_START_v5

:SqlScriptMissing_START_v5
ECHO %SQL_SCRIPT_MISSING_MSG% & goto :error_exit_final_START_v5
:SqlScriptFailed_START_v5
ECHO [X] ERROR: Falló la ejecución del script SQL '%SQL_SCRIPT_NAME%'. Revisa errores de SQL arriba. Errorlevel: %errorlevel%
SET PGPASSWORD=
goto :error_exit_final_START_v5


:CreateEnvFile_START_v5
ECHO.
REM --- 9. Crear archivo .env ---
ECHO [9] Creando archivo .env en la carpeta Backend...
REM *** CORREGIDO: Usar ruta relativa ..\Backend ***
SET "ENV_FILE_PATH=%~dp0..\Backend\.env"
ECHO [*] Escribiendo DATABASE_URL en %ENV_FILE_PATH% ...
echo DATABASE_URL=postgresql://%DB_USER%:%DB_PASS%@localhost:5432/%DB_NAME% > "%ENV_FILE_PATH%"
if %errorlevel% neq 0 goto EnvFileWriteError_START_v5
ECHO [*] Generando y escribiendo SECRET_KEY usando Python...
SET "SECRET_KEY_VALUE="
FOR /F "usebackq" %%G IN (`python -c "import sys; import secrets; sys.stdout.write(secrets.token_hex(32))"`) DO set "SECRET_KEY_VALUE=%%G"
if "%SECRET_KEY_VALUE%"=="" goto EnvFileSecretGenError_START_v5
echo SECRET_KEY=%SECRET_KEY_VALUE% >> "%ENV_FILE_PATH%"
if %errorlevel% neq 0 goto EnvFileWriteError_START_v5
ECHO [V] Archivo .env creado/actualizado exitosamente.
ECHO.
goto :success_exit_final_START_v5

:EnvFileWriteError_START_v5
ECHO [X] ERROR: No se pudo escribir en el archivo .env en "%ENV_FILE_PATH%". Verifica permisos. & goto :error_exit_final_START_v5
:EnvFileSecretGenError_START_v5
ECHO [X] ERROR: Falló la generación de SECRET_KEY usando 'python -c'. Asegúrate de que Python funciona.
ECHO [!] Escribiendo un valor temporal en .env - ¡DEBES CAMBIARLO MANUALMENTE!
echo SECRET_KEY=GENERAR_CLAVE_SECRETA_SEGURA_MANUALMENTE >> "%ENV_FILE_PATH%"
pause
goto :success_exit_final_START_v5 # Aún así terminamos "exitosamente", pero pausamos


:success_exit_final_START_v5
ECHO ===============================================================
ECHO == ¡Script Principal Completado!                             ==
ECHO ===============================================================
goto :eof

:error_exit_final_START_v5
ECHO.
ECHO ===============================================================
ECHO == ¡Instalación Fallida (en el script principal)!            ==
ECHO ===============================================================
ECHO Por favor, revisa los mensajes de error anteriores.
pause
goto :eof

:eof
endlocal
