# Frontend · React y Vite

Guía para levantar la web en local y conectarla con la API FastAPI. La configuración Docker Compose vive en el repositorio [backend](https://github.com/UB-ES-F4-2026/backend) y arranca también PostgreSQL y pgAdmin.

## 1. Requisitos

- Git.
- Docker Desktop abierto con contenedores Linux, o Docker Engine en Linux.
- Docker Compose 2.32 o posterior: `docker compose version`.

Para trabajar con Docker no necesitas instalar Node, Python ni PostgreSQL en tu ordenador.

## 2. Preparar los repositorios

Si todavía no los tienes, clona ambos desde la carpeta donde guardas tus proyectos:

```bash
git clone https://github.com/UB-ES-F4-2026/backend.git
git clone https://github.com/UB-ES-F4-2026/frontend.git
```

Deben quedar como carpetas hermanas:

```text
GitHub/
├── backend/       ← contiene compose.yaml
└── frontend/      ← este repositorio
```

Si ya los tienes, no vuelvas a clonarlos.

## 3. Levantar todos los servicios

Si tu terminal está en `frontend`, entra en la carpeta del backend y arranca el conjunto:

```bash
cd ../backend
docker compose up --build --wait
```

**Los demás comandos Docker Compose de esta guía también se ejecutan desde backend.**

Este comando construye y arranca React, FastAPI, PostgreSQL y pgAdmin. Espera a que estén saludables y los deja en segundo plano. El backend se conecta a la base de datos y aplica sus migraciones automáticamente.

Abre http://localhost:5173. La pantalla inicial debe mostrar **Conexión correcta con el backend**.

Para comprobar toda la comunicación desde el frontend, abre http://localhost:5173/api/health. Debe devolver:

```json
{"status":"ok","service":"backend","database":"ok"}
```

Esta respuesta confirma que la petición llega a la API y que la API puede consultar PostgreSQL.

## 4. Configurar puertos o rutas

La configuración del conjunto se hace en `backend/.env`. No necesitas crearlo para usar los valores predeterminados. Si necesitas personalizarlos, copia `backend/.env.example` a `backend/.env` sin sobrescribir uno existente.

| Variable | Valor predeterminado | Qué cambia |
|---|---|---|
| `FRONTEND_PATH` | `../frontend` | Ubicación del código, relativa a backend |
| `FRONTEND_PORT` | `5173` | Puerto de la web en el navegador |
| `BACKEND_PORT` | `8000` | Acceso directo a la API desde el ordenador |
| `POSTGRES_PORT` | `5433` | Acceso directo a PostgreSQL desde el ordenador |
| `PGADMIN_PORT` | `5050` | Acceso a pgAdmin |

Si el 8000 está ocupado, por ejemplo, puedes poner `BACKEND_PORT=8001`. La web seguirá conectándose sin modificar su código. Si cambias `FRONTEND_PORT`, usa ese puerto en la URL del navegador.

Tras editar la configuración, vuelve a ejecutar:

```bash
docker compose up --build --wait
```

## 5. Desarrollar con recarga automática

Para arrancar y ver los cambios al guardar archivos:

```bash
docker compose up --build --watch
```

Si los servicios ya están arrancados en segundo plano, ejecuta en otra terminal situada en backend:

```bash
docker compose watch
```

Edita los archivos de `frontend/src/`: Compose los sincroniza y Vite actualiza la web. También se sincroniza `index.html`. Los cambios en `vite.config.js` reinician el frontend, y los de dependencias o Dockerfile reconstruyen su imagen.

Si añades carpetas de recursos como `public/`, añade su regla de sincronización en `backend/compose.yaml`. Sin Watch activo, aplica los cambios con `docker compose up --build --wait`.

## 6. Cómo comunicarse con la API

Usa rutas relativas en el código de React:

```javascript
const response = await fetch('/api/health');
const data = await response.json();
```

El recorrido es:

```text
Navegador → React/Vite → FastAPI → PostgreSQL
                 /api → backend:8000 → db:5432
```

`vite.config.js` redirige `/api` sin eliminar ese prefijo. Compose configura el destino como `http://backend:8000`. Ese nombre solo funciona dentro de Docker: no lo uses como URL de `fetch` en el navegador.

React no se conecta directamente a PostgreSQL. El frontend no necesita las credenciales de la base de datos; las operaciones pasan por la API. Las variables `VITE_*` son públicas para el navegador: no incluyas contraseñas ni claves privadas.

## 7. Estado, logs, compilación y parada

Desde backend:

```bash
# Estado de los servicios
docker compose ps

# Seguir los logs del frontend y la API
docker compose logs -f frontend backend

# Comprobar que React compila
docker compose exec frontend npm run build

# Parar solo la web
docker compose stop frontend

# Volver a arrancarla y esperar a que esté saludable
docker compose up --build --wait frontend

# Parar todo, conservando los datos de PostgreSQL y pgAdmin
docker compose down
```

No uses `docker compose down -v` si quieres conservar los datos: elimina los volúmenes.

La compilación genera `dist/` dentro del contenedor. El proxy de Vite es de desarrollo; un despliegue de los archivos estáticos en producción requiere configurar su servidor y el enrutamiento de `/api`.

## 8. Organización del frontend

| Archivo | Función |
|---|---|
| `src/main.jsx` | Pantalla inicial y comprobación de conexión |
| `src/style.css` | Estilos |
| `index.html` | Página de entrada |
| `vite.config.js` | Integración React y proxy de la API |
| `Dockerfile` | Entorno Node de desarrollo |
| `package.json` | Dependencias y comandos |
| `package-lock.json` | Versiones resueltas para `npm ci` |

Conserva `package-lock.json` en Git y actualízalo junto a `package.json` cuando cambien las dependencias. La instalación se realiza durante la construcción de la imagen.

## Problemas frecuentes

| Problema | Qué revisar |
|---|---|
| No se encuentra compose.yaml | Ejecuta los comandos desde `backend` |
| No se encuentra frontend al construir | Revisa la estructura de carpetas y `FRONTEND_PATH` |
| La web no abre | Comprueba Docker, `docker compose ps` y el valor de `FRONTEND_PORT` |
| Aparece un error de conexión con la API | Consulta `docker compose logs backend db frontend` |
| Puerto ocupado | Cambia el puerto publicado en `backend/.env` |
| No se ven los cambios | Activa Watch o reconstruye la imagen |
| La API funciona pero faltan tablas | El equipo de backend debe añadir/aplicar la migración correspondiente |

El acceso a pgAdmin, las credenciales locales y el flujo de migraciones están documentados en el [README de backend](https://github.com/UB-ES-F4-2026/backend#readme).
