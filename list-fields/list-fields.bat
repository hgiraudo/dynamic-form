@echo off
REM === Script para extraer campos, generar JSON y llenar PDF ===
REM Usa input-fixed.pdf si existe (reparado), si no usa input.pdf

echo ========================================
echo Procesando PDF con extraccion y llenado
echo ========================================

REM Usar input-fixed.pdf si existe, si no input.pdf
IF EXIST input-fixed.pdf (
    echo Usando: input-fixed.pdf
    python list-fields.py input-fixed.pdf
) ELSE (
    echo Usando: input.pdf  ^(ejecuta fix-input.bat para repararlo^)
    python list-fields.py input.pdf
)

IF ERRORLEVEL 1 (
    echo Error al procesar el PDF
    pause
    exit /b 1
)

echo.
echo ========================================
echo Proceso completado exitosamente
echo ========================================
echo Archivos generados:
echo - fields_and_labels.json (informacion completa de campos y etiquetas)
echo - fields_example.json (valores de ejemplo)
echo - output.pdf (PDF con valores de ejemplo)
echo - unfilled_fields.log (reporte de verificacion)
echo ========================================
pause
