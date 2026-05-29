const CATEGORY_ICONS = {
  'Dress': '\u{1F457}', 'Shoes': '\u{1F45F}', 'Gaming': '\u{1F3AE}',
  'Anime': '\u{1F32E}', 'Movies': '\u{1F3AC}', 'Music': '\u{1F3B5}',
  'Technology': '\u{1F4BB}', 'Social Media': '\u{1F4F1}', 'Education': '\u{1F4DA}',
  'Other': '\u{1F517}'
};

const DEFAULT_ICONS = {
  'Dress': '\u{1F457}', 'Shoes': '\u{1F45E}', 'Gaming': '\u{1F3AE}',
  'Anime': '\u{1F32E}', 'Movies': '\u{1F3AC}', 'Music': '\u{1F3B5}',
  'Technology': '\u{1F4BB}', 'Social Media': '\u{1F4F1}', 'Education': '\u{1F4DA}',
  'Other': '\u{1F517}'
};

let categories = [];
let currentPage = 1;

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  return res.json();
}

async function loadCategories() {
  categories = await api('/api/categories');
  const selects = ['filterCategory', 'formCategory'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = id === 'filterCategory' ? '<option value="">All Categories</option>' : '<option value="">Select a category</option>';
    categories.forEach(c => {
      el.innerHTML += `<option value="${c.id}" ${c.id == current ? 'selected' : ''}>${c.name}</option>`;
    });
  });
  renderCategories();
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  grid.innerHTML = categories.map(c => `
    <a class="category-chip" href="#" data-cat="${c.name}">
      <div class="cat-icon">${CATEGORY_ICONS[c.name] || '\u{1F517}'}</div>
      <div class="cat-name">${c.name}</div>
    </a>
  `).join('');
  grid.querySelectorAll('.category-chip').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = el.dataset.cat;
      document.getElementById('filterCategory').value = '';
      const searchSelect = document.getElementById('filterCategory');
      for (const opt of searchSelect.options) {
        if (opt.text === cat) { searchSelect.value = opt.value; break; }
      }
      currentPage = 1;
      loadLinks();
    });
  });
}

async function loadLinks() {
  const grid = document.getElementById('linksGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Loading links</div>';

  const search = document.getElementById('searchInput').value;
  const category = document.getElementById('filterCategory').value;
  const sort = document.getElementById('sortSelect').value;
  const catName = category ? categories.find(c => c.id == category)?.name || '' : '';

  const params = new URLSearchParams({ page: currentPage, limit: 20, sort });
  if (search) params.set('search', search);
  if (catName) params.set('category', catName);

  const data = await api(`/api/links?${params}`);
  grid.innerHTML = '';

  if (!data.links || data.links.length === 0) {
    grid.innerHTML = '<div class="empty-state">No links found. Be the first to share one!</div>';
    return;
  }

  data.links.forEach(link => {
    const domain = (() => {
      try { return new URL(link.url).hostname; } catch { return link.url; }
    })();
    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `
      <div class="link-card-thumb">
        ${link.image_url ? `<img src="${link.image_url}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='${DEFAULT_ICONS[link.category_name] || '\u{1F517}'}'">` : (DEFAULT_ICONS[link.category_name] || '\u{1F517}')}
      </div>
      <span class="cat-badge">${link.category_name}</span>
      <h3>${escapeHtml(link.title)}</h3>
      <a href="${link.url}" target="_blank" rel="noopener" class="card-url">${escapeHtml(domain)}</a>
      <div class="card-desc">${escapeHtml(link.description) || 'No description'}</div>
      <div class="card-meta">
        <span>${formatDate(link.date_posted)}</span>
        <span>${link.views || 0} views</span>
      </div>
    `;
    card.querySelector('.card-url').addEventListener('click', () => {
      fetch(`/api/links/${link.id}/view`, { method: 'POST' }).catch(() => {});
    });
    grid.appendChild(card);
  });

  renderPagination(data.total, data.page);
}

function renderPagination(total, page) {
  const el = document.getElementById('pagination');
  if (!el) return;
  const pages = Math.ceil(total / 20);
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      loadLinks();
      const grid = document.getElementById('linksGrid');
      window.scrollTo({ top: (grid ? grid.offsetTop : 0) - 80, behavior: 'smooth' });
    });
  });
}

async function loadTrending() {
  const grid = document.getElementById('trendingGrid');
  if (!grid) return;
  const links = await api('/api/links/trending');
  if (!links || links.length === 0) {
    grid.innerHTML = '<div class="empty-state">No trending links yet</div>';
    return;
  }
  grid.innerHTML = links.map(link => {
    const domain = (() => { try { return new URL(link.url).hostname; } catch { return link.url; } })();
    return `
      <div class="link-card">
        <div class="link-card-thumb">${link.image_url ? `<img src="${link.image_url}" alt="" loading="lazy" onerror="this.innerHTML='${DEFAULT_ICONS[link.category_name] || '\u{1F517}'}'">` : (DEFAULT_ICONS[link.category_name] || '\u{1F517}')}</div>
        <span class="cat-badge">${link.category_name}</span>
        <h3>${escapeHtml(link.title)}</h3>
        <a href="${link.url}" target="_blank" rel="noopener" class="card-url">${escapeHtml(domain)}</a>
        <div class="card-desc">${escapeHtml(link.description) || 'No description'}</div>
        <div class="card-meta">
          <span>${formatDate(link.date_posted)}</span>
          <span>${link.views || 0} views</span>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadLinks();
  loadTrending();

  document.getElementById('searchInput').addEventListener('input', () => {
    currentPage = 1;
    loadLinks();
  });
  document.getElementById('filterCategory').addEventListener('change', () => {
    currentPage = 1;
    loadLinks();
  });
  document.getElementById('sortSelect').addEventListener('change', () => {
    currentPage = 1;
    loadLinks();
  });

  document.getElementById('submitBtn').addEventListener('click', () => {
    document.getElementById('submitModal').classList.add('active');
    // Populate form categories
    const sel = document.getElementById('formCategory');
    sel.innerHTML = '<option value="">Select a category</option>';
    categories.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  });

  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('submitModal').classList.remove('active');
  });

  document.getElementById('submitModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('submitModal').classList.remove('active');
    }
  });

  document.getElementById('submitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      url: document.getElementById('formUrl').value,
      title: document.getElementById('formTitle').value,
      description: document.getElementById('formDesc').value,
      category_id: document.getElementById('formCategory').value,
      image_url: document.getElementById('formImage').value,
    };
    try {
      const result = await api('/api/links', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (result.error) {
        alert(result.error);
        return;
      }
      document.getElementById('submitModal').classList.remove('active');
      document.getElementById('submitForm').reset();
      currentPage = 1;
      loadLinks();
      loadTrending();
      alert('Link submitted successfully!');
    } catch (err) {
      alert('Failed to submit link. Try again.');
    }
  });
});
