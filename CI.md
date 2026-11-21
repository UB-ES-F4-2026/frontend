# CI del frontend

GitHub Actions se ejecuta en cada push y en cada PR a `main`. Construye la imagen Docker y, dentro de ella, ejecuta ESLint, la comprobación de tipos, la compilación con Vite y los tests. Si cualquiera falla, falla «Frontend required checks» y no se puede fusionar a `main`. Los resultados se ven en la pestaña Actions.

## Qué se ejecuta en cada fase

| Cuándo | Qué se ejecuta | ¿Impide fusionar? |
|---|---|---|
| Push a cualquier rama | ESLint, tipos, build y tests (`ci.yml`) | No: solo informa |
| Push a `release/*` o `hotfix/*` | Además, publica la imagen; desde `release/*` la despliega en staging | — |
| PR hacia `dev` o `release/*` | E2E de Playwright (`e2e-playwright.yml`) | No: la PR sale en rojo, pero `dev` y `release/*` no tienen checks obligatorios |
| PR hacia `main` | ESLint, tipos, build, tests, origen de la PR y E2E | Sí, «Frontend required checks» (todo menos los E2E). Los E2E salen en rojo si fallan, pero no son obligatorios |

- Los E2E usan el backend de la misma rama que el destino de la PR (`dev`, `release/x.y` o `main`). Si el backend no tiene esa rama, fallan con un mensaje que lo indica.
- A `main` solo se llega desde `release/*` o `hotfix/*`. Una PR de `dev` directamente a `main` falla: hay que crear `release/x.y` desde `dev`.
- Un hotfix sale de `main` y, después de fusionarlo, se lleva también a `dev` con una PR desde `hotfix/*`. Si no, la siguiente release lo desharía.
- Proteger `dev` y `release/*` con checks obligatorios requiere permisos de administrador del repositorio, que el equipo no tiene.

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

TypeScript 7.0 aún no tiene API de JavaScript, y `typescript-eslint` la necesita para leer el código. Por eso `package.json` instala las dos versiones con alias de npm, como recomienda el [anuncio de TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/):

```json
"typescript": "npm:@typescript/typescript6@^6.0.2",
"typescript7": "npm:typescript@^7.0.2"
```

- `npm run typecheck` ejecuta TypeScript 7 (`node_modules/typescript7/bin/tsc`). Usa este script y no `npx tsc`, que puede acabar ejecutando TypeScript 6.
- ESLint importa `typescript`, que es la API de TypeScript 6. Solo la usa para leer la sintaxis: no hay reglas que comprueben tipos.
- El anuncio llama al alias `@typescript/native`, pero con ese nombre `npm ci` falla en npm 10 (Node 22, la versión de la imagen Docker). Por eso se llama `typescript7`.

Cuando `typescript-eslint` admita TypeScript 7 ([typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)), se quitan los alias y queda `"typescript": "^7.x"`.
