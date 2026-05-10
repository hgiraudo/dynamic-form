@echo off
REM === Repara todos los PDF del directorio (excluye *-output.pdf y *-fixed.pdf) ===
REM Corrige Rects invertidos, elimina APs viejos, activa NeedAppearances

setlocal enabledelayedexpansion

set FOUND=0

for %%F in (*.pdf) do (
    set "NAME=%%~nF"
    REM Saltar archivos que terminan en -output o -fixed
    if /i not "!NAME:~-7!"=="-output" (
        if /i not "!NAME:~-6!"=="-fixed" (
            set FOUND=1
            echo ========================================
            echo Reparando: %%F
            echo ========================================
            python fix-input.py "%%F" "%%~nF-fixed.pdf" --auto
            IF ERRORLEVEL 1 (
                echo Error al reparar %%F
            ) ELSE (
                echo PDF reparado: %%~nF-fixed.pdf
            )
            echo.
        )
    )
)

if !FOUND!==0 (
    echo No se encontraron archivos PDF para reparar.
)

echo ========================================
echo Listo.
echo ========================================
pause
