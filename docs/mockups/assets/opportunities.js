// Maqueta autónoma: este adaptador simula el contrato GET /opportunities.
// En producción, el backend filtra, ordena y pagina; el cliente presenta items.
const searchForm = document.querySelector('#opportunity-search');
const queryInput = document.querySelector('#query');
const clearSearch = document.querySelector('#clear-search');
const searchError = document.querySelector('#search-error');
const resultTitle = document.querySelector('#results-title');
const grid = document.querySelector('#catalog-grid');
const pagination = document.querySelector('#pagination');
const previousPage = document.querySelector('#previous-page');
const nextPage = document.querySelector('#next-page');
const loading = document.querySelector('#loading-results');
const requestError = document.querySelector('#request-error');
const emptyResults = document.querySelector('#empty-results');
const templates = [...grid.querySelectorAll('article')].map(card => card.cloneNode(true));
const normalizeSpaces = value => value.trim().replace(/\s+/gu, ' ');
const comparison = value => normalizeSpaces(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const pageSize = 12;
let appliedQuery = '';
let currentPage = 1;
let lastRequest = { q: '', page: 1 };
let requestVersion = 0;

// 28 ejemplos: 25 coinciden con «solar» para recorrer 12 + 12 + 1 resultados.
// Fechas iguales en grupos permiten demostrar el desempate por id.
const solarNames = [
  'Energía solar compartida', 'Solar Horizonte', 'Red solar de barrio',
  'Solar Impulso', 'Comunidad solar del norte', 'Solar Circular',
  'Taller solar', 'Solar Conecta', 'Proyecto solar Levante',
  'Solar Abierto', 'Encuentro solar', 'Solar Raíz',
  'Iniciativa solar del sur', 'Solar Futuro', 'Espacio solar colectivo',
  'Solar Nexo', 'Alianza solar', 'Solar del Valle',
  'Desarrollo solar local', 'Solar Punto de Encuentro', 'Red solar del este',
  'Solar Cooperación', 'Proyecto solar del oeste', 'Solar Camino', 'Horizonte solar'
];
const examples = [
  ...templates.map((card, index) => ({ id: 3 - index, title: card.dataset.title, date_published: '2026-10-01', template: index })),
  ...solarNames.map((title, index) => ({ id: 28 - index, title,
    date_published: `2026-11-${String(8 - Math.floor(index / 4)).padStart(2, '0')}`, template: index % 3 }))
];
async function mockList({ q, page }) {
  await new Promise(resolve => setTimeout(resolve, 180));
  const matches = examples.filter(item => comparison(item.title).includes(comparison(q)))
    .sort((a, b) => b.date_published.localeCompare(a.date_published) || b.id - a.id);
  const total = matches.length;
  const total_pages = Math.ceil(total / pageSize);
  const effectivePage = Math.min(page, total_pages || 1);
  return { items: matches.slice((effectivePage - 1) * pageSize, effectivePage * pageSize),
    page: effectivePage, page_size: pageSize, total, total_pages };
}
function updateClear() {
  clearSearch.hidden = !queryInput.value && !appliedQuery;
}
function writeUrl(q, page, replace = false) {
  const url = new URL(location.href);
  url.searchParams.delete('q');
  url.searchParams.delete('page');
  if (q) url.searchParams.set('q', q);
  if (page > 1) url.searchParams.set('page', String(page));
  if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url);
}
function validate(value, focus = false) {
  const invalid = [...value].length > 100;
  searchError.hidden = !invalid;
  searchError.textContent = invalid ? 'Escribe un máximo de 100 caracteres' : '';
  queryInput.setAttribute('aria-invalid', String(invalid));
  if (invalid && focus) queryInput.focus();
  updateClear();
  return !invalid;
}
function renderCard(item) {
  const card = templates[item.template].cloneNode(true);
  card.dataset.title = item.title;
  card.dataset.id = String(item.id);
  const title = card.querySelector('h3');
  if (item.id > 3) title.textContent = item.title;
  card.querySelector('progress').setAttribute('aria-label', `Capital comprometido para ${item.title}: ${card.querySelector('progress').value} %`);
  return card;
}
for (let index = 0; index < 6; index++) {
  const skeleton = document.createElement('div');
  skeleton.className = 'h-96 rounded-2xl border border-line bg-white motion-safe:animate-pulse';
  loading.append(skeleton);
}
async function loadPage(q, page, { focusResults = false } = {}) {
  const version = ++requestVersion;
  appliedQuery = q;
  currentPage = page;
  lastRequest = { q, page };
  updateClear();
  document.querySelector('#results').setAttribute('aria-busy', 'true');
  document.querySelector('#search-button').disabled = true;
  resultTitle.textContent = q ? 'Buscando oportunidades…' : 'Cargando oportunidades…';
  grid.hidden = pagination.hidden = emptyResults.hidden = requestError.hidden = true;
  loading.hidden = false;
  try {
    const response = await mockList(lastRequest);
    if (version !== requestVersion) return;
    currentPage = response.page;
    writeUrl(q, response.page, true);
    grid.replaceChildren(...response.items.map(renderCard));
    grid.hidden = response.total === 0;
    resultTitle.textContent = q
      ? `${response.total} ${response.total === 1 ? 'resultado' : 'resultados'} para «${q}»`
      : `${response.total} ${response.total === 1 ? 'oportunidad' : 'oportunidades'}`;
    emptyResults.hidden = response.total !== 0;
    emptyResults.textContent = q ? 'No se han encontrado oportunidades' : 'Aún no hay oportunidades publicadas';
    pagination.hidden = response.total_pages <= 1;
    document.querySelector('#page-indicator').textContent = `Página ${response.page} de ${response.total_pages}`;
    renderPageNumbers(response.page, response.total_pages);
    previousPage.disabled = response.page <= 1;
    nextPage.disabled = response.page >= response.total_pages;
    if (focusResults) {
      resultTitle.focus({ preventScroll: true });
      resultTitle.scrollIntoView({ block: 'start' });
    }
  } catch {
    if (version !== requestVersion) return;
    resultTitle.textContent = '';
    requestError.hidden = false;
  } finally {
    if (version === requestVersion) {
      loading.hidden = true;
      document.querySelector('#results').setAttribute('aria-busy', 'false');
      document.querySelector('#search-button').disabled = false;
    }
  }
}
function applySearch() {
  const q = normalizeSpaces(queryInput.value);
  if (!validate(q, true)) return;
  writeUrl(q, 1);
  loadPage(q, 1);
}
function restoreSearch() {
  const url = new URL(location.href);
  const q = normalizeSpaces(url.searchParams.get('q') || '');
  queryInput.value = url.searchParams.get('q') || '';
  const rawPage = url.searchParams.get('page');
  const page = rawPage && /^\d+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) && Number(rawPage) > 0 ? Number(rawPage) : 1;
  writeUrl(q, page, true);
  if (!validate(q)) {
    // An invalid URL must not leave a previous request or page visible.
    requestVersion++;
    appliedQuery = q;
    grid.hidden = pagination.hidden = loading.hidden = emptyResults.hidden = requestError.hidden = true;
    resultTitle.textContent = '';
    document.querySelector('#results').setAttribute('aria-busy', 'false');
    document.querySelector('#search-button').disabled = false;
    updateClear();
    return;
  }
  loadPage(q, page);
}
searchForm.addEventListener('submit', event => { event.preventDefault(); applySearch(); });
queryInput.addEventListener('input', updateClear);
clearSearch.addEventListener('click', () => { queryInput.value = ''; applySearch(); queryInput.focus(); });
function navigatePage(page) {
  if (page === currentPage) return;
  writeUrl(appliedQuery, page);
  loadPage(appliedQuery, page, { focusResults: true });
}
function renderPageNumbers(current, total) {
  const container = document.querySelector('#page-numbers');
  container.replaceChildren();
  const mobileStart = Math.max(1, Math.min(current - 1, total - 2));
  const mobilePages = new Set(Array.from({ length: Math.min(3, total) }, (_, i) => mobileStart + i));
  const desktopPages = new Set(total <= 7 ? Array.from({ length: total }, (_, i) => i + 1)
    : [1, total, ...Array.from({ length: 3 }, (_, i) => current - 1 + i).filter(n => n >= 1 && n <= total)]);
  const visiblePages = [...new Set([...mobilePages, ...desktopPages])].sort((a, b) => a - b);
  let previousDesktop = 0;
  for (const number of visiblePages) {
    if (desktopPages.has(number)) {
      if (previousDesktop && number - previousDesktop > 1) {
        const dots = document.createElement('span');
        dots.className = 'hidden h-11 min-w-8 items-center justify-center text-sm text-muted sm:inline-flex';
        dots.textContent = '…';
        dots.setAttribute('aria-hidden', 'true');
        container.append(dots);
      }
      previousDesktop = number;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(number);
    button.setAttribute('aria-label', `Página ${number}`);
    const visibility = mobilePages.has(number) ? (desktopPages.has(number) ? 'inline-flex' : 'inline-flex sm:hidden') : 'hidden sm:inline-flex';
    button.className = `${visibility} h-11 min-w-11 items-center justify-center rounded-lg border px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`;
    if (number === current) {
      button.setAttribute('aria-current', 'page');
      button.className += ' border-amber bg-amber text-ink';
    } else button.className += ' border-line bg-white text-brand hover:bg-soft-blue';
    button.addEventListener('click', () => navigatePage(number));
    container.append(button);
  }
}
previousPage.addEventListener('click', () => navigatePage(currentPage - 1));
nextPage.addEventListener('click', () => navigatePage(currentPage + 1));
document.querySelector('#retry-search').addEventListener('click', () => loadPage(lastRequest.q, lastRequest.page));
window.addEventListener('popstate', restoreSearch);
restoreSearch();
