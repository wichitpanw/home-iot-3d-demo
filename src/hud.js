const button = document.querySelector('#toggle-hud');
let hidden = false;

function toggleHud() {
  hidden = !hidden;
  document.body.dataset.hudHidden = String(hidden);
  button.textContent = hidden ? 'แสดงเมนู' : 'ซ่อนเมนู';
  button.setAttribute('aria-label', hidden ? 'แสดง HUD และเมนูทั้งหมด' : 'ซ่อน HUD และเมนูทั้งหมด');
  button.setAttribute('aria-pressed', String(hidden));
  button.title = hidden ? 'แสดงเมนู (H)' : 'ซ่อนเมนู (H)';
  window.dispatchEvent(new CustomEvent('hud-change', { detail: { hidden } }));
  button.focus({ preventScroll: true });
}

button.addEventListener('click', toggleHud);
window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() !== 'h' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  event.preventDefault();
  toggleHud();
});
