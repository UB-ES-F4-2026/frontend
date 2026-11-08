# Maquetas HTML

Las páginas de este directorio son referencias de presentación con contenido en
español (`es`). `homepage.html` muestra la portada; `layout.html` es un esquema
estructural sin contenido de producto. Las demás páginas enlazan a la portada y
comparten la misma cabecera, los tokens y los estilos.

Los HTML utilizan utilidades Tailwind CSS 4. El archivo
`assets/mockups.tailwind.css` declara los tokens y las pocas reglas necesarias
para los controles nativos. `assets/mockups.generated.css` es el CSS compilado
para abrir las maquetas directamente desde el disco. Para regenerarlo con el
CLI de Tailwind 4, ejecuta desde la raíz del repositorio:

```sh
npm ci
npx --yes --package tailwindcss@4.3.3 --package @tailwindcss/cli@4.3.3 \
  tailwindcss -i docs/mockups/assets/mockups.tailwind.css \
  -o docs/mockups/assets/mockups.generated.css --minify
```

`assets/mockups.js` solo activa el menú móvil. Los formularios contienen
JavaScript mínimo de demostración y no envían datos.

`US01-8/tancar-sessio.html` muestra el menú de cuenta en escritorio y la acción
de cierre de sesión en el menú móvil. Los controles de la maqueta permiten
previsualizar el cierre correcto, un error de conexión y la sesión caducada.
Estos estados son simulaciones visuales; no se realizan llamadas al servidor.

`US02-2-1/detall.html` presenta un detalle inmobiliario de solo lectura, con
datos ficticios, dos imágenes ilustrativas con miniaturas, navegación circular y ampliación y las cuatro fechas del
proyecto de rehabilitación destinado al alquiler. El ejemplo no proporciona
coordenadas públicas y muestra «Mapa no disponible». No incluye acciones de
inversión. Reutiliza los estilos compilados y el menú compartido; el resto de
los estilos y la interacción de la galería están en el propio HTML.

El selector telefónico de `US01-6/registre.html` contiene nombres de países en
español y prefijos obtenidos de los [metadatos de libphonenumber-js](https://unpkg.com/libphonenumber-js/metadata.min.json).
Las opciones están incluidas en el HTML y no requieren una petición de red ni
una dependencia en tiempo de ejecución. La maqueta comprueba el formato y la
longitud descritos en US01.6; no verifica la existencia o titularidad del número.

`US02-3-1/oportunitats.html` integra el listado de US02.1 y la búsqueda de US02.3.1,
con tarjetas, cifras de financiación y búsqueda local interactiva mediante
`assets/opportunities.js`. Permite enviar con Enter, limpiar, validar la longitud,
consultar el estado sin coincidencias y restaurar la consulta con `q` y el historial.
Los 28 proyectos son ficticios; no se consulta una API. Hay 25 coincidencias para «solar»,
con páginas de 12, 12 y 1 resultados. Se simula la respuesta paginada del backend,
la carga, la normalización de `page`, el historial y el foco tras cambiar de página.
Solo el ejemplo inmobiliario original
enlaza al detalle disponible. Los errores de red quedan especificados
en la historia para la implementación.

Todas las cabeceras toman `US01-6/registre.html` como referencia: altura mínima
de 64 px, ancho máximo de 1120 px, márgenes de 24 px y posición sticky.
Los enlaces se adaptan a la ubicación de cada HTML y señalan la página actual.
La maqueta de cierre de sesión conserva sus controles de cuenta autenticada.
