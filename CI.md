# CI del frontend

GitHub Actions construye la imagen Docker y compila el frontend con Vite en cada push y PR a `main`. Los resultados se ven en la pestaña Actions.

Para probarlo en local, abre Docker Desktop y ejecuta desde `frontend`:

```bash
docker build --tag frontend-ci .
docker run --rm frontend-ci npm run build
```

Al terminar, puedes borrar la imagen de prueba:

```bash
docker image rm frontend-ci
```

Esto comprueba la compilación; no ejecuta tests de las funcionalidades.
