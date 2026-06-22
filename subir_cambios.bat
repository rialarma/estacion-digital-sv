@echo off
echo ====================================================
echo    Subiendo cambios a GitHub y Vercel...
echo ====================================================

:: 1. Agrega todos los archivos modificados
git add .

:: 2. Crea el paquete de actualizacion con un mensaje estandar
git commit -m "Actualizacion rapida"

:: 3. Lo empuja a la nube (GitHub)
git push origin main

echo.
echo ====================================================
echo  ¡Listo! Los cambios fueron enviados a la nube.
echo  Vercel actualizara tu pagina web en aproximadamente 1 minuto.
echo ====================================================
pause
