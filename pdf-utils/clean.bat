@echo off
REM === Limpia todos los archivos generados por list-fields.py ===

echo ========================================
echo Limpiando archivos generados
echo ========================================

set COUNT=0

for %%F in (*-output.pdf) do (
    del "%%F"
    echo [OK] %%F eliminado
    set /a COUNT+=1
)

for %%F in (*.json) do (
    del "%%F"
    echo [OK] %%F eliminado
    set /a COUNT+=1
)

for %%F in (*.log) do (
    del "%%F"
    echo [OK] %%F eliminado
    set /a COUNT+=1
)

echo.
echo %COUNT% archivo(s) eliminado(s)
echo ========================================
