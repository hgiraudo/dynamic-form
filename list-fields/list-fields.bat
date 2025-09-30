@echo off
REM === Script para extraer campos y llenar PDF ===
REM Ajustá la ruta a python.exe si no está en el PATH

REM 1) Extraer campos y generar JSON
python list-fields.py input.pdf combined.json fields_example.json
IF ERRORLEVEL 1 (
    echo Error al extraer campos del PDF
    pause
    exit /b 1
)

REM 2) Llenar PDF usando fill.py del backend
python ..\backend\fill.py input.pdf fields_example.json output.pdf
IF ERRORLEVEL 1 (
    echo Error al llenar el PDF con los valores
    pause
    exit /b 1
)

echo PDF generado exitosamente: output.pdf
pause
