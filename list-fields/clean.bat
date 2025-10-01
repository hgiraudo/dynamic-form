@echo off
REM === Script para limpiar archivos generados ===

echo ========================================
echo Limpiando archivos generados
echo ========================================

if exist output.pdf (
    del output.pdf
    echo [OK] output.pdf eliminado
)

if exist fields_and_labels.json (
    del fields_and_labels.json
    echo [OK] fields_and_labels.json eliminado
)

if exist fields_example.json (
    del fields_example.json
    echo [OK] fields_example.json eliminado
)

if exist unfilled_fields.log (
    del unfilled_fields.log
    echo [OK] unfilled_fields.log eliminado
)

REM Archivos antiguos (por si existen)
if exist combined.json (
    del combined.json
    echo [OK] combined.json eliminado
)

if exist input-modified.pdf (
    del input-modified.pdf
    echo [OK] input-modified.pdf eliminado
)

if exist field_verification.log (
    del field_verification.log
    echo [OK] field_verification.log eliminado
)

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
