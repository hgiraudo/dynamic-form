@echo off
REM === Script para listar campos SIN modificar nombres ===
REM Los nombres de campos originales se mantienen intactos

echo ========================================
echo Listando campos SIN sanitizar nombres
echo ========================================

python list-fields.py false
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
echo - input-modified.pdf (nombres originales)
echo - output.pdf (PDF con valores de ejemplo)
echo - combined.json (informacion de campos)
echo - fields_example.json (valores de ejemplo)
echo - field_verification.log (log de verificacion)
echo ========================================
pause
