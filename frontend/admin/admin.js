const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
const LOGIN_REDIRECT_PATH = '/admin/index.html';
const SETTINGS_KEY = 'mutanha_admin_settings';
const VALID_PAGES = new Set(['dashboard', 'products', 'orders', 'customers', 'analytics', 'settings']);
const DEFAULT_SETTINGS = {
  store_name: 'Mutanha',
  contact_email: 'contato@mutanha.ao',
  contact_phone: '+244 000 000 000',
  support_hours: 'Seg a Sab, 09h00 - 18h00',
  store_address: 'Luanda, Angola',
  announcement: 'Revise o dashboard no inicio e fim de cada turno.'
};
const PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'><rect width='320' height='240' fill='%23f5ede6'/><rect x='24' y='24' width='272' height='192' rx='18' fill='%23e6d8c9'/><circle cx='118' cy='102' r='34' fill='%23f59e0b'/><path d='M56 194l56-58 44 44 32-30 76 44H56z' fill='%23864f25'/><text x='160' y='222' text-anchor='middle' fill='%23532f17' font-family='sans-serif' font-size='18'>Mutanha</text></svg>")}`;

const state = {
  authToken: localStorage.getItem('authToken'),
  currentPage: 'dashboard',
  stats: { totalProducts: 0, pendingOrders: 0, totalSales: 0, activeCustomers: 0 },
  products: [],
  orders: [],
  customers: [],
  recentOrders: [],
  topProducts: [],
  settings: loadSettings(),
  lastSync: null
};

const elements = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  setupSiteLinks();
  bindStaticEvents();
  hydrateSettingsForm();
  syncSessionIdentity();
  showPage(getPageFromHash(), { updateHash: false });

  if (!await checkAuth()) {
    return;
  }

  await refreshAllData({ notify: false });
}

function cacheElements() {
  elements.navLinks = [...document.querySelectorAll('.nav-link')];
  elements.pages = [...document.querySelectorAll('[data-page-panel]')];
  elements.pageTitle = document.getElementById('page-title');
  elements.sidebar = document.getElementById('admin-sidebar');
  elements.sidebarOpenBtn = document.getElementById('sidebar-open-btn');
  elements.sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  elements.sidebarBackdrop = document.getElementById('admin-backdrop');
  elements.refreshBtn = document.getElementById('refresh-btn');
  elements.logoutBtn = document.getElementById('logout-btn');
  elements.lastSync = document.getElementById('last-sync');
  elements.sessionUser = document.getElementById('session-user');
  elements.sessionStatus = document.getElementById('session-status');
  elements.toastStack = document.getElementById('toast-stack');

  elements.productsSearch = document.getElementById('products-search');
  elements.productsSummary = document.getElementById('products-summary');
  elements.productsTbody = document.getElementById('products-tbody');
  elements.productsEmpty = document.getElementById('products-empty');
  elements.reloadProducts = document.getElementById('reload-products');

  elements.ordersSearch = document.getElementById('orders-search');
  elements.ordersFilter = document.getElementById('orders-filter');
  elements.ordersSummary = document.getElementById('orders-summary');
  elements.ordersTbody = document.getElementById('orders-tbody');
  elements.ordersEmpty = document.getElementById('orders-empty');
  elements.reloadOrders = document.getElementById('reload-orders');

  elements.customersSearch = document.getElementById('customers-search');
  elements.customersFilter = document.getElementById('customers-filter');
  elements.customersSummary = document.getElementById('customers-summary');
  elements.customersTbody = document.getElementById('customers-tbody');
  elements.customersEmpty = document.getElementById('customers-empty');
  elements.reloadCustomers = document.getElementById('reload-customers');

  elements.recentOrdersList = document.getElementById('recent-orders-list');
  elements.topProductsList = document.getElementById('top-products-list');
  elements.analyticsOverview = document.getElementById('analytics-overview');
  elements.analyticsCategoryList = document.getElementById('analytics-category-list');
  elements.analyticsStatusList = document.getElementById('analytics-status-list');
  elements.topCustomersList = document.getElementById('top-customers-list');

  elements.productModal = document.getElementById('product-modal');
  elements.productForm = document.getElementById('product-form');
  elements.productModalTitle = document.getElementById('product-modal-title');
  elements.productId = document.getElementById('product-id');
  elements.productExistingImage = document.getElementById('product-existing-image');
  elements.productImageInput = document.getElementById('product-image');
  elements.productImagePreview = document.getElementById('product-image-preview');
  elements.productImageCaption = document.getElementById('product-image-caption');

  elements.orderModal = document.getElementById('order-modal');
  elements.orderForm = document.getElementById('order-form');
  elements.orderId = document.getElementById('order-id');

  elements.customerModal = document.getElementById('customer-modal');
  elements.customerForm = document.getElementById('customer-form');
  elements.customerModalTitle = document.getElementById('customer-modal-title');
  elements.customerId = document.getElementById('customer-id');
  elements.customerMode = document.getElementById('customer-mode');
  elements.customerPasswordGroup = document.getElementById('customer-password-group');
  elements.customerPassword = document.getElementById('customer-password');
  elements.customerActiveField = document.getElementById('customer-active-field');
  elements.customerIsActive = document.getElementById('customer-is-active');

  elements.settingsForm = document.getElementById('settings-form');
  elements.settingsFeedback = document.getElementById('settings-feedback');
}

function bindStaticEvents() {
  elements.navLinks.forEach((link) => {
    link.addEventListener('click', () => showPage(link.dataset.page));
  });

  document.querySelectorAll('[data-open-page]').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.openPage));
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  window.addEventListener('hashchange', () => showPage(getPageFromHash(), { updateHash: false }));
  document.addEventListener('keydown', handleGlobalKeydown);

  elements.sidebarOpenBtn?.addEventListener('click', () => toggleSidebar(true));
  elements.sidebarCloseBtn?.addEventListener('click', () => toggleSidebar(false));
  elements.sidebarBackdrop?.addEventListener('click', () => toggleSidebar(false));
  elements.refreshBtn?.addEventListener('click', () => refreshAllData());
  elements.reloadProducts?.addEventListener('click', () => refreshAllData());
  elements.reloadOrders?.addEventListener('click', () => refreshAllData());
  elements.reloadCustomers?.addEventListener('click', () => refreshAllData());
  document.getElementById('analytics-refresh')?.addEventListener('click', () => refreshAllData());
  elements.logoutBtn?.addEventListener('click', logout);

  document.getElementById('hero-add-product')?.addEventListener('click', () => openProductModal());
  document.getElementById('open-product-create')?.addEventListener('click', () => openProductModal());
  document.getElementById('hero-add-customer')?.addEventListener('click', () => openCustomerModal());
  document.getElementById('open-customer-create')?.addEventListener('click', () => openCustomerModal());

  elements.productsSearch?.addEventListener('input', renderProductsTable);
  elements.ordersSearch?.addEventListener('input', renderOrdersTable);
  elements.ordersFilter?.addEventListener('change', renderOrdersTable);
  elements.customersSearch?.addEventListener('input', renderCustomersTable);
  elements.customersFilter?.addEventListener('change', renderCustomersTable);
  elements.productImageInput?.addEventListener('change', previewSelectedImage);

  elements.productsTbody?.addEventListener('click', handleProductsTableClick);
  elements.ordersTbody?.addEventListener('click', handleOrdersTableClick);
  elements.customersTbody?.addEventListener('click', handleCustomersTableClick);

  elements.productForm?.addEventListener('submit', handleProductSubmit);
  elements.orderForm?.addEventListener('submit', handleOrderSubmit);
  elements.customerForm?.addEventListener('submit', handleCustomerSubmit);
  elements.settingsForm?.addEventListener('submit', handleSettingsSubmit);
  document.getElementById('reset-settings-btn')?.addEventListener('click', resetSettingsForm);
}
function setupSiteLinks() {
  const routes = {
    home: '/index.html',
    shop: '/public/roupas.html',
    accessories: '/public/acess.html',
    search: '/public/search.html',
    account: '/public/login.html'
  };

  document.querySelectorAll('[data-route]').forEach((link) => {
    const href = routes[link.dataset.route];
    if (href) {
      link.href = buildSiteUrl(href);
    }
  });
}

function buildSiteUrl(path) {
  return new URL(path, `${window.location.origin}/`).toString();
}

function showPage(page, options = {}) {
  const nextPage = VALID_PAGES.has(page) ? page : 'dashboard';
  const updateHash = options.updateHash !== false;
  state.currentPage = nextPage;

  elements.navLinks.forEach((link) => {
    const isActive = link.dataset.page === nextPage;
    link.classList.toggle('is-active', isActive);
  });

  elements.pages.forEach((section) => {
    section.classList.toggle('is-active', section.id === `${nextPage}-page`);
  });

  const activeLink = elements.navLinks.find((link) => link.dataset.page === nextPage);
  elements.pageTitle.textContent = activeLink?.dataset.title || 'Dashboard';
  if (updateHash) {
    window.location.hash = nextPage;
  }
  toggleSidebar(false);
}

function getPageFromHash() {
  const hash = window.location.hash.replace('#', '').trim();
  return VALID_PAGES.has(hash) ? hash : 'dashboard';
}

function toggleSidebar(forceOpen) {
  if (!elements.sidebar) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !elements.sidebar.classList.contains('is-open');
  elements.sidebar.classList.toggle('is-open', shouldOpen);
  elements.sidebarBackdrop?.classList.toggle('is-visible', shouldOpen);
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal.is-open').forEach((modal) => closeModal(modal.id));
    toggleSidebar(false);
  }
}

async function checkAuth() {
  const isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
  if (!isAdminLoggedIn || !state.authToken) {
    clearAdminSession();
    redirectToLogin();
    return false;
  }

  try {
    await apiRequest('/dashboard/stats', { skipNotification: true });
    return true;
  } catch (error) {
    console.error('Sessao admin invalida:', error);
    return false;
  }
}

async function refreshAllData(options = {}) {
  const notify = options.notify !== false;
  setLoadingState(true);

  try {
    const [stats, products, orders, customers, recentOrders, topProducts] = await Promise.all([
      apiRequest('/dashboard/stats', { skipNotification: true }),
      apiRequest('/products', { skipNotification: true }),
      apiRequest('/orders', { skipNotification: true }),
      apiRequest('/customers', { skipNotification: true }),
      apiRequest('/dashboard/recent-orders', { skipNotification: true }),
      apiRequest('/dashboard/top-products', { skipNotification: true })
    ]);

    state.stats = stats;
    state.products = products;
    state.orders = orders;
    state.customers = customers;
    state.recentOrders = recentOrders;
    state.topProducts = topProducts;
    state.lastSync = new Date();

    renderDashboard();
    renderProductsTable();
    renderOrdersTable();
    renderCustomersTable();
    renderAnalytics();
    updateLastSyncLabel();

    if (notify) {
      showToast('Dados atualizados com sucesso.', 'success');
    }
  } catch (error) {
    console.error('Erro ao atualizar painel:', error);
    if (notify) {
      showToast('Nao foi possivel atualizar os dados agora.', 'error');
    }
  } finally {
    setLoadingState(false);
  }
}

async function apiRequest(endpoint, options = {}) {
  const requestOptions = { ...options };
  const skipNotification = Boolean(requestOptions.skipNotification);
  delete requestOptions.skipNotification;

  if (!state.authToken) {
    clearAdminSession();
    redirectToLogin();
    throw new Error('Sessao admin ausente');
  }

  const isFormData = requestOptions.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(requestOptions.headers || {}),
    Authorization: `Bearer ${state.authToken}`
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAdminSession();
      redirectToLogin();
      throw new Error('Sessao expirada');
    }

    const message = typeof payload === 'object' && payload?.error ? payload.error : `HTTP ${response.status}`;
    if (!skipNotification) {
      showToast(message, 'error');
    }
    throw new Error(message);
  }

  return payload;
}

async function uploadImage(file) {
  if (!file || !file.size) {
    return '';
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('A imagem deve ter no maximo 5MB.');
  }

  const formData = new FormData();
  formData.append('image', file);
  const payload = await apiRequest('/upload-image', {
    method: 'POST',
    body: formData,
    skipNotification: true
  });
  return payload.imageUrl || '';
}

function setLoadingState(isLoading) {
  document.body.classList.toggle('is-loading', isLoading);
  if (elements.refreshBtn) {
    elements.refreshBtn.disabled = isLoading;
    elements.refreshBtn.textContent = isLoading ? 'A atualizar...' : 'Atualizar dados';
  }
}

function syncSessionIdentity() {
  const tokenData = decodeJwt(state.authToken);
  const username = tokenData?.username || 'Administrador';
  if (elements.sessionUser) {
    elements.sessionUser.textContent = username;
  }
  if (elements.sessionStatus) {
    elements.sessionStatus.textContent = `Sessao ativa para ${username}`;
  }
}

function decodeJwt(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function clearAdminSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminLoggedIn');
  state.authToken = null;
}

function redirectToLogin() {
  const url = new URL(buildSiteUrl('/public/login.html'));
  url.searchParams.set('redirect', LOGIN_REDIRECT_PATH);
  window.location.href = url.toString();
}

function logout() {
  clearAdminSession();
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  redirectToLogin();
}
function renderDashboard() {
  text('stat-total-products', formatNumber(state.stats.totalProducts));
  text('stat-pending-orders', formatNumber(state.stats.pendingOrders));
  text('stat-total-sales', formatCurrency(state.stats.totalSales));
  text('stat-active-customers', formatNumber(state.stats.activeCustomers));

  renderRecentOrders();
  renderTopProducts();
  renderOperationalOverview();
}

function renderRecentOrders() {
  renderStackList(elements.recentOrdersList, state.recentOrders, (order) => {
    return `
      <article class="stack-row">
        <div>
          <strong>#${escapeHtml(order.id)}</strong>
          <p>${escapeHtml(order.customer_name || 'Cliente nao identificado')}</p>
        </div>
        <div class="stack-meta">
          <span class="status-chip ${statusClass(order.status)}">${escapeHtml(getStatusText(order.status))}</span>
          <strong>${formatCurrency(order.total_amount)}</strong>
        </div>
      </article>
    `;
  }, 'Sem pedidos recentes.');
}

function renderTopProducts() {
  renderStackList(elements.topProductsList, state.topProducts, (product) => {
    return `
      <article class="stack-row">
        <div class="stack-avatar">${escapeHtml((product.name || 'M').slice(0, 1).toUpperCase())}</div>
        <div class="stack-content">
          <strong>${escapeHtml(product.name || 'Produto')}</strong>
          <p>${formatCurrency(product.price)} · Stock ${formatNumber(product.stock_quantity)}</p>
        </div>
      </article>
    `;
  }, 'Sem produtos para destacar.');
}

function renderOperationalOverview() {
  const completedOrders = state.orders.filter((order) => order.status === 'completed').length;
  const lowStock = state.products.filter((product) => Number(product.stock_quantity || 0) <= 5).length;
  const newCustomers = state.customers.filter((customer) => isWithinDays(customer.created_at, 30)).length;
  const averageTicket = state.orders.length ? state.orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) / state.orders.length : 0;

  const metrics = [
    { label: 'Pedidos concluidos', value: formatNumber(completedOrders) },
    { label: 'Ticket medio', value: formatCurrency(averageTicket) },
    { label: 'Stock baixo', value: formatNumber(lowStock) },
    { label: 'Clientes novos em 30 dias', value: formatNumber(newCustomers) }
  ];

  elements.analyticsOverview.innerHTML = metrics.map((metric) => `
    <article class="metric-card">
      <span>${escapeHtml(metric.label)}</span>
      <strong>${escapeHtml(metric.value)}</strong>
    </article>
  `).join('');
}

function renderProductsTable() {
  const query = (elements.productsSearch?.value || '').trim().toLowerCase();
  const filtered = state.products.filter((product) => {
    const haystack = [product.name, product.description, product.category].join(' ').toLowerCase();
    return haystack.includes(query);
  });

  elements.productsSummary.textContent = `${formatNumber(filtered.length)} produtos ativos`;
  toggleEmptyState(elements.productsEmpty, filtered.length === 0);
  elements.productsTbody.innerHTML = filtered.map((product) => `
    <tr>
      <td>
        <div class="product-cell">
          <img class="product-thumb" src="${escapeHtml(getImageUrl(product.image))}" alt="${escapeHtml(product.name || 'Produto')}" data-product-image>
          <div>
            <strong>${escapeHtml(product.name || 'Sem nome')}</strong>
            <p>${escapeHtml(truncateText(product.description || 'Sem descricao.', 72))}</p>
          </div>
        </div>
      </td>
      <td><span class="table-pill">${escapeHtml(product.category || 'Sem categoria')}</span></td>
      <td>${formatCurrency(product.price)}</td>
      <td>${formatNumber(product.stock_quantity)}</td>
      <td><span class="status-chip ${Number(product.stock_quantity || 0) <= 5 ? 'status-warning' : 'status-success'}">${Number(product.stock_quantity || 0) <= 5 ? 'Stock baixo' : 'Ativo'}</span></td>
      <td>
        <div class="table-actions">
          <button type="button" class="action-btn" data-action="edit-product" data-id="${escapeHtml(product.id)}">Editar</button>
          <button type="button" class="action-btn danger" data-action="delete-product" data-id="${escapeHtml(product.id)}">Remover</button>
        </div>
      </td>
    </tr>
  `).join('');
  applyImageFallbacks(elements.productsTbody);
}

function renderOrdersTable() {
  const query = (elements.ordersSearch?.value || '').trim().toLowerCase();
  const status = elements.ordersFilter?.value || 'all';
  const filtered = state.orders.filter((order) => {
    const matchesQuery = [order.id, order.customer_name, order.customer_email].join(' ').toLowerCase().includes(query);
    const matchesStatus = status === 'all' ? true : order.status === status;
    return matchesQuery && matchesStatus;
  });

  elements.ordersSummary.textContent = `${formatNumber(filtered.length)} pedidos carregados`;
  toggleEmptyState(elements.ordersEmpty, filtered.length === 0);
  elements.ordersTbody.innerHTML = filtered.map((order) => `
    <tr>
      <td>#${escapeHtml(order.id)}</td>
      <td><strong>${escapeHtml(order.customer_name || 'Cliente nao identificado')}</strong></td>
      <td>
        <div class="contact-cell">
          <span>${escapeHtml(order.customer_email || 'Sem email')}</span>
          <small>${escapeHtml(order.customer_phone || 'Sem telefone')}</small>
        </div>
      </td>
      <td>${formatCurrency(order.total_amount)}</td>
      <td><span class="status-chip ${statusClass(order.status)}">${escapeHtml(getStatusText(order.status))}</span></td>
      <td>${escapeHtml(formatDate(order.created_at))}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="action-btn" data-action="edit-order" data-id="${escapeHtml(order.id)}">Detalhes</button>
          <button type="button" class="action-btn danger" data-action="delete-order" data-id="${escapeHtml(order.id)}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCustomersTable() {
  const query = (elements.customersSearch?.value || '').trim().toLowerCase();
  const filter = elements.customersFilter?.value || 'all';
  const filtered = state.customers.filter((customer) => {
    const matchesQuery = [customer.name, customer.username, customer.email].join(' ').toLowerCase().includes(query);
    const isActive = customer.is_active !== false;
    const matchesStatus = filter === 'all' ? true : filter === 'active' ? isActive : !isActive;
    return matchesQuery && matchesStatus;
  });

  elements.customersSummary.textContent = `${formatNumber(filtered.length)} clientes carregados`;
  toggleEmptyState(elements.customersEmpty, filtered.length === 0);
  elements.customersTbody.innerHTML = filtered.map((customer) => {
    const isActive = customer.is_active !== false;
    return `
      <tr>
        <td>
          <div class="contact-cell">
            <strong>${escapeHtml(customer.name || 'Sem nome')}</strong>
            <small>@${escapeHtml(customer.username || 'sem-utilizador')}</small>
          </div>
        </td>
        <td>
          <div class="contact-cell">
            <span>${escapeHtml(customer.email || 'Sem email')}</span>
            <small>${escapeHtml(customer.phone || 'Sem telefone')}</small>
          </div>
        </td>
        <td>${formatNumber(customer.orders_count)}</td>
        <td>${formatCurrency(customer.total_spent)}</td>
        <td><span class="status-chip ${isActive ? 'status-success' : 'status-neutral'}">${isActive ? 'Ativo' : 'Inativo'}</span></td>
        <td>
          <div class="table-actions">
            <button type="button" class="action-btn" data-action="edit-customer" data-id="${escapeHtml(customer.id)}">Editar</button>
            <button type="button" class="action-btn danger" data-action="delete-customer" data-id="${escapeHtml(customer.id)}">Desativar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAnalytics() {
  const validOrders = state.orders.filter((order) => order.status !== 'cancelled');
  const completedThisMonth = state.orders.filter((order) => order.status === 'completed' && isCurrentMonth(order.created_at));
  const averageTicket = validOrders.length ? validOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) / validOrders.length : 0;
  const lowStock = state.products.filter((product) => Number(product.stock_quantity || 0) <= 5).length;

  text('analytics-total-orders', formatNumber(state.orders.length));
  text('analytics-average-ticket', formatCurrency(averageTicket));
  text('analytics-month-revenue', formatCurrency(completedThisMonth.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)));
  text('analytics-low-stock', formatNumber(lowStock));

  renderBreakdownList(elements.analyticsCategoryList, buildCountMap(state.products, 'category'), 'Sem categorias para mostrar.');
  renderBreakdownList(elements.analyticsStatusList, buildCountMap(state.orders, 'status', getStatusText), 'Sem status para mostrar.');

  const topCustomers = [...state.customers]
    .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
    .slice(0, 5);

  renderStackList(elements.topCustomersList, topCustomers, (customer) => `
    <article class="stack-row">
      <div>
        <strong>${escapeHtml(customer.name || 'Cliente')}</strong>
        <p>${escapeHtml(customer.email || 'Sem email')}</p>
      </div>
      <div class="stack-meta">
        <span>${formatNumber(customer.orders_count)} pedidos</span>
        <strong>${formatCurrency(customer.total_spent)}</strong>
      </div>
    </article>
  `, 'Sem historico de clientes para ordenar.');
}

function handleProductsTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === 'edit-product') openProductModal(findById(state.products, id));
  if (button.dataset.action === 'delete-product') deleteProduct(id);
}

function handleOrdersTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === 'edit-order') openOrderModal(findById(state.orders, id));
  if (button.dataset.action === 'delete-order') deleteOrder(id);
}

function handleCustomersTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === 'edit-customer') openCustomerModal(findById(state.customers, id));
  if (button.dataset.action === 'delete-customer') deleteCustomer(id);
}
function openProductModal(product = null) {
  elements.productForm.reset();
  elements.productId.value = product?.id || '';
  elements.productExistingImage.value = product?.image || '';
  elements.productModalTitle.textContent = product ? 'Editar produto' : 'Novo produto';
  document.getElementById('product-name').value = product?.name || '';
  document.getElementById('product-category').value = product?.category || 'roupas';
  document.getElementById('product-description').value = product?.description || '';
  document.getElementById('product-price').value = product?.price || '';
  document.getElementById('product-stock').value = product?.stock_quantity || 0;
  document.getElementById('product-status').value = product?.is_active === false ? 'inactive' : 'active';
  updateProductPreview(product?.image ? getImageUrl(product.image) : '', product?.name || '');
  openModal('product-modal');
}

function openOrderModal(order) {
  if (!order) return;
  elements.orderForm.reset();
  elements.orderId.value = order.id;
  text('order-detail-customer', order.customer_name || 'Cliente nao identificado');
  text('order-detail-total', formatCurrency(order.total_amount));
  text('order-detail-email', order.customer_email || 'Sem email');
  text('order-detail-date', formatDate(order.created_at));
  document.getElementById('order-status').value = order.status || 'pending';
  document.getElementById('order-payment-method').value = order.payment_method || '';
  document.getElementById('order-shipping-address').value = order.shipping_address || '';
  document.getElementById('order-notes').value = order.notes || '';
  openModal('order-modal');
}

function openCustomerModal(customer = null) {
  elements.customerForm.reset();
  const isEdit = Boolean(customer);
  elements.customerMode.value = isEdit ? 'edit' : 'create';
  elements.customerId.value = customer?.id || '';
  elements.customerModalTitle.textContent = isEdit ? 'Editar cliente' : 'Novo cliente';
  document.getElementById('customer-full-name').value = customer?.name || '';
  document.getElementById('customer-username').value = customer?.username || '';
  document.getElementById('customer-email').value = customer?.email || '';
  document.getElementById('customer-phone').value = customer?.phone || '';
  document.getElementById('customer-address').value = customer?.address || '';
  document.getElementById('customer-city').value = customer?.city || '';
  document.getElementById('customer-state').value = customer?.state || '';
  document.getElementById('customer-zip-code').value = customer?.zip_code || '';
  elements.customerIsActive.checked = customer?.is_active !== false;
  elements.customerPassword.required = !isEdit;
  elements.customerPasswordGroup.classList.toggle('is-hidden', isEdit);
  elements.customerActiveField.classList.toggle('is-hidden', !isEdit);
  openModal('customer-modal');
}

async function handleProductSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.productForm);
  const id = formData.get('product_id');
  let image = formData.get('existing_image') || '';
  const imageFile = formData.get('image');

  try {
    if (imageFile && imageFile.size > 0) {
      image = await uploadImage(imageFile);
    }

    const payload = {
      name: formData.get('name')?.trim(),
      description: formData.get('description')?.trim(),
      category: formData.get('category'),
      price: Number(formData.get('price')),
      stock_quantity: Number(formData.get('stock_quantity') || 0),
      image,
      status: formData.get('status') || 'active'
    };

    if (id) {
      await apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Produto atualizado com sucesso.', 'success');
    } else {
      await apiRequest('/products', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Produto criado com sucesso.', 'success');
    }

    closeModal('product-modal');
    await refreshAllData({ notify: false });
  } catch (error) {
    console.error('Erro ao guardar produto:', error);
    showToast(error.message || 'Nao foi possivel guardar o produto.', 'error');
  }
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.orderForm);
  const id = formData.get('order_id');
  const payload = {
    status: formData.get('status'),
    payment_method: formData.get('payment_method')?.trim(),
    shipping_address: formData.get('shipping_address')?.trim(),
    notes: formData.get('notes')?.trim()
  };

  try {
    await apiRequest(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    closeModal('order-modal');
    await refreshAllData({ notify: false });
    showToast('Pedido atualizado com sucesso.', 'success');
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    showToast(error.message || 'Nao foi possivel atualizar o pedido.', 'error');
  }
}

async function handleCustomerSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.customerForm);
  const mode = formData.get('customer_mode');
  const id = formData.get('customer_id');
  const payload = {
    full_name: formData.get('full_name')?.trim(),
    username: formData.get('username')?.trim(),
    email: formData.get('email')?.trim(),
    phone: formData.get('phone')?.trim(),
    address: formData.get('address')?.trim(),
    city: formData.get('city')?.trim(),
    state: formData.get('state')?.trim(),
    zip_code: formData.get('zip_code')?.trim()
  };

  try {
    if (mode === 'create') {
      payload.password = formData.get('password');
      await apiRequest('/customers', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Cliente criado com sucesso.', 'success');
    } else {
      payload.is_active = elements.customerIsActive.checked;
      await apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Cliente atualizado com sucesso.', 'success');
    }

    closeModal('customer-modal');
    await refreshAllData({ notify: false });
  } catch (error) {
    console.error('Erro ao guardar cliente:', error);
    showToast(error.message || 'Nao foi possivel guardar o cliente.', 'error');
  }
}

async function deleteProduct(id) {
  if (!window.confirm('Deseja desativar este produto?')) return;
  try {
    await apiRequest(`/products/${id}`, { method: 'DELETE' });
    await refreshAllData({ notify: false });
    showToast('Produto removido da listagem ativa.', 'success');
  } catch (error) {
    console.error('Erro ao remover produto:', error);
    showToast(error.message || 'Nao foi possivel remover o produto.', 'error');
  }
}

async function deleteOrder(id) {
  if (!window.confirm('Deseja excluir este pedido?')) return;
  try {
    await apiRequest(`/orders/${id}`, { method: 'DELETE' });
    await refreshAllData({ notify: false });
    showToast('Pedido excluido com sucesso.', 'success');
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    showToast(error.message || 'Nao foi possivel excluir o pedido.', 'error');
  }
}

async function deleteCustomer(id) {
  if (!window.confirm('Deseja desativar este cliente?')) return;
  try {
    await apiRequest(`/customers/${id}`, { method: 'DELETE' });
    await refreshAllData({ notify: false });
    showToast('Cliente desativado com sucesso.', 'success');
  } catch (error) {
    console.error('Erro ao desativar cliente:', error);
    showToast(error.message || 'Nao foi possivel desativar o cliente.', 'error');
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
}

function previewSelectedImage() {
  const file = elements.productImageInput?.files?.[0];
  if (!file) {
    updateProductPreview(elements.productExistingImage.value ? getImageUrl(elements.productExistingImage.value) : '', '');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => updateProductPreview(reader.result, file.name);
  reader.readAsDataURL(file);
}

function updateProductPreview(src, label) {
  const finalSrc = src || PLACEHOLDER_IMAGE;
  elements.productImagePreview.src = finalSrc;
  elements.productImageCaption.textContent = label ? `Imagem pronta: ${label}` : 'Nenhuma imagem selecionada.';
  elements.productImagePreview.onerror = () => {
    elements.productImagePreview.onerror = null;
    elements.productImagePreview.src = PLACEHOLDER_IMAGE;
  };
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.settingsForm);
  state.settings = {
    store_name: String(formData.get('store_name') || '').trim(),
    contact_email: String(formData.get('contact_email') || '').trim(),
    contact_phone: String(formData.get('contact_phone') || '').trim(),
    support_hours: String(formData.get('support_hours') || '').trim(),
    store_address: String(formData.get('store_address') || '').trim(),
    announcement: String(formData.get('announcement') || '').trim()
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  elements.settingsFeedback.textContent = 'Configuracoes guardadas neste navegador.';
  showToast('Configuracoes atualizadas localmente.', 'success');
}

function resetSettingsForm() {
  state.settings = { ...DEFAULT_SETTINGS };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  hydrateSettingsForm();
  elements.settingsFeedback.textContent = 'Valores padrao restaurados.';
}

function hydrateSettingsForm() {
  if (!elements.settingsForm) return;
  Object.entries(state.settings).forEach(([key, value]) => {
    const field = elements.settingsForm.querySelector(`[name="${key}"]`);
    if (field) field.value = value;
  });
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function renderStackList(container, items, template, emptyMessage) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<p class="empty-inline">${escapeHtml(emptyMessage)}</p>`;
    return;
  }
  container.innerHTML = items.map(template).join('');
}

function renderBreakdownList(container, map, emptyMessage) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  renderStackList(container, entries, ([label, value]) => `
    <article class="stack-row">
      <div><strong>${escapeHtml(label || 'Sem categoria')}</strong></div>
      <div class="stack-meta"><strong>${formatNumber(value)}</strong></div>
    </article>
  `, emptyMessage);
}

function buildCountMap(items, key, labelFormatter = (value) => normalizeLabel(value)) {
  return items.reduce((acc, item) => {
    const rawValue = item?.[key] || 'Sem registo';
    const label = labelFormatter(rawValue);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function updateLastSyncLabel() {
  if (!elements.lastSync || !state.lastSync) return;
  elements.lastSync.textContent = `Ultima atualizacao: ${formatDate(state.lastSync.toISOString())}`;
}

function getImageUrl(imagePath) {
  if (!imagePath) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//.test(imagePath) || imagePath.startsWith('data:')) return imagePath;
  return `${API_ORIGIN}${imagePath}`;
}

function applyImageFallbacks(scope) {
  scope?.querySelectorAll('[data-product-image]').forEach((image) => {
    image.onerror = () => {
      image.onerror = null;
      image.src = PLACEHOLDER_IMAGE;
    };
  });
}

function findById(items, id) {
  return items.find((item) => Number(item.id) === Number(id));
}

function toggleEmptyState(element, isVisible) {
  element?.classList.toggle('hidden', !isVisible);
}

function showToast(message, type = 'info') {
  if (!elements.toastStack) return;
  const toast = document.createElement('article');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elements.toastStack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3500);
}

function getStatusText(status) {
  return {
    pending: 'Pendente',
    processing: 'Processando',
    completed: 'Concluido',
    cancelled: 'Cancelado'
  }[status] || normalizeLabel(status || 'Sem estado');
}

function statusClass(status) {
  return {
    pending: 'status-warning',
    processing: 'status-info',
    completed: 'status-success',
    cancelled: 'status-danger'
  }[status] || 'status-neutral';
}

function formatCurrency(value) {
  return `AOA ${Number(value || 0).toLocaleString('pt-PT', { maximumFractionDigits: 0 })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-PT');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data invalida';
  return date.toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' });
}

function truncateText(value, maxLength) {
  if (!value || value.length <= maxLength) return value || '';
  return `${value.slice(0, maxLength - 1)}...`;
}

function normalizeLabel(value) {
  return String(value || 'Sem registo')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function text(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function isWithinDays(dateValue, days) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const diff = Date.now() - date.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function isCurrentMonth(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

