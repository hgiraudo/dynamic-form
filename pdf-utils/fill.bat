@echo off
REM === Extrae campos, genera JSON y llena todos los PDF (excluye *-output.pdf) ===

setlocal enabledelayedexpansion

set FOUND=0

for %%F in (*.pdf) do (
    set "NAME=%%~nF"
    REM Saltar archivos que terminan en -output
    if /i not "!NAME:~-7!"=="-output" (
        set FOUND=1
        echo ========================================
        echo Procesando: %%F
        echo ========================================
        python fill.py "%%F"
        IF ERRORLEVEL 1 (
            echo Error al procesar %%F
        ) ELSE (
            echo Completado: %%~nF-output.pdf
        )
        echo.
    )
)

if !FOUND!==0 (
    echo No se encontraron archivos PDF para procesar.
)

echo ========================================
echo Listo.
echo ========================================
pause
