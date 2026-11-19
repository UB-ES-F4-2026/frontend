# Rol Frontend

Implementes pàgines, components, stores i crides a l'API seguint [product.md](product.md) i els patrons que ja hi ha a `src/`. Una pantalla nova s'assembla a les existents: mateixos components, mateix flux d'estat, mateixos textos d'error.

## Procediment

1. **Llegeix la issue** (`gh issue view <n> -R UB-ES-F4-2026/frontend`). Extreu els criteris d'acceptació: cada un acabarà cobert per un test o per una comprovació descrita al PR. Si un criteri és ambigu, tria la interpretació més conservadora i deixa-la escrita al PR.
2. **Comprova el contracte de l'API** abans d'escriure tipus: rutes i esquemes a `../backend/app/api/routes/` i `../backend/app/schemas/`, o `http://localhost:8000/api/docs` amb l'entorn en marxa. Si el backend encara no exposa el que la issue necessita, obre o enllaça la issue al repositori backend i deixa el tipus preparat segons l'esquema previst.
3. **Localitza el codi afectat** amb el mapa de sota i llegeix els fitxers que tocaràs i els tests que els cobreixen.
4. **Implementa** seguint les convencions i `product.md`.
5. **Escriu o amplia tests** a `tests/` per a cada criteri: comportament visible, estats de càrrega, error i buit.
6. **Valida** amb les ordres de la secció final, i comprova la pantalla al navegador en amplada mòbil i d'escriptori.
7. **Entrega**: PR cap a `main` amb `Closes #n`, captures de mòbil i escriptori si hi ha canvi visual, i les decisions preses sobre criteris ambigus.

## Mapa del codi

| Què | On |
|---|---|
| Arrencada, `BrowserRouter`, estils globals | `src/main.tsx`, `src/styles.css` |
| Rutes de l'aplicació (`Routes`) | `src/app/App.tsx` |
| Pàgines, una carpeta per àrea (`auth/`, `home/`, `opportunities/`) | `src/pages/` |
| Components compartits entre pàgines | `src/components/` |
| Stores Zustand, un per domini (`useAuthStore`, `useOpportunityStore`) | `src/store/` |
| Client HTTP: `fintechGet`, `fintechPost`, …, `ApiError`, `RequestStatus` | `src/service/api.ts` |
| Tests Vitest + React Testing Library, `setup.ts` | `tests/` |

## Convencions

### Components i estils

- HeroUI primer (`Card`, `Button`, `TextField`, `Alert`, `Spinner`, `Chip`, …); Tailwind per a disposició, espaiat i responsive. Un component propi només quan HeroUI no cobreix el cas.
- Els colors semàntics de HeroUI són el sistema de tokens: l'acció principal usa `warning` (ambre), el text `foreground`/`muted`, les superfícies `background`. Cap color hexadecimal al JSX.
- Components de funció amb `export default`, un per fitxer, nom en PascalCase igual que el fitxer. Comentaris curts en català que expliquen el perquè.
- Mobile-first: la classe base és la de mòbil, els breakpoints (`sm:`, `lg:`) amplien. Contenidor `mx-auto max-w-7xl px-6`.
- Semàntica i accessibilitat: `<main>`, `<nav aria-label>`, etiquetes associades als camps, `aria-busy` mentre s'envia, `role="status"` per a confirmacions, `motion-reduce:` en animacions.

### Estat i dades

- Estat local amb `useState` per a formularis i interacció; Zustand quan diverses pàgines comparteixen dades. Un store exposa `status` (`"idle" | "loading" | "success" | "error"`), `details` (missatge per a l'usuari) i accions `async` que mai llancen: retornen dades o `null`.
- El store tradueix `ApiError.status` a un missatge d'usuari concret (401, 409, 422) i deixa un genèric per a la resta. Les pàgines mostren `details`; no interpreten codis HTTP.
- Els tipus del store copien els camps de l'esquema del backend en `snake_case`. Els imports i les peticions duplicades mentre `status === "loading"` es bloquegen al store.
- Diners: el backend envia cèntims; formata amb `Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })` com a `OpportunityCard`. Dates ISO amb zona horària.

### Formularis

- Camps controlats, `onSubmit` amb `preventDefault`, bloqueig mentre s'envia.
- Validació local que replica la del backend (correu vàlid, contrasenya entre 8 caràcters i 72 bytes) com a ajuda; el backend torna a validar. Els errors s'associen al camp o es mostren en un `Alert` sota el formulari.

### Textos

- Idioma de la interfície: el text actual és en castellà; `product.md` fixa el català com a idioma per defecte. Fins que l'equip no decideixi la migració, un canvi segueix l'idioma de la pantalla que toca i mai en barreja dos a la mateixa vista.
- To concret i professional, sense prometre rendiments ni seguretat (vegeu `product.md`).

### Tests

- Un fitxer per pàgina, component o store a `tests/`, sufix `.test.tsx` o `.test.ts`. Patró de `tests/Login.test.tsx`: estat del store amb `vi.hoisted`, `vi.mock` del mòdul del store, `MemoryRouter` amb rutes simulades per comprovar redireccions, `userEvent` per a la interacció, `beforeEach` que reinicia l'estat.
- Els tests d'un store simulen `src/service/api.ts`, mai el `fetch` global ni un backend real.
- Es comprova el comportament visible (`getByRole`, `getByLabelText`, `findByText`), no la implementació.

## Validació

Des de `frontend`, amb Node:

```bash
npm ci
npm test
npm run build
npx tsc -p tests/tsconfig.json
```

Sense Node, des de `../backend`: `docker compose build frontend` i `docker compose run --rm --no-deps frontend npm test`.

Comprovació manual amb tot l'entorn: des de `../backend`, `docker compose up --build --watch` i obre `http://localhost:5173` a amplada mòbil i d'escriptori.

Fet vol dir: les quatre ordres acaben sense errors, cada criteri de la issue té test o comprovació descrita, i la pantalla funciona a mòbil i escriptori amb els estats de càrrega, error i buit visibles.
