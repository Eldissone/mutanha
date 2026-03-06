const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

let userToken = localStorage.getItem('userToken');
let userData = parseSafeJson(localStorage.getItem('userData'));

let allProducts = [];
let filteredProducts = [];
let cartItems = [];
let currentProduct = null;
let cartOverlay = null;

let currentFilters = {
  category: '',
  priceRange: '',
  minPrice: '',
  maxPrice: '',
  sort: '',
  search: ''
};

const CATEGORY_ALIASES = {
  roupas: ['roupa', 'roupas', 'vestuario', 'vestuario feminino', 'vestuario masculino'],
  calcados: ['calcado', 'calcados', 'tenis', 'sapato', 'sapatos', 'boots'],
  acessorios: ['acessorio', 'acessorios', 'acessorios fitness', 'acessorios de treino'],
  equipamentos: ['equipamento', 'equipamentos', 'equipamento de treino']
};

document.addEventListener('DOMContentLoaded', () => {
  syncSessionFromStorage();
  loadUserActions();
  setupEventListeners();
  initializeDefaultCategory();
  initializeSearchFromQuery();
  loadProducts();

  if (isUserLoggedIn()) {
    loadCart();
  }
});

function parseSafeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeCategory(value) {
  const normalized = normalizeText(value);
  if (!normalized) return '';

  const compact = normalized.replace(/\s+/g, ' ');

  for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (canonical === compact || aliases.includes(compact)) {
      return canonical;
    }
  }

  if (compact.includes('roup')) return 'roupas';
  if (compact.includes('calc') || compact.includes('tenis') || compact.includes('sapato')) return 'calcados';
  if (compact.includes('acessor')) return 'acessorios';
  if (compact.includes('equip')) return 'equipamentos';
  return compact;
}

function getDefaultCategoryFromPage() {
  const body = document.body;
  if (!body || !body.dataset.defaultCategory) return '';
  return normalizeCategory(body.dataset.defaultCategory);
}

function initializeDefaultCategory() {
  const defaultCategory = getDefaultCategoryFromPage();
  if (defaultCategory) {
    currentFilters.category = defaultCategory;
  }
}

function initializeSearchFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || '').trim();
  if (!query) return;

  currentFilters.search = query;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = query;
  }
}

function syncSessionFromStorage() {
  userToken = localStorage.getItem('userToken');
  userData = parseSafeJson(localStorage.getItem('userData'));
}

function isUserLoggedIn() {
  return Boolean(userToken && userData);
}

function getImageUrl(imagePath) {
  if (!imagePath) return `${API_ORIGIN}/uploads/default-product.jpg`;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return `${API_ORIGIN}${imagePath}`;
}

function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.notification-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function loadUserActions() {
  const userActions = document.getElementById('userActions');
  if (!userActions) return;

  if (isUserLoggedIn()) {
    const initial = (userData.full_name || userData.username || 'U').charAt(0).toUpperCase();
    const avatarStyle = userData.avatar
      ? `style="background-image: url('${userData.avatar}');"`
      : '';
    const avatarContent = userData.avatar ? '<span class="cat-sr-only">Meu perfil</span>' : initial;

    userActions.innerHTML = `
      <button onclick="viewCart()" class="cat-action-btn" type="button">
        <div class="text-[#1b130d]" data-icon="ShoppingBag" data-size="20px" data-weight="regular">
          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
            <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
          </svg>
        </div>
        <span id="cartCount">0</span>
      </button>
      <button onclick="logout()" class="cat-action-btn cat-action-accent" type="button">Sair</button>
      <button onclick="showProfileModal()" title="Meu perfil" class="cat-avatar-btn" type="button" ${avatarStyle}>
        ${avatarContent}
      </button>
    `;

    updateCartCount();
    return;
  }

  userActions.innerHTML = `
    <button onclick="showModal('loginModal')" class="cat-action-btn" type="button">Login</button>
    <button onclick="showModal('registerModal')" class="cat-action-btn cat-action-accent" type="button">Registrar</button>
  `;
}

async function loadProducts() {
  try {
    let response = await fetch(`${API_BASE_URL}/public/all-products`);

    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/public/products`);
    }

    if (!response.ok) {
      throw new Error('Falha ao carregar produtos');
    }

    const payload = await response.json();
    allProducts = Array.isArray(payload) ? payload : [];
    filteredProducts = [...allProducts];
    applyFilters();
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    showToast('Erro ao carregar produtos', 'error');
  }
}

function displayProducts() {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;

  productsGrid.innerHTML = '';

  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = `
      <article class="cat-empty-card">Nenhum produto encontrado</article>
    `;
    return;
  }

  filteredProducts.forEach((product) => {
    const productCard = document.createElement('div');
    productCard.className = 'cat-product-card';

    const brandText = String(product.brand || product.category || 'Mutanha').toUpperCase();
    productCard.innerHTML = `
      <button type="button" class="cat-product-image"
           style="background-image: url('${getImageUrl(product.image)}')"
           onclick="viewProduct(${product.id})">
      </button>
      <p class="cat-product-brand">${brandText}</p>
      <p class="cat-product-name">${product.name}</p>
      <p class="cat-product-price">AOA ${Number(product.price || 0).toLocaleString()}</p>
      <button type="button" onclick="addToCart(${product.id})" class="cat-product-btn">Adicionar ao Carrinho</button>
    `;
    productsGrid.appendChild(productCard);
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      currentFilters.search = event.target.value;
      applyFilters();
    });
  }

  setupCategoryTabs();
  setupFilterDropdown('categoryFilter', 'categoryOptions', 'category', 'category');
  setupFilterDropdown('priceFilter', 'priceOptions', 'priceRange', 'price');
  setupFilterDropdown('sortFilter', 'sortOptions', 'sort', 'sort');

  const applyPriceRangeBtn = document.getElementById('applyPriceRange');
  if (applyPriceRangeBtn) {
    applyPriceRangeBtn.addEventListener('click', () => {
      const minPriceInput = document.getElementById('minPrice');
      const maxPriceInput = document.getElementById('maxPrice');

      currentFilters.minPrice = minPriceInput ? minPriceInput.value : '';
      currentFilters.maxPrice = maxPriceInput ? maxPriceInput.value : '';
      applyFilters();
    });
  }

  const clearFiltersBtn = document.getElementById('clearFilters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  const productModal = document.getElementById('productDetailModal');
  if (productModal) {
    productModal.addEventListener('click', (event) => {
      if (event.target === productModal) {
        closeModal('productDetailModal');
      }
    });
  }

  window.addEventListener('click', (event) => {
    const modal = event.target;
    if (!modal || !modal.id || !modal.id.toLowerCase().endsWith('modal')) return;
    if (modal.classList.contains('hidden')) return;
    if (event.target === modal) {
      closeModal(modal.id);
    }
  });

  updateCategoryTabsState();
}

function setupCategoryTabs() {
  const tabs = Array.from(document.querySelectorAll('[data-tab-category]'));
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextCategory = normalizeCategory(tab.dataset.tabCategory || '');
      currentFilters.category = nextCategory;
      applyFilters();
    });
  });
}

function updateCategoryTabsState() {
  const tabs = Array.from(document.querySelectorAll('[data-tab-category]'));
  if (!tabs.length) return;

  const activeCategory = normalizeCategory(currentFilters.category);
  tabs.forEach((tab) => {
    const tabCategory = normalizeCategory(tab.dataset.tabCategory || '');
    tab.classList.toggle('is-active', tabCategory === activeCategory);
  });
}

function setupFilterDropdown(buttonId, optionsId, filterType, datasetKey) {
  const button = document.getElementById(buttonId);
  const options = document.getElementById(optionsId);
  if (!button || !options) return;

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    options.classList.toggle('hidden');
  });

  options.addEventListener('click', (event) => {
    const target = event.target;
    if (!target.classList.contains('filter-option')) return;

    const rawValue = target.dataset[datasetKey] || '';
    const value = filterType === 'category' ? normalizeCategory(rawValue) : rawValue;
    currentFilters[filterType] = value;
    applyFilters();
    options.classList.add('hidden');
  });

  document.addEventListener('click', () => {
    options.classList.add('hidden');
  });
}

function applyFilters() {
  filteredProducts = allProducts.filter((product) => {
    const normalizedName = (product.name || '').toLowerCase();
    const normalizedSearch = currentFilters.search.toLowerCase();
    const productPrice = Number(product.price || 0);

    if (normalizedSearch && !normalizedName.includes(normalizedSearch)) {
      return false;
    }

    const activeCategory = normalizeCategory(currentFilters.category);
    if (activeCategory) {
      const productCategory = normalizeCategory(product.category);
      if (productCategory !== activeCategory) {
        return false;
      }
    }

    if (currentFilters.minPrice || currentFilters.maxPrice) {
      const min = currentFilters.minPrice ? Number.parseFloat(currentFilters.minPrice) : 0;
      const max = currentFilters.maxPrice ? Number.parseFloat(currentFilters.maxPrice) : Number.POSITIVE_INFINITY;

      if (productPrice < min || productPrice > max) {
        return false;
      }
    }

    if (currentFilters.priceRange) {
      if (currentFilters.priceRange === '0-5000' && productPrice > 5000) return false;
      if (currentFilters.priceRange === '5000-15000' && (productPrice < 5000 || productPrice > 15000)) return false;
      if (currentFilters.priceRange === '15000-30000' && (productPrice < 15000 || productPrice > 30000)) return false;
      if (currentFilters.priceRange === '30000+' && productPrice < 30000) return false;
    }

    return true;
  });

  if (currentFilters.sort) {
    filteredProducts.sort((a, b) => {
      if (currentFilters.sort === 'price-asc') return Number(a.price) - Number(b.price);
      if (currentFilters.sort === 'price-desc') return Number(b.price) - Number(a.price);
      if (currentFilters.sort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (currentFilters.sort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
  }

  displayProducts();
  updateProductCount();
  updateCategoryTabsState();
}

function clearAllFilters() {
  const defaultCategory = getDefaultCategoryFromPage();
  currentFilters = {
    category: defaultCategory,
    priceRange: '',
    minPrice: '',
    maxPrice: '',
    sort: '',
    search: ''
  };

  const searchInput = document.getElementById('searchInput');
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');

  if (searchInput) searchInput.value = '';
  if (minPriceInput) minPriceInput.value = '';
  if (maxPriceInput) maxPriceInput.value = '';

  applyFilters();
}

function updateProductCount() {
  const productCount = document.getElementById('productCount');
  if (!productCount) return;

  const count = filteredProducts.length;
  const total = allProducts.length;
  productCount.textContent = `Mostrando ${count} de ${total} produtos`;
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('active');

  if (modalId === 'productDetailModal') {
    currentProduct = null;
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  const username = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    showToast('Preencha usuario/email e senha', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || 'Credenciais invalidas', 'error');
      return;
    }

    if (data.user?.role === 'admin') {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('adminLoggedIn', 'true');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      closeModal('loginModal');
      showToast('Login de administrador realizado com sucesso', 'success');
      setTimeout(() => {
        window.location.href = '../admin/index.html';
      }, 300);
      return;
    } else {
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminLoggedIn');
    }

    syncSessionFromStorage();
    closeModal('loginModal');
    loadUserActions();
    await loadCart();

    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    showToast('Login realizado com sucesso', 'success');
  } catch (error) {
    console.error('Erro no login:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const fullNameInput = document.getElementById('registerName');
  const emailInput = document.getElementById('registerEmail');
  const passwordInput = document.getElementById('registerPassword');

  const fullName = fullNameInput ? fullNameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!fullName || !email || !password) {
    showToast('Preencha os campos obrigatorios', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: email.split('@')[0],
        email,
        password,
        full_name: fullName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || 'Nao foi possivel concluir o cadastro', 'error');
      return;
    }

    closeModal('registerModal');
    showModal('loginModal');

    if (fullNameInput) fullNameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    showToast('Conta criada com sucesso. Faça login para continuar.', 'success');
  } catch (error) {
    console.error('Erro no cadastro:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

function logout() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminLoggedIn');
  userToken = null;
  userData = null;
  cartItems = [];

  loadUserActions();
  updateCartCount();
  closeCartOverlay();
  closeModal('profileModal');
  showToast('Logout realizado com sucesso', 'success');
}

async function loadCart() {
  if (!isUserLoggedIn()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });

    if (!response.ok) {
      cartItems = [];
      updateCartCount();
      return;
    }

    cartItems = await response.json();
    updateCartCount();
  } catch (error) {
    console.error('Erro ao carregar carrinho:', error);
  }
}

function updateCartCount() {
  const cartCount = document.getElementById('cartCount');
  if (!cartCount) return;

  const totalItems = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  cartCount.textContent = String(totalItems);
}

async function addToCart(productId, quantity = 1) {
  if (!isUserLoggedIn()) {
    showModal('loginModal');
    showToast('Faça login para adicionar produtos ao carrinho', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ product_id: productId, quantity })
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.error || 'Erro ao adicionar ao carrinho', 'error');
      return;
    }

    await loadCart();
    showToast('Produto adicionado ao carrinho', 'success');
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

async function removeCartItem(itemId) {
  if (!isUserLoggedIn()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/cart/remove/${itemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.error || 'Erro ao remover item', 'error');
      return;
    }

    await loadCart();
    viewCart();
    showToast('Item removido do carrinho', 'success');
  } catch (error) {
    console.error('Erro ao remover item:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

async function viewCart() {
  if (!isUserLoggedIn()) {
    showModal('loginModal');
    showToast('Faca login para ver o carrinho', 'warning');
    return;
  }

  await loadCart();

  if (cartItems.length === 0) {
    showToast('Carrinho vazio', 'info');
    return;
  }

  const total = cartItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

  const cartItemsHtml = cartItems.map((item) => `
    <div class="cat-cart-item">
      <div class="cat-cart-item-copy">
        <p class="cat-cart-item-name">${item.name}</p>
        <p class="cat-cart-item-meta">Qtd: ${item.quantity} | AOA ${Number(item.total_price).toLocaleString()}</p>
      </div>
      <button onclick="removeCartItem(${item.id})" class="cat-cart-remove-btn" type="button">Remover</button>
    </div>
  `).join('');

  closeCartOverlay();

  cartOverlay = document.createElement('div');
  cartOverlay.className = 'cat-modal';
  cartOverlay.innerHTML = `
    <div class="cat-dialog cat-cart-dialog">
      <button type="button" class="cat-modal-close" onclick="closeCartOverlay()">&times;</button>
      <h3>Seu Carrinho</h3>

      <div class="cat-cart-list">${cartItemsHtml}</div>

      <div class="cat-cart-footer">
        <div class="cat-cart-total">
          <span>Total:</span>
          <strong>AOA ${total.toLocaleString()}</strong>
        </div>

        <div class="cat-form-grid">
          <label class="cat-field">
            <span>Metodo de pagamento</span>
            <select id="quick-payment-method">
              <option value="">Selecionar metodo</option>
              <option value="Cartao de Credito">Cartao de Credito</option>
              <option value="Cartao de Debito">Cartao de Debito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferencia Bancaria">Transferencia Bancaria</option>
              <option value="Multicaixa Express">Multicaixa Express</option>
            </select>
          </label>
          <label class="cat-field">
            <span>Endereco de entrega</span>
            <textarea id="quick-shipping-address" rows="2" placeholder="Opcional"></textarea>
          </label>
          <label class="cat-field">
            <span>Observacoes</span>
            <textarea id="quick-order-notes" rows="2" placeholder="Opcional"></textarea>
          </label>
        </div>

        <button onclick="processQuickCheckout()" class="cat-primary-btn cat-full-btn" type="button">
          Finalizar Pedido
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(cartOverlay);
}

function closeCartOverlay() {
  if (!cartOverlay) return;
  cartOverlay.remove();
  cartOverlay = null;
}

async function processQuickCheckout() {
  if (!isUserLoggedIn()) {
    showModal('loginModal');
    return;
  }

  if (cartItems.length === 0) {
    showToast('Carrinho vazio', 'info');
    return;
  }

  const paymentMethodEl = document.getElementById('quick-payment-method');
  const shippingAddressEl = document.getElementById('quick-shipping-address');
  const notesEl = document.getElementById('quick-order-notes');

  const paymentMethod = paymentMethodEl ? paymentMethodEl.value.trim() : '';
  const shippingAddress = shippingAddressEl ? shippingAddressEl.value.trim() : '';
  const notes = notesEl ? notesEl.value.trim() : '';

  if (!paymentMethod) {
    showToast('Selecione um metodo de pagamento', 'warning');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        notes
      })
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.error || 'Erro ao criar pedido', 'error');
      return;
    }

    cartItems = [];
    updateCartCount();
    closeCartOverlay();
    closeModal('productDetailModal');
    showToast(`Pedido #${result.order_id} criado com sucesso`, 'success');
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

function viewProduct(productId) {
  const product = allProducts.find((item) => Number(item.id) === Number(productId));
  if (!product) {
    showToast('Produto nao encontrado', 'error');
    return;
  }

  currentProduct = product;
  showProductModal(product);
}

function showProductModal(product) {
  const modalProductName = document.getElementById('modalProductName');
  const modalProductTitle = document.getElementById('modalProductTitle');
  const modalProductPrice = document.getElementById('modalProductPrice');
  const modalProductCategory = document.getElementById('modalProductCategory');
  const modalProductDescription = document.getElementById('modalProductDescription');

  if (modalProductName) modalProductName.textContent = product.name;
  if (modalProductTitle) modalProductTitle.textContent = product.name;
  if (modalProductPrice) modalProductPrice.textContent = `AOA ${Number(product.price || 0).toLocaleString()}`;
  if (modalProductCategory) modalProductCategory.textContent = product.category || 'Sem categoria';
  if (modalProductDescription) modalProductDescription.textContent = product.description || 'Descricao nao disponivel';

  const mainImage = document.getElementById('modalProductImage');
  if (mainImage) {
    mainImage.style.backgroundImage = `url('${getImageUrl(product.image)}')`;
  }

  const thumbnails = [
    document.getElementById('modalThumbnail1'),
    document.getElementById('modalThumbnail2'),
    document.getElementById('modalThumbnail3')
  ].filter(Boolean);

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.style.backgroundImage = `url('${getImageUrl(product.image)}')`;
    thumbnail.onclick = () => selectThumbnail(index);
    thumbnail.classList.toggle('is-active', index === 0);
  });

  const quantityInput = document.getElementById('modalQuantity');
  const sizeInput = document.getElementById('modalSize');

  if (quantityInput) quantityInput.value = '1';
  if (sizeInput) sizeInput.value = '';

  showModal('productDetailModal');
}

function increaseQuantity() {
  const quantityInput = document.getElementById('modalQuantity');
  if (!quantityInput) return;

  const currentValue = Number.parseInt(quantityInput.value, 10) || 1;
  quantityInput.value = String(currentValue + 1);
}

function decreaseQuantity() {
  const quantityInput = document.getElementById('modalQuantity');
  if (!quantityInput) return;

  const currentValue = Number.parseInt(quantityInput.value, 10) || 1;
  if (currentValue > 1) {
    quantityInput.value = String(currentValue - 1);
  }
}

function selectThumbnail(index) {
  const thumbnails = [
    document.getElementById('modalThumbnail1'),
    document.getElementById('modalThumbnail2'),
    document.getElementById('modalThumbnail3')
  ].filter(Boolean);

  thumbnails.forEach((thumbnail, thumbIndex) => {
    thumbnail.classList.toggle('is-active', thumbIndex === index);
  });

  const selectedThumbnail = thumbnails[index];
  const mainImage = document.getElementById('modalProductImage');
  if (selectedThumbnail && mainImage) {
    mainImage.style.backgroundImage = selectedThumbnail.style.backgroundImage;
  }
}

async function addToCartFromModal() {
  if (!currentProduct) {
    showToast('Selecione um produto primeiro', 'warning');
    return;
  }

  const quantityInput = document.getElementById('modalQuantity');
  const quantity = Number.parseInt(quantityInput ? quantityInput.value : '1', 10) || 1;

  await addToCart(currentProduct.id, quantity);
}

async function buyNow() {
  if (!currentProduct) {
    showToast('Selecione um produto primeiro', 'warning');
    return;
  }

  const quantityInput = document.getElementById('modalQuantity');
  const quantity = Number.parseInt(quantityInput ? quantityInput.value : '1', 10) || 1;

  await addToCart(currentProduct.id, quantity);
  closeModal('productDetailModal');
  viewCart();
}

function showProfileModal() {
  if (!isUserLoggedIn()) {
    showModal('loginModal');
    return;
  }

  const avatarDiv = document.getElementById('profile-avatar');
  const nameDiv = document.getElementById('profile-name');
  const emailDiv = document.getElementById('profile-email');

  if (avatarDiv) {
    if (userData.avatar) {
      avatarDiv.style.backgroundImage = `url('${userData.avatar}')`;
      avatarDiv.textContent = '';
    } else {
      avatarDiv.style.backgroundImage = '';
      avatarDiv.textContent = (userData.full_name || userData.username || 'U').charAt(0).toUpperCase();
    }
  }

  if (nameDiv) nameDiv.textContent = userData.full_name || userData.username || 'Usuario';
  if (emailDiv) emailDiv.textContent = userData.email || '';

  showModal('profileModal');
}

function openSettings() {
  showToast('Configuracoes do perfil em breve', 'info');
}

