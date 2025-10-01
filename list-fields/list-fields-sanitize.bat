@echo off
REM === Script para listar campos CON modificacion de nombres ===
REM Los nombres de campos se sanitizan (sin caracteres especiales)

echo ========================================
echo Listando campos CON sanitizacion de nombres
echo ========================================

python list-fields.py true
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
echo - input-modified.pdf (nombres sanitizados)
echo - output.pdf (PDF con valores de ejemplo)
echo - combined.json (informacion de campos)
echo - fields_example.json (valores de ejemplo)
echo - field_verification.log (log de verificacion)
echo ========================================
pause
