// Autenticação global padronizada
let userToken = localStorage.getItem('userToken');
let userData = null;
try {
  userData = JSON.parse(localStorage.getItem('userData'));
} catch (e) {
  userData = null;
}

// Global variables
let allProducts = [];
let filteredProducts = [];
let currentUser = null;
let currentFilters = {
    category: '',
    priceRange: '',
    minPrice: '',
    maxPrice: '',
    sort: '',
    search: ''
};
let currentProduct = null; // Current product being viewed in modal

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    loadUserActions();
    loadProducts();
    setupEventListeners();
});

// Load user actions (login, register, cart, etc.)

function loadUserActions() {
    const userActions = document.getElementById('userActions');
    if (userToken && userData) {
        // Avatar do usuário
        let avatarHtml = '';
        if (userData.avatar) {
            avatarHtml = `<div onclick="showProfileModal()" title="Meu perfil" class="w-10 h-10 rounded-full bg-center bg-cover border-2 border-[#ef8a42] cursor-pointer hover:scale-105 transition-transform" style="background-image: url('${userData.avatar}');"></div>`;
        } else {
            const initial = userData.full_name ? userData.full_name[0].toUpperCase() : (userData.username ? userData.username[0].toUpperCase() : 'U');
            avatarHtml = `<div onclick="showProfileModal()" title="Meu perfil" class="w-10 h-10 rounded-full bg-[#ef8a42] text-white flex items-center justify-center font-bold text-lg border-2 border-[#ef8a42] cursor-pointer hover:scale-105 transition-transform">${initial}</div>`;
        }
        userActions.innerHTML = `
          <button onclick="viewCart()" class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-[#f3ece7] text-[#1b130d] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">
            <div class="text-[#1b130d]" data-icon="ShoppingBag" data-size="20px" data-weight="regular">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path>
              </svg>
            </div>
            <span id="cartCount">0</span>
          </button>
          <button onclick="logout()" class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-[#ef8a42] text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">Sair</button>
          ${avatarHtml}
        `;
        // loadCartCount(); // Removed as per edit hint
    } else {
        userActions.innerHTML = `
          <button onclick="showModal('loginModal')" class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-[#f3ece7] text-[#1b130d] gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">Login</button>
          <button onclick="showModal('registerModal')" class="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-[#ef8a42] text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5">Registrar</button>
        `;
    }
}

// Load all products from backend
async function loadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/public/products');
        if (response.ok) {
            allProducts = await response.json();
            filteredProducts = [...allProducts];
            displayProducts();
            updateProductCount();
        } else {
            console.error('Erro ao carregar produtos');
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Display products in the grid
function displayProducts() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
          <div class="col-span-full text-center py-8">
            <p class="text-[#9a6c4c] text-lg">Nenhum produto encontrado</p>
          </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'flex flex-col gap-3 pb-3';
        productCard.innerHTML = `
          <div class="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
               style="background-image: url('http://localhost:3000${product.image || '/uploads/default-product.jpg'}')"
               onclick="viewProduct(${product.id})">
          </div>
          <div class="product2">
            <p class="text-[#1b130d] text-base font-medium leading-normal">${product.name}</p>
            <p class="text-[#9a6c4c] text-sm font-normal leading-normal">AOA ${product.price.toLocaleString()}</p>
            <button onclick="addToCart(${product.id})" class="mt-2 w-full bg-[#ef8a42] text-white py-1 px-3 rounded-md text-sm hover:bg-[#d67a3a] transition-colors">
              Adicionar ao Carrinho
            </button>
          </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function (e) {
        currentFilters.search = e.target.value;
        applyFilters();
    });

    // Filter dropdowns
    setupFilterDropdown('categoryFilter', 'categoryOptions', 'category');
    setupFilterDropdown('priceFilter', 'priceOptions', 'priceRange');
    setupFilterDropdown('sortFilter', 'sortOptions', 'sort');

    // Price range inputs
    document.getElementById('applyPriceRange').addEventListener('click', function () {
        const minPrice = document.getElementById('minPrice').value;
        const maxPrice = document.getElementById('maxPrice').value;
        currentFilters.minPrice = minPrice;
        currentFilters.maxPrice = maxPrice;
        applyFilters();
    });

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Close modals when clicking outside
    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('hidden') && e.target.id.includes('Modal')) {
            closeModal(e.target.id);
        }
    });

    // Close product modal when clicking outside
    document.getElementById('productDetailModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal('productDetailModal');
        }
    });
}

// Setup filter dropdown functionality
function setupFilterDropdown(buttonId, optionsId, filterType) {
    const button = document.getElementById(buttonId);
    const options = document.getElementById(optionsId);

    button.addEventListener('click', function (e) {
        e.stopPropagation();
        options.classList.toggle('hidden');
    });

    options.addEventListener('click', function (e) {
        if (e.target.classList.contains('filter-option')) {
            const value = e.target.dataset[filterType] || '';
            currentFilters[filterType] = value;
            applyFilters();
            options.classList.add('hidden');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
        options.classList.add('hidden');
    });
}

// Apply all filters
function applyFilters() {
    filteredProducts = allProducts.filter(product => {
        // Search filter
        if (currentFilters.search && !product.name.toLowerCase().includes(currentFilters.search.toLowerCase())) {
            return false;
        }

        // Category filter
        if (currentFilters.category && product.category !== currentFilters.category) {
            return false;
        }

        // Price range filter
        if (currentFilters.minPrice || currentFilters.maxPrice) {
            const price = product.price;
            const minPrice = currentFilters.minPrice ? parseFloat(currentFilters.minPrice) : 0;
            const maxPrice = currentFilters.maxPrice ? parseFloat(currentFilters.maxPrice) : Infinity;

            if (price < minPrice || price > maxPrice) {
                return false;
            }
        }

        // Predefined price range filter
        if (currentFilters.priceRange) {
            const price = product.price;
            switch (currentFilters.priceRange) {
                case '0-5000':
                    if (price > 5000) return false;
                    break;
                case '5000-15000':
                    if (price < 5000 || price > 15000) return false;
                    break;
                case '15000-30000':
                    if (price < 15000 || price > 30000) return false;
                    break;
                case '30000+':
                    if (price < 30000) return false;
                    break;
            }
        }

        return true;
    });

    // Apply sorting
    if (currentFilters.sort) {
        filteredProducts.sort((a, b) => {
            switch (currentFilters.sort) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });
    }

    displayProducts();
    updateProductCount();
}

// Clear all filters
function clearAllFilters() {
    currentFilters = {
        category: '',
        priceRange: '',
        minPrice: '',
        maxPrice: '',
        sort: '',
        search: ''
    };

    document.getElementById('searchInput').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    filteredProducts = [...allProducts];
    displayProducts();
    updateProductCount();
}

// Update product count display
function updateProductCount() {
    const count = filteredProducts.length;
    const total = allProducts.length;
    document.getElementById('productCount').textContent = `Mostrando ${count} de ${total} produtos`;
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            closeModal('loginModal');
            loadUserActions();
            alert('Login realizado com sucesso!');
        } else {
            const error = await response.json();
            alert('Erro no login: ' + error.message);
        }
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();

    const fullName = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: email.split('@')[0],
                email,
                password,
                full_name: fullName,
                role: 'customer'
            })
        });

        if (response.ok) {
            closeModal('registerModal');
            alert('Conta criada com sucesso! Faça login para continuar.');
        } else {
            const error = await response.json();
            alert('Erro no registro: ' + error.message);
        }
    } catch (error) {
        alert('Erro ao criar conta: ' + error.message);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    loadUserActions();
    alert('Logout realizado com sucesso!');
}

// View product function - opens modal with product details
function viewProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('Produto não encontrado:', productId);
        return;
    }

    currentProduct = product;
    showProductModal(product);
}

// Show product detail modal
function showProductModal(product) {
    // Set modal content
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductTitle').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = `AOA ${product.price.toLocaleString()}`;
    document.getElementById('modalProductCategory').textContent = product.category || 'Sem categoria';
    document.getElementById('modalProductDescription').textContent = product.description || 'Descrição não disponível';

    // Set main image
    const mainImage = document.getElementById('modalProductImage');
    mainImage.style.backgroundImage = `url('http://localhost:3000${product.image || '/uploads/default-product.jpg'}')`;

    // Set thumbnails (for now, all show the same image)
    const thumbnails = [
        document.getElementById('modalThumbnail1'),
        document.getElementById('modalThumbnail2'),
        document.getElementById('modalThumbnail3')
    ];

    thumbnails.forEach((thumb, index) => {
        if (index === 0) {
            thumb.style.backgroundImage = `url('http://localhost:3000${product.image || '/uploads/default-product.jpg'}')`;
            thumb.classList.add('border-[#ef8a42]');
            thumb.onclick = () => selectThumbnail(0);
        } else {
            thumb.style.backgroundImage = `url('http://localhost:3000${product.image || '/uploads/default-product.jpg'}')`;
            thumb.classList.remove('border-[#ef8a42]');
            thumb.onclick = () => selectThumbnail(index);
        }
    });

    // Reset quantity and size
    document.getElementById('modalQuantity').value = '1';
    document.getElementById('modalSize').value = '';

    // Show modal
    showModal('productDetailModal');
}

// Quantity controls
function increaseQuantity() {
    const quantityInput = document.getElementById('modalQuantity');
    const currentValue = parseInt(quantityInput.value) || 1;
    quantityInput.value = currentValue + 1;
}

function decreaseQuantity() {
    const quantityInput = document.getElementById('modalQuantity');
    const currentValue = parseInt(quantityInput.value) || 1;
    if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
    }
}

// Select thumbnail function
function selectThumbnail(index) {
    const thumbnails = [
        document.getElementById('modalThumbnail1'),
        document.getElementById('modalThumbnail2'),
        document.getElementById('modalThumbnail3')
    ];

    // Remove active class from all thumbnails
    thumbnails.forEach(thumb => {
        thumb.classList.remove('border-[#ef8a42]');
        thumb.classList.add('border-transparent');
    });

    // Add active class to selected thumbnail
    thumbnails[index].classList.remove('border-transparent');
    thumbnails[index].classList.add('border-[#ef8a42]');

    // Update main image (for now, all show the same image)
    const mainImage = document.getElementById('modalProductImage');
    mainImage.style.backgroundImage = thumbnails[index].style.backgroundImage;
}

// Enhanced close modal function
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');

    // Reset current product when closing product modal
    if (modalId === 'productDetailModal') {
        currentProduct = null;
    }
}

// ===== Modal de Perfil do Usuário =====
function showProfileModal() {
  if (!userData) return;
  const avatarDiv = document.getElementById('profile-avatar');
  if (avatarDiv) {
    if (userData.avatar) {
      avatarDiv.style.backgroundImage = `url('${userData.avatar}')`;
      avatarDiv.textContent = '';
    } else {
      avatarDiv.style.backgroundImage = '';
      const initial = userData.full_name ? userData.full_name[0].toUpperCase() : (userData.username ? userData.username[0].toUpperCase() : 'U');
      avatarDiv.textContent = initial;
    }
  }
  const nameDiv = document.getElementById('profile-name');
  if (nameDiv) nameDiv.textContent = userData.full_name || userData.username || 'Usuário';
  const emailDiv = document.getElementById('profile-email');
  if (emailDiv) emailDiv.textContent = userData.email || '';
  showModal('profileModal');
}

function openSettings() {
  alert('Configurações do perfil em breve!');
}
