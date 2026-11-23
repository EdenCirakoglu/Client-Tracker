(() => {
  const { document } = globalThis;
  const theme = document.querySelector('#theme');
  try {
    const saved = globalThis.localStorage.getItem('clientops:walkthrough-theme');
    if (['light', 'dark', 'system'].includes(saved)) theme.value = saved;
  } catch {
    // Preference storage is optional and never contains credentials.
  }
  function applyTheme() {
    if (theme.value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme.value;
  }
  applyTheme();
  theme.addEventListener('change', () => {
    applyTheme();
    try {
      globalThis.localStorage.setItem('clientops:walkthrough-theme', theme.value);
    } catch {
      // The selected theme still works when storage is unavailable.
    }
  });
  document.querySelector('a[href="#review"]').addEventListener('click', () => {
    document.querySelector('#review').focus();
  });
  const form = document.querySelector('#feedback-form');
  const result = document.querySelector('#result');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    document.querySelector('#saved-feedback').textContent =
      document.querySelector('#feedback').value;
    document.querySelector('#acceptance').textContent = 'Changes requested (simulated)';
    form.hidden = true;
    result.hidden = false;
    document.querySelector('#reset').focus();
  });
  document.querySelector('#reset').addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    form.reset();
    document.querySelector('#acceptance').textContent = 'Awaiting confirmation';
    document.querySelector('#feedback').focus();
  });
})();
