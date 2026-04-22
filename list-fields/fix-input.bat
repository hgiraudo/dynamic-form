@echo off
REM === Repara input.pdf y genera input-fixed.pdf ===
REM Corrige Rects invertidos, elimina APs viejos, activa NeedAppearances

echo ========================================
echo Reparando input.pdf
echo ========================================

python fix-input.py input.pdf input-fixed.pdf
IF ERRORLEVEL 1 (
    echo Error al reparar el PDF
    pause
    exit /b 1
)

echo.
echo ========================================
echo PDF reparado: input-fixed.pdf
echo Ahora ejecuta list-fields.bat con input-fixed.pdf como entrada
echo ========================================
pause
