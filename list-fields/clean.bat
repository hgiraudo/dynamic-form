@echo off
REM === Script para limpiar archivos generados ===
REM Elimina todos los archivos generados por list-fields.py

echo ========================================
echo Limpiando archivos generados
echo ========================================

REM Archivos generados por list-fields.py
if exist input-modified.pdf (
    del input-modified.pdf
    echo [OK] input-modified.pdf eliminado
)

if exist output.pdf (
    del output.pdf
    echo [OK] output.pdf eliminado
)

if exist combined.json (
    del combined.json
    echo [OK] combined.json eliminado
)

if exist fields_example.json (
    del fields_example.json
    echo [OK] fields_example.json eliminado
)

if exist field_verification.log (
    del field_verification.log
    echo [OK] field_verification.log eliminado
)

REM Archivos de prueba
if exist test-output.pdf (
    del test-output.pdf
    echo [OK] test-output.pdf eliminado
)

if exist test-flattened.pdf (
    del test-flattened.pdf
    echo [OK] test-flattened.pdf eliminado
)

if exist *.temp.pdf (
    del *.temp.pdf
    echo [OK] Archivos temporales eliminados
)

echo.
echo ========================================
echo Limpieza completada
echo ========================================
pause
