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
