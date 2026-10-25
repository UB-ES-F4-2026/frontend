// Implementació vanilla mínima per a les maquetes. Substituir per React,
// HeroUI i React Router en el frontend; no és codi de producció.
const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.navigation');
const desktop=matchMedia('(min-width:960px)');
function menu(open,focus=false){nav.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Tanca el menú':'Obre el menú');if(focus)toggle.focus();}
toggle.addEventListener('click',()=>menu(toggle.getAttribute('aria-expanded')!=='true'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!desktop.matches&&!nav.hidden)menu(false,true)});
desktop.addEventListener('change',()=>{const inside=nav.contains(document.activeElement);menu(false,!desktop.matches&&inside);if(desktop.matches&&document.activeElement===toggle)nav.querySelector('a').focus();});
