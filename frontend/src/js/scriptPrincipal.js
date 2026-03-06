const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
const IS_PUBLIC_PAGE = window.location.pathname.includes('/public/');

let userToken = localStorage.getItem('userToken');
let userData = parseSafeJson(localStorage.getItem('userData'));
let cartItems = [];
let allProducts = [];
let currentProductIndex = 0;
let currentRating = 0;
let activeReviewId = null;
let activeCartOverlay = null;

let reviews = [
  {
    id: 1,
    user: {
      name: 'Sofia Carvalho',
      email: 'sofia@email.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAI2ud4dn_HmZ4i34PyQUwh5jcsw4Z8oJBOsmO6Zrb9jtGhfd31tHMBos9XbQDhPsK5ntoPua3GlW31w-DGp4otP4pq9i3AP3dTmca3Io5PexmvxCixXW9Q2g539lmJzUGfTrLWIsKFg-Q3pPzRZOlbKMbAIN3iiWFdYB5g9oY5IJB03bK4LVMFn5ypSWf726iP5LDqXKrh4Q6wpq4IY5zNSFf00ulTSao9ZUUtWl6CqdCU9m0Lmz1PO-2aXBlyfIQV77WdbSKbsfo'
    },
    rating: 5,
    comment: 'Adorei a qualidade das pecas. Vestem muito bem e sao confortaveis.',
    category: 'qualidade',
    product: null,
    date: '2 meses atras',
    helpful: 12,
    notHelpful: 2
  },
  {
    id: 2,
    user: {
      name: 'Olivia Bennett',
      email: 'olivia@email.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzf8fAYZhix9tcl2-Ie1qrdzjFfziEkiAPID-HNyKwfESLRxdEXs_9VuHavdeC8w8BMmpO9mYUWQL0_bwpJXTB5Fu0TYA-q1kAtGqW2w7uxNP8sT8v5yRqXZPyb7WO8WXFcvxgK8anbRkXGn_t5tD_2czNCTQe2qCBbqznu6IBOkGrb4NQ3gPt7nm9X29CqcWF-pIN0Iq_rPCIFzyUrBPjLb3EEw8YKbHtydRmrvwOO3qt6QjcADMNA_cYwFcWml-n1D7gNjQI5dk'
    },
    rating: 4,
    comment: 'Boa experiencia geral. Entrega dentro do prazo e bom acabamento.',
    category: 'geral',
    product: null,
    date: '3 meses atras',
    helpful: 8,
    notHelpful: 1
  },
  {
    id: 3,
    user: {
      name: 'Ava Harper',
      email: 'ava@email.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDc-D3HJ9IJa6DtajGi6FtaVAcOLvVRFyL3xlicK56oI1BD289gDaeAoXGltA-y83dA5sgSmo01stBhuYMZta7Pv7-8m02-M_-Xcvothqa5QX8A4kgX9Du2F3GzHz8KwsZvvTdFvqaavhgWDaEAlyNlFx7E4rrK_Y0qIol_0rkmOKuIe6iZrRUZ18OhndEorDtglOMv7R-LrIpmlU2Txr1hvdszNVHDBoQ93d36D8brVFIdfpW7TK6OeqMeDOHDHAi064V7zCPHXr0'
    },
    rating: 5,
    comment: 'Atendimento excelente e produtos de alta qualidade.',
    category: 'atendimento',
    product: null,
    date: '4 meses atras',
    helpful: 15,
    notHelpful: 0
  }
];

document.addEventListener('DOMContentLoaded', () => {
  syncSessionFromStorage();
  setupHeroSlider();
  setupArrivalsTabs();
  loadUserActions();

  if (isUserLoggedIn()) {
    loadCart();
  }

  setupReviewForm();

  if (document.getElementById('reviews-container')) {
    loadReviews();
  }

  if (document.getElementById('featured-products') || document.getElementById('new-products')) {
    initializeProducts();
  }

  window.addEventListener('click', (event) => {
    const modal = event.target;
    if (!modal || !modal.id || !modal.id.toLowerCase().endsWith('modal')) return;
    if (modal.classList.contains('hidden')) return;
    if (event.target === modal) {
      closeModal(modal.id);
    }
  });
});

function setupHeroSlider() {
  const heroImage = document.querySelector('.mix-hero-bg');
  const heroKicker = document.querySelector('.mix-kicker');
  const heroTitle = document.querySelector('.mix-hero-content h1');
  const heroCta = document.querySelector('.mix-cta');
  const prevButton = document.querySelector('.mix-hero-arrow.mix-left');
  const nextButton = document.querySelector('.mix-hero-arrow.mix-right');

  if (!heroImage || !heroKicker || !heroTitle || !heroCta || !prevButton || !nextButton) return;

  const slides = [
    {
      image: 'src/IMG/IMG2.jpg',
      kicker: 'URBAN EDGE',
      title: 'Jackets for the Modern Man',
      ctaLabel: 'Discovery Now',
      ctaHref: 'public/roupas.html'
    },
    {
      image: 'src/IMG/IMG3.jpg',
      kicker: 'NEW SEASON',
      title: 'Contemporary Looks for Everyday Style',
      ctaLabel: 'Shop Collection',
      ctaHref: 'public/roupas.html'
    },
    {
      image: 'src/IMG/m.jpg',
      kicker: 'ACCESSORY DROP',
      title: 'Statement Pieces for City Nights',
      ctaLabel: 'View Accessories',
      ctaHref: 'public/acess.html'
    }
  ];

  let activeIndex = 0;

  const renderSlide = () => {
    const slide = slides[activeIndex];
    heroImage.src = slide.image;
    heroKicker.textContent = slide.kicker;
    heroTitle.textContent = slide.title;
    heroCta.textContent = slide.ctaLabel;
    heroCta.href = slide.ctaHref;
  };

  prevButton.addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + slides.length) % slides.length;
    renderSlide();
  });

  nextButton.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % slides.length;
    renderSlide();
  });

  renderSlide();
}

function setupArrivalsTabs() {
  const tabs = document.querySelectorAll('.mix-tabs button');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((button) => button.classList.remove('is-active'));
      tab.classList.add('is-active');
    });
  });
}

function parseSafeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function syncSessionFromStorage() {
  userToken = localStorage.getItem('userToken');
  userData = parseSafeJson(localStorage.getItem('userData'));
}

function isUserLoggedIn() {
  return Boolean(userToken && userData);
}

function goToLogin() {
  window.location.href = IS_PUBLIC_PAGE ? 'login.html' : 'public/login.html';
}

function goToRegister() {
  window.location.href = IS_PUBLIC_PAGE ? 'register.html' : 'public/register.html';
}

function goToHome() {
  window.location.href = IS_PUBLIC_PAGE ? '../index.html' : 'index.html';
}

function goToAdminPanel() {
  window.location.href = IS_PUBLIC_PAGE ? '../admin/index.html' : 'admin/index.html';
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
  const container = document.getElementById('user-actions') || document.getElementById('userActions');
  if (!container) return;

  if (isUserLoggedIn()) {
    const isAdmin = userData.role === 'admin';
    const adminButton = isAdmin
      ? `
        <button
          class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#250129] hover:text-white transition-colors"
          onclick="goToAdminPanel()">
          <span class="truncate">Admin</span>
        </button>
      `
      : '';

    container.innerHTML = `
      ${adminButton}
      <button
        class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-[#f3ece7] text-[#1b130d] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-[#250129] hover:text-white transition-colors"
        onclick="showCart()">
        <div class="text-[#1b130d] hover:text-white" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
            <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
          </svg>
        </div>
        <span id="cart-count" class="bg-[#250129] text-white rounded-full px-2 py-1 text-xs">0</span>
      </button>
      <button
        class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#250129] hover:text-white transition-colors"
        onclick="logout()">
        <span class="truncate">Sair</span>
      </button>
    `;

    updateCartCount();
    return;
  }

  container.innerHTML = `
    <button
      class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#f3ece7] text-[#1b130d] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#250129] hover:text-white transition-colors"
      onclick="goToLogin()">
      <span class="truncate">Entrar</span>
    </button>
    <button
      class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#250129] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#250129e4] transition-colors"
      onclick="goToRegister()">
      <span class="truncate">Registrar</span>
    </button>
  `;
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
  showToast('Sessao terminada com sucesso', 'success');
}

async function addToCart(productId, quantity = 1) {
  if (!isUserLoggedIn()) {
    showToast('Faca login para adicionar produtos ao carrinho', 'warning');
    goToLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        product_id: productId,
        quantity
      })
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
  const count = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const badge = document.getElementById('cart-count') || document.getElementById('cartCount');
  if (badge) {
    badge.textContent = String(count);
  }
}

function showCart() {
  if (!isUserLoggedIn()) {
    showToast('Faca login para ver o carrinho', 'warning');
    return;
  }

  if (cartItems.length === 0) {
    showToast('Carrinho vazio', 'info');
    return;
  }

  const total = cartItems.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

  const cartContent = cartItems.map((item) => `
    <div class="flex justify-between items-center p-2 border-b">
      <div>
        <p class="font-medium">${item.name}</p>
        <p class="text-sm text-gray-600">Qtd: ${item.quantity}</p>
      </div>
      <p class="font-bold">AOA ${Number(item.total_price).toLocaleString()}</p>
    </div>
  `).join('');

  closeCartOverlay();

  activeCartOverlay = document.createElement('div');
  activeCartOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  activeCartOverlay.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">Carrinho de Compras</h3>
        <button onclick="closeCartOverlay()" class="text-gray-500 hover:text-gray-700">&times;</button>
      </div>
      <div class="max-h-64 overflow-y-auto">${cartContent}</div>
      <div class="border-t pt-4 mt-4">
        <div class="flex justify-between items-center mb-4">
          <span class="font-bold">Total:</span>
          <span class="font-bold">AOA ${total.toLocaleString()}</span>
        </div>
        <button onclick="checkout()" class="w-full bg-[#250129] text-white py-2 px-4 rounded hover:bg-[#250129e4]">
          Finalizar Compra
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(activeCartOverlay);
}

function closeCartOverlay() {
  if (!activeCartOverlay) return;
  activeCartOverlay.remove();
  activeCartOverlay = null;
}

function checkout() {
  if (!isUserLoggedIn()) {
    showToast('Faca login para finalizar a compra', 'warning');
    return;
  }

  if (cartItems.length === 0) {
    showToast('Carrinho vazio', 'info');
    return;
  }

  closeCartOverlay();
  const checkoutModal = document.getElementById('checkout-modal');
  if (!checkoutModal) {
    showToast('Continue a compra na pagina inicial', 'info');
    goToHome();
    return;
  }

  showModal('checkout-modal');
}

async function processOrder() {
  if (!isUserLoggedIn()) {
    showToast('Faca login para finalizar a compra', 'warning');
    return;
  }

  const paymentMethodEl = document.getElementById('payment-method');
  const shippingAddressEl = document.getElementById('shipping-address');
  const notesEl = document.getElementById('order-notes');

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

    closeModal('checkout-modal');
    showModal('success-modal');

    const orderNumber = document.getElementById('order-number');
    const orderTotal = document.getElementById('order-total');

    if (orderNumber) orderNumber.textContent = result.order_id;
    if (orderTotal) orderTotal.textContent = `AOA ${Number(result.total || 0).toLocaleString()}`;

    cartItems = [];
    updateCartCount();
    closeCartOverlay();
    showToast('Pedido criado com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

async function fetchAllProducts() {
  try {
    let response = await fetch(`${API_BASE_URL}/public/all-products`);

    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/public/products`);
    }

    if (!response.ok) {
      throw new Error('Erro ao carregar produtos');
    }

    allProducts = await response.json();
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    allProducts = [];
  }
}

function loadProducts(containerId, limit = 4) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (allProducts.length === 0) {
    container.innerHTML = `
      <div class="mix-empty-card">
        <p>Nenhum produto disponivel no momento.</p>
      </div>
    `;
    return;
  }

  if (currentProductIndex >= allProducts.length) {
    container.innerHTML = `
      <div class="mix-empty-card">
        <p>Sem mais produtos para exibir.</p>
      </div>
    `;
    return;
  }

  const productChunk = allProducts.slice(currentProductIndex, currentProductIndex + limit);
  currentProductIndex += limit;

  container.innerHTML = productChunk.map((product) => `
    <article class="mix-product-card">
      <a href="${IS_PUBLIC_PAGE ? 'roupas.html' : 'public/roupas.html'}" class="mix-product-image" style='background-image: url("${getImageUrl(product.image)}");' aria-label="Ver produto ${product.name}"></a>
      <p class="mix-product-brand">${(product.category || 'Mutanha').toUpperCase()}</p>
      <h3 class="mix-product-name">${product.name}</h3>
      <p class="mix-product-price">AOA ${Number(product.price || 0).toLocaleString()}</p>
      <div>
        ${isUserLoggedIn() ? `
          <button onclick="addToCart(${product.id})" class="mix-product-btn">
            Adicionar ao carrinho
          </button>
        ` : `
          <button onclick="goToLogin()" class="mix-product-btn">
            Entrar para comprar
          </button>
        `}
      </div>
    </article>
  `).join('');
}

async function initializeProducts() {
  await fetchAllProducts();
  currentProductIndex = 0;
  loadProducts('featured-products');
  loadProducts('new-products');
}

function loadReviews() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  container.innerHTML = reviews.map((review) => `
    <div class="flex flex-col gap-3 bg-[#fcfaf8]">
      <div class="flex items-center gap-3">
        <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style='background-image: url("${review.user.avatar}");'></div>
        <div class="flex-1">
          <p class="text-[#1b130d] text-base font-medium leading-normal">${review.user.name}</p>
          <p class="text-[#9a6c4c] text-sm font-normal leading-normal">${review.date}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="showReactionModal(${review.id})" class="text-[#9a6c4c] hover:text-[#250129] transition-colors" aria-label="Reagir">&#10084;</button>
          <button onclick="showShareModal(${review.id})" class="text-[#9a6c4c] hover:text-[#250129] transition-colors" aria-label="Compartilhar">&#10148;</button>
        </div>
      </div>
      <div class="flex gap-0.5">${generateStars(review.rating)}</div>
      <p class="text-[#1b130d] text-base font-normal leading-normal">"${review.comment}"</p>
      <div class="flex gap-9 text-[#9a6c4c]">
        <button onclick="reactToReview(${review.id}, 'helpful')" class="flex items-center gap-2 hover:text-[#250129] transition-colors">
          <span aria-hidden="true">&#128077;</span>
          <span>${review.helpful}</span>
        </button>
        <button onclick="reactToReview(${review.id}, 'not-helpful')" class="flex items-center gap-2 hover:text-[#250129] transition-colors">
          <span aria-hidden="true">&#128078;</span>
          <span>${review.notHelpful}</span>
        </button>
      </div>
    </div>
  `).join('');
}

function generateStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i += 1) {
    stars += `<span class="text-xl ${i <= rating ? 'text-[#250129]' : 'text-[#d7bead]'}">&#9733;</span>`;
  }
  return stars;
}

function setupReviewForm() {
  const form = document.getElementById('reviewForm');
  if (!form || form.dataset.bound === 'true') return;

  const starButtons = document.querySelectorAll('#starRating button');

  starButtons.forEach((button) => {
    button.addEventListener('click', function setReviewRating() {
      const rating = Number.parseInt(this.dataset.rating, 10);
      setRating(rating);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitReview();
  });

  form.dataset.bound = 'true';
  loadProductsForReview();
}

function setRating(rating) {
  currentRating = rating;
  const starButtons = document.querySelectorAll('#starRating button');

  starButtons.forEach((button, index) => {
    const buttonRating = index + 1;
    if (buttonRating <= rating) {
      button.classList.remove('text-[#d7bead]');
      button.classList.add('text-[#250129]');
      return;
    }

    button.classList.remove('text-[#250129]');
    button.classList.add('text-[#d7bead]');
  });
}

async function loadProductsForReview() {
  const select = document.getElementById('reviewProduct');
  if (!select) return;

  try {
    let response = await fetch(`${API_BASE_URL}/public/all-products`);

    if (!response.ok) {
      response = await fetch(`${API_BASE_URL}/public/products`);
    }

    if (!response.ok) return;

    const products = await response.json();

    while (select.options.length > 1) {
      select.remove(1);
    }

    products.forEach((product) => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar produtos para avaliacao:', error);
  }
}

function submitReview() {
  if (currentRating === 0) {
    showToast('Selecione uma avaliacao', 'warning');
    return;
  }

  const commentInput = document.getElementById('reviewComment');
  const productInput = document.getElementById('reviewProduct');
  const categoryInput = document.getElementById('reviewCategory');

  const comment = commentInput ? commentInput.value.trim() : '';
  if (!comment) {
    showToast('Escreva um comentario', 'warning');
    return;
  }

  const displayName = userData?.full_name || userData?.username || 'Usuario';
  const email = userData?.email || 'usuario@email.com';
  const firstLetter = displayName.charAt(0).toUpperCase() || 'U';

  const newReview = {
    id: reviews.length + 1,
    user: {
      name: displayName,
      email,
      avatar: userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=ef8a42&color=fff`
    },
    rating: currentRating,
    comment,
    category: categoryInput ? categoryInput.value : 'geral',
    product: productInput && productInput.value ? productInput.value : null,
    date: 'Agora',
    helpful: 0,
    notHelpful: 0
  };

  reviews.unshift(newReview);
  loadReviews();

  if (commentInput) commentInput.value = '';
  if (productInput) productInput.value = '';
  if (categoryInput) categoryInput.value = 'geral';

  setRating(0);
  closeModal('reviewModal');
  showToast('Avaliacao publicada com sucesso', 'success');
}

function showReactionModal(reviewId) {
  activeReviewId = reviewId;
  showModal('reactionModal');
}

function showShareModal(reviewId) {
  const linkInput = document.getElementById('shareLink');
  if (linkInput) {
    linkInput.value = `${window.location.origin}/reviews/${reviewId}`;
  }
  showModal('shareModal');
}

function reactToReview(reviewIdOrReaction, reactionMaybe) {
  const hasExplicitId = typeof reactionMaybe === 'string';
  const reviewId = hasExplicitId ? reviewIdOrReaction : activeReviewId;
  const reaction = hasExplicitId ? reactionMaybe : reviewIdOrReaction;

  const review = reviews.find((item) => item.id === reviewId);
  if (!review) {
    showToast('Avaliacao nao encontrada', 'error');
    return;
  }

  if (reaction === 'helpful') {
    review.helpful += 1;
  } else {
    review.notHelpful += 1;
  }

  loadReviews();
  closeModal('reactionModal');
  showToast('Obrigado pelo feedback', 'success');
}

function copyShareLink() {
  const linkInput = document.getElementById('shareLink');
  if (!linkInput) return;

  const link = linkInput.value;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(link)
      .then(() => showToast('Link copiado para a area de transferencia', 'success'))
      .catch(() => showToast('Nao foi possivel copiar o link', 'error'));
    return;
  }

  linkInput.select();
  document.execCommand('copy');
  showToast('Link copiado para a area de transferencia', 'success');
}

function shareToSocial(platform) {
  const linkInput = document.getElementById('shareLink');
  if (!linkInput) return;

  const link = linkInput.value;
  const text = 'Confira esta avaliacao da Mutanha!';
  let url = '';

  if (platform === 'facebook') {
    url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  }

  if (platform === 'twitter') {
    url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
  }

  if (platform === 'whatsapp') {
    url = `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
  }

  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function showProfileModal() {
  if (!isUserLoggedIn()) {
    showToast('Faca login para acessar seu perfil', 'warning');
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
}
