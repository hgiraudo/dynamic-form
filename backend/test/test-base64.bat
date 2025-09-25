curl -X POST http://localhost:4000/api/fill-pdf   -F "pdf=@formulario.pdf"   -F "json=@datos.json"   -F "responseType=base64"   -o formulario_completado.base64.txt


