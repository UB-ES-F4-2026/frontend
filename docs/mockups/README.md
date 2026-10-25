# Maquetes HTML

Les pàgines d'aquest directori són referències de presentació. `homepage.html`
mostra la portada; `layout.html` és un wireframe estructural sense contingut de
producte. Les altres pàgines enllacen a la portada i comparteixen la mateixa
capçalera, els tokens i els estils.

Els HTML fan servir utilitats Tailwind CSS 4. El fitxer
`assets/mockups.tailwind.css` declara els tokens i les poques regles necessàries
per als controls nadius. `assets/mockups.generated.css` és el CSS compilat perquè
les maquetes es puguin obrir directament des del disc. Per regenerar-lo amb el
CLI de Tailwind 4, executeu des de l'arrel del repositori:

```sh
npm ci
npx --yes --package tailwindcss@4.3.3 --package @tailwindcss/cli@4.3.3 \
  tailwindcss -i docs/mockups/assets/mockups.tailwind.css \
  -o docs/mockups/assets/mockups.generated.css --minify
```

`assets/mockups.js` només activa el menú mòbil. Els formularis contenen
JavaScript mínim de demostració i no envien dades.
