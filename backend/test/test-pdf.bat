curl -X POST http://localhost:4000/api/fill-pdf   -F "pdf=@formulario.pdf"   -F "json=@datos.json"   -F "responseType=pdf"   -o formulario_completado.pdf


