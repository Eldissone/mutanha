// Configuração da API
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
let authToken = localStorage.getItem('authToken');

// Dados mockados para demonstração (serão substituídos pela API)
let products = [];
let orders = [];
let customers = [];

function getImageUrl(imagePath) {
    if (!imagePath) return `${API_ORIGIN}/uploads/default-product.jpg`;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    return `${API_ORIGIN}${imagePath}`;
}

function clearAdminSession() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('authToken');
    authToken = null;
}

function handleUnauthorizedStatus(status) {
    if (status === 401 || status === 403) {
        clearAdminSession();
        window.location.href = 'login.html';
        return true;
    }
    return false;
}

// Elementos DOM
const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');
const pageTitle = document.getElementById('page-title');
const addProductBtn = document.getElementById('add-product-btn');
const addProductModal = document.getElementById('add-product-modal');
const addProductForm = document.getElementById('add-product-form');
const editProductModal = document.getElementById('edit-product-modal');
const editProductForm = document.getElementById('edit-product-form');
const closeModalBtns = document.querySelectorAll('.close-btn, .close-modal');
const productsTbody = document.getElementById('products-tbody');
const ordersTbody = document.getElementById('orders-tbody');
const customersTbody = document.getElementById('customers-tbody');

// Navegação entre páginas
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        
        // Remove active class de todos os links e páginas
        navLinks.forEach(l => l.classList.remove('active'));
        pageContents.forEach(p => p.classList.remove('active'));
        
        // Adiciona active class ao link clicado e página correspondente
        link.classList.add('active');
        document.getElementById(`${targetPage}-page`).classList.add('active');
        
        // Atualiza o título da página
        pageTitle.textContent = link.textContent.trim();
        
        // Carrega dados específicos da página
        loadPageData(targetPage);
    });
});

// Funções de API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (!authToken) {
        clearAdminSession();
        window.location.href = 'login.html';
        throw new Error('Sessao de administrador invalida');
    }

    const config = {
        ...options,
        headers: {
            ...headers,
            'Authorization': `Bearer ${authToken}`
        }
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            if (handleUnauthorizedStatus(response.status)) {
                throw new Error('Sessao expirada');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        if (error.message !== 'Sessao expirada') {
            showNotification('Erro na comunicacao com o servidor', 'error');
        }
        throw error;
    }
}

// Função para carregar dados específicos de cada página
async function loadPageData(page) {
    try {
        switch(page) {
            case 'products':
                await loadProducts();
                break;
            case 'orders':
                await loadOrders();
                break;
            case 'customers':
                await loadCustomers();
                break;
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Modal de adicionar produto
addProductBtn.addEventListener('click', () => {
    addProductModal.classList.add('active');
});

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        addProductModal.classList.remove('active');
        addProductForm.reset();
        editProductModal.classList.remove('active');
        editProductForm.reset();
    });
});

// Fechar modal clicando fora
addProductModal.addEventListener('click', (e) => {
    if (e.target === addProductModal) {
        addProductModal.classList.remove('active');
        addProductForm.reset();
    }
});

editProductModal.addEventListener('click', (e) => {
    if (e.target === editProductModal) {
        editProductModal.classList.remove('active');
        editProductForm.reset();
    }
});

// Upload de imagem
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(`${API_BASE_URL}/upload-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        if (!response.ok) {
            if (handleUnauthorizedStatus(response.status)) {
                throw new Error('Sessao expirada');
            }
            throw new Error('Erro no upload da imagem');
        }

        const result = await response.json();
        return result.imageUrl;
    } catch (error) {
        console.error('Erro no upload:', error);
        if (error.message !== 'Sessao expirada') {
            showNotification('Erro ao fazer upload da imagem', 'error');
        }
        throw error;
    }
}

// Formulário de adicionar produto
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(addProductForm);
    const imageFile = formData.get('image');
    
    try {
        let imageUrl = '';
        
        if (imageFile && imageFile.size > 0) {
            imageUrl = await uploadImage(imageFile);
        }
        
        const newProduct = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock_quantity: parseInt(formData.get('stock')) || 0,
            image: imageUrl || '/uploads/default-product.jpg'
        };
        
        const response = await apiRequest('/products', {
            method: 'POST',
            body: JSON.stringify(newProduct)
        });
        
        await loadProducts();
        addProductModal.classList.remove('active');
        addProductForm.reset();
        
        showNotification('Produto adicionado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        showNotification('Erro ao adicionar produto', 'error');
    }
});

// Formulário de editar produto
editProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(editProductForm);
    const imageFile = formData.get('image');
    const productId = formData.get('product_id');
    
    try {
        let imageUrl = '';
        
        if (imageFile && imageFile.size > 0) {
            imageUrl = await uploadImage(imageFile);
        }
        
        const updatedProduct = {
            name: formData.get('name'),
            description: formData.get('description'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock_quantity: parseInt(formData.get('stock')) || 0,
            status: formData.get('status')
        };
        
        // Se uma nova imagem foi enviada, incluir no objeto
        if (imageUrl) {
            updatedProduct.image = imageUrl;
        }
        
        const response = await apiRequest(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedProduct)
        });
        
        await loadProducts();
        editProductModal.classList.remove('active');
        editProductForm.reset();
        
        showNotification('Produto atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        showNotification('Erro ao atualizar produto', 'error');
    }
});

// Função para carregar produtos
async function loadProducts() {
    try {
        products = await apiRequest('/products');
        productsTbody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            const isActive = product.is_active !== false; // Considera ativo se is_active não for false
            row.innerHTML = `
                <td>
                    <img src="${getImageUrl(product.image)}" alt="${product.name}" class="product-image">
                </td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>AOA ${product.price.toLocaleString()}</td>
                <td>${product.stock_quantity || product.stock}</td>
                <td>
                    <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                        ${isActive ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit-btn" onclick="editProduct(${product.id})">Editar</button>
                        <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">Excluir</button>
                    </div>
                </td>
            `;
            productsTbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Função para carregar pedidos
async function loadOrders() {
    try {
        orders = await apiRequest('/orders');
        ordersTbody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customer_name || 'Cliente não identificado'}</td>
                <td>${order.customer_email || 'Email não informado'}</td>
                <td>AOA ${parseFloat(order.total_amount || 0).toLocaleString()}</td>
                <td>
                    <span class="order-status ${order.status || 'pending'}">
                        ${getStatusText(order.status || 'pending')}
                    </span>
                </td>
                <td>${formatDate(order.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit-btn" onclick="editOrder(${order.id})">Ver Detalhes</button>
                        <button class="action-btn delete-btn" onclick="deleteOrder(${order.id})">Excluir</button>
                    </div>
                </td>
            `;
            ordersTbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
    }
}

// Função para carregar clientes
async function loadCustomers() {
    try {
        customers = await apiRequest('/customers');
        customersTbody.innerHTML = '';
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name || customer.full_name || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.orders_count || 0}</td>
                <td>AOA ${parseFloat(customer.total_spent || 0).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${customer.is_active ? 'status-active' : 'status-inactive'}">
                        ${customer.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit-btn" onclick="editCustomer(${customer.id})">Editar</button>
                        <button class="action-btn delete-btn" onclick="deleteCustomer(${customer.id})">Desativar</button>
                    </div>
                </td>
            `;
            customersTbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

// Funções auxiliares
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendente',
        'processing': 'Processando',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Funções de edição e exclusão
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        // Preencher o formulário com os dados do produto
        document.getElementById('edit-product-id').value = product.id;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-description').value = product.description || '';
        document.getElementById('edit-product-category').value = product.category;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-stock').value = product.stock_quantity || product.stock;
        document.getElementById('edit-product-status').value = (product.is_active !== false) ? 'active' : 'inactive';
        
        // Mostrar imagem atual
        const currentImage = document.getElementById('edit-product-current-image');
        currentImage.src = getImageUrl(product.image);
        currentImage.style.display = 'block';
        
        // Abrir modal
        editProductModal.classList.add('active');
    }
}

async function deleteProduct(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await apiRequest(`/products/${id}`, { method: 'DELETE' });
            await loadProducts();
            showNotification('Produto excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            showNotification('Erro ao excluir produto', 'error');
        }
    }
}

function editOrder(id) {
    const order = orders.find(o => o.id === id);
    if (order) {
        showNotification(`Detalhes do pedido #${id} serão exibidos!`, 'info');
    }
}

async function deleteOrder(id) {
    if (confirm('Tem certeza que deseja excluir este pedido?')) {
        try {
            await apiRequest(`/orders/${id}`, { method: 'DELETE' });
            await loadOrders();
            showNotification('Pedido excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir pedido:', error);
            showNotification('Erro ao excluir pedido', 'error');
        }
    }
}

function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (customer) {
        // Por enquanto, apenas mostra uma notificação
        // Em uma implementação completa, abriria um modal de edição
        showNotification(`Editando cliente: ${customer.name || customer.full_name}`, 'info');
    }
}

async function deleteCustomer(id) {
    if (confirm('Tem certeza que deseja desativar este cliente?')) {
        try {
            await apiRequest(`/customers/${id}`, { method: 'DELETE' });
            await loadCustomers();
            showNotification('Cliente desativado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao desativar cliente:', error);
            showNotification('Erro ao desativar cliente', 'error');
        }
    }
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remove notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Adiciona estilos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#cce5ff'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#004085'};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Botão de fechar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-remove após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Logout
document.querySelector('.logout-btn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja sair?')) {
        clearAdminSession();
        window.location.href = 'login.html';
    }
});

// Verificação de autenticação
async function checkAuth() {
    const isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    const storedToken = localStorage.getItem('authToken');

    if (!isAdminLoggedIn || !storedToken) {
        clearAdminSession();
        window.location.href = 'login.html';
        return false;
    }

    authToken = storedToken;

    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            return true;
        }

        if (handleUnauthorizedStatus(response.status)) {
            return false;
        }

        showNotification('Nao foi possivel validar a sessao', 'error');
        return false;
    } catch (error) {
        console.error('Erro ao validar sessao:', error);
        showNotification('Erro ao validar a sessao de administrador', 'error');
        return false;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está autenticado
    if (!await checkAuth()) return;
    
    // Carrega dados iniciais do dashboard
    loadPageData('dashboard');
    
    // Atualiza estatísticas do dashboard
    updateDashboardStats();
});

// Função para atualizar estatísticas do dashboard
function updateDashboardStats() {
    const totalProducts = products.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    
    // Aqui você pode atualizar os elementos do dashboard com os valores reais
    console.log('Estatísticas atualizadas:', {
        totalProducts,
        pendingOrders,
        totalSales,
        activeCustomers
    });
} 

