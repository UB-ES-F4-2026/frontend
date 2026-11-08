// Preview only: no API calls or persistent financial data.
const scenario = document.querySelector('#scenario');
const result = document.querySelector('#result');
const failure = document.querySelector('#failure');
const balance = document.querySelector('.balance');
let pending;
function render(state) {
  clearTimeout(pending);
  balance.setAttribute('aria-busy', String(state === 'loading'));
  failure.hidden = state !== 'error';
  result.hidden = state === 'error';
  if (state === 'loading') {
    result.innerHTML = '<p class="loading">Cargando saldo…</p>';
  } else if (state !== 'error') {
    const funded = state === 'funds';
    result.innerHTML = `<p class="amount" aria-label="Saldo disponible: ${funded ? '1234 euros con 56 céntimos' : '0 euros'}">${funded ? '1.234,56' : '0,00'} <span>€</span></p>${funded ? '' : '<p class="zero">Tu saldo disponible es de 0,00 €</p>'}`;
  } else {
    result.replaceChildren();
  }
}
scenario.addEventListener('change', () => render(scenario.value));
document.querySelector('#retry').addEventListener('click', () => {
  render('loading');
  pending = setTimeout(() => {
    scenario.value = 'zero';
    render('zero');
    scenario.focus();
  }, 900);
});
