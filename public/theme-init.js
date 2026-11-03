// Applies the saved theme before first paint (see src/lib/theme.tsx).
(function () {
  var t = 'light';
  try {
    t = localStorage.getItem('wera-theme') || 'light';
  } catch (e) {}
  if (t === 'system') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  var color = t === 'light' ? '#F7F6F2' : '#0A0B0F';
  document.documentElement.style.background = color;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
})();
