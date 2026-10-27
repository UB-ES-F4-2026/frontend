// Visual demonstration only; no authentication or server requests.
const accountToggle = document.querySelector('#account-toggle');
const accountMenu = document.querySelector('#account-menu');
const accountActions = document.querySelector('#account-actions');
const publicActions = document.querySelector('#public-actions');
const notice = document.querySelector('#session-notice');
const scenario = document.querySelector('#scenario');
let authenticated = true;
function closeAccount(restoreFocus = false) {
  accountMenu.hidden = true;
  accountToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) accountToggle.focus();
}
accountToggle.addEventListener('click', () => {
  const open = accountMenu.hidden;
  accountMenu.hidden = !open;
  accountToggle.setAttribute('aria-expanded', String(open));
  if (open) accountMenu.querySelector('button').focus();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.account-desktop')) closeAccount();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !accountMenu.hidden) {
    event.preventDefault();
    closeAccount(true);
  }
});
document.querySelector('.account-desktop').addEventListener('focusout', event => {
  if (!event.currentTarget.contains(event.relatedTarget)) closeAccount();
});
desktop.addEventListener('change', () => closeAccount());
function endSession(expired = false) {
  if (!authenticated) return;
  authenticated = false;
  closeAccount();
  if (!desktop.matches) menu(false);
  accountActions.hidden = true;
  publicActions.hidden = false;
  notice.dataset.tone = expired || scenario.value === 'error' ? 'warning' : 'success';
  notice.textContent = expired
    ? 'Tu sesión ha caducado. Vuelve a iniciar sesión'
    : scenario.value === 'error'
      ? 'Se ha cerrado la sesión en este navegador, pero no se ha podido confirmar el cierre en el servidor'
      : 'Has cerrado la sesión';
  if (expired) {
    const link = document.createElement('a');
    link.href = '../inici-sessio.html';
    link.textContent = 'Iniciar sesión';
    link.className = 'ml-3 underline';
    notice.append(' ', link);
  }
  notice.hidden = false;
  notice.focus();
}
document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', () => endSession()));
scenario.addEventListener('change', () => {
  if (scenario.value === 'expired') endSession(true);
});
document.querySelector('#reset-preview').addEventListener('click', () => {
  authenticated = true;
  accountActions.hidden = false;
  publicActions.hidden = true;
  notice.hidden = true;
  scenario.value = 'success';
  closeAccount();
  if (desktop.matches) accountToggle.focus();
  else { menu(true); document.querySelector('.mobile-logout').focus(); }
});
