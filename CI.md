# CI del frontend

GitHub Actions se ejecuta en cada push y en cada PR a `main`. Construye la imagen Docker y, dentro de ella, ejecuta ESLint, la comprobación de tipos, la compilación con Vite y los tests. Si cualquiera falla, falla «Frontend required checks» y no se puede fusionar a `main`. Los resultados se ven en la pestaña Actions.

## En local con Node

Desde `frontend`:

```bash
npm ci
npm run lint        # ESLint: reglas recomendadas de JS, TypeScript y React Hooks
npm run typecheck   # tsc --noEmit con tsconfig.json (src/ y tests/)
npm test
npm run build
```

`npx eslint . --fix` corrige automáticamente lo que se pueda.

## En local con Docker

Abre Docker Desktop y ejecuta desde `frontend`:

```bash
docker build --tag frontend-ci .
docker run --rm frontend-ci npm run lint
docker run --rm frontend-ci npm run typecheck
docker run --rm frontend-ci npm run build
docker run --rm frontend-ci npm test
```

Al terminar, puedes borrar la imagen de prueba:

```bash
docker image rm frontend-ci
```

## TypeScript 7 y ESLint

TypeScript 7.0 aún no tiene API de JavaScript, y `typescript-eslint` la necesita para leer el código. Por eso `package.json` instala las dos versiones, como recomienda el [anuncio de TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/):

```json
"@typescript/native": "npm:typescript@^7.0.2",
"typescript": "npm:@typescript/typescript6@^6.0.2"
```

- `tsc` (y `npm run typecheck`) es TypeScript 7.
- ESLint importa `typescript`, que es la API de TypeScript 6. Solo la usa para leer la sintaxis: no hay reglas que comprueben tipos.

Cuando `typescript-eslint` admita TypeScript 7 ([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)), se quitan los alias y queda `"typescript": "^7.x"`.
