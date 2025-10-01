@echo off
REM === Script para extraer campos, generar JSON y llenar PDF ===
REM Este script ejecuta todo el proceso automaticamente

echo ========================================
echo Procesando PDF con extraccion y llenado
echo ========================================

python list-fields.py
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
