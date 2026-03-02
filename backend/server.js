const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// Configuração do banco de dados PostgreSQL

// Criar pasta uploads se não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'mutanha-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rotas de autenticação
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Buscar usuário no banco de dados
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: user.id,
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'mutanha-secret',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            user: { 
                id: user.id,
                username: user.username, 
                role: user.role,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Upload de imagens
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'));
        }
    }
});

// Rota para upload de imagem
app.post('/api/upload-image', authenticateToken, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
});

// Rotas de produtos
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota pública para produtos (sem autenticação)
app.get('/api/public/products', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, description, category, price, image, created_at FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT 6'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos públicos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para todos os produtos (pública)
app.get('/api/public/all-products', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, description, category, price, image, stock_quantity FROM products WHERE is_active = true ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar todos os produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas para usuários normais
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address, city, state, zip_code } = req.body;
        
        // Validação básica
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
        }
        
        // Verificar se usuário já existe
        const existingUser = await pool.query(
            'SELECT id FROM user_accounts WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Usuário ou email já existe' });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Criar usuário
        const result = await pool.query(
            'INSERT INTO user_accounts (username, email, password, full_name, phone, address, city, state, zip_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, email, full_name, role',
            [username, email, hashedPassword, full_name, phone || null, address || null, city || null, state || null, zip_code || null]
        );
        
        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: result.rows[0].id,
                username: result.rows[0].username, 
                role: result.rows[0].role 
            },
            process.env.JWT_SECRET || 'mutanha-secret',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            success: true,
            token: token,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/user/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Buscar usuário
        const result = await pool.query(
            'SELECT * FROM user_accounts WHERE (username = $1 OR email = $1) AND is_active = true',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const user = result.rows[0];
        
        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: user.id,
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'mutanha-secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Erro no login do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Middleware para autenticar usuários normais
const authenticateUser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'mutanha-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rotas do carrinho
app.post('/api/cart/add', authenticateUser, async (req, res) => {
    try {
        const { product_id, quantity = 1 } = req.body;
        const user_id = req.user.id;
        
        // Verificar se produto existe e tem estoque
        const productResult = await pool.query(
            'SELECT id, name, price, stock_quantity FROM products WHERE id = $1 AND is_active = true',
            [product_id]
        );
        
        if (productResult.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        const product = productResult.rows[0];
        
        if (product.stock_quantity < quantity) {
            return res.status(400).json({ error: 'Quantidade solicitada não disponível em estoque' });
        }
        
        // Buscar ou criar carrinho
        let cartResult = await pool.query(
            'SELECT id FROM shopping_carts WHERE user_id = $1',
            [user_id]
        );
        
        let cart_id;
        if (cartResult.rows.length === 0) {
            const newCartResult = await pool.query(
                'INSERT INTO shopping_carts (user_id) VALUES ($1) RETURNING id',
                [user_id]
            );
            cart_id = newCartResult.rows[0].id;
        } else {
            cart_id = cartResult.rows[0].id;
        }
        
        // Verificar se item já existe no carrinho
        const existingItem = await pool.query(
            'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [cart_id, product_id]
        );
        
        if (existingItem.rows.length > 0) {
            // Atualizar quantidade
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [quantity, existingItem.rows[0].id]
            );
        } else {
            // Adicionar novo item
            await pool.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
                [cart_id, product_id, quantity]
            );
        }
        
        res.json({ success: true, message: 'Produto adicionado ao carrinho' });
    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/cart', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const result = await pool.query(`
            SELECT 
                ci.id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.image,
                p.stock_quantity,
                (ci.quantity * p.price) as total_price
            FROM shopping_carts sc
            JOIN cart_items ci ON sc.id = ci.cart_id
            JOIN products p ON ci.product_id = p.id
            WHERE sc.user_id = $1 AND p.is_active = true
        `, [user_id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/cart/update/:item_id', authenticateUser, async (req, res) => {
    try {
        const { item_id } = req.params;
        const { quantity } = req.body;
        const user_id = req.user.id;
        
        if (quantity <= 0) {
            return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
        }
        
        // Verificar se item pertence ao usuário
        const itemResult = await pool.query(`
            SELECT ci.id, p.stock_quantity 
            FROM cart_items ci
            JOIN shopping_carts sc ON ci.cart_id = sc.id
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1 AND sc.user_id = $2
        `, [item_id, user_id]);
        
        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        if (itemResult.rows[0].stock_quantity < quantity) {
            return res.status(400).json({ error: 'Quantidade solicitada não disponível em estoque' });
        }
        
        await pool.query(
            'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, item_id]
        );
        
        res.json({ success: true, message: 'Quantidade atualizada' });
    } catch (error) {
        console.error('Erro ao atualizar carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/cart/remove/:item_id', authenticateUser, async (req, res) => {
    try {
        const { item_id } = req.params;
        const user_id = req.user.id;
        
        // Verificar se item pertence ao usuário
        const itemResult = await pool.query(`
            SELECT ci.id FROM cart_items ci
            JOIN shopping_carts sc ON ci.cart_id = sc.id
            WHERE ci.id = $1 AND sc.user_id = $2
        `, [item_id, user_id]);
        
        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        await pool.query('DELETE FROM cart_items WHERE id = $1', [item_id]);
        
        res.json({ success: true, message: 'Item removido do carrinho' });
    } catch (error) {
        console.error('Erro ao remover do carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para finalizar pedido
app.post('/api/orders/create', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { payment_method, shipping_address, notes } = req.body;
        
        console.log('Criando pedido para usuário:', user_id);
        console.log('Dados do pedido:', { payment_method, shipping_address, notes });
        
        // Buscar carrinho do usuário
        const cartResult = await pool.query(`
            SELECT 
                ci.id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.stock_quantity,
                (ci.quantity * p.price) as total_price
            FROM shopping_carts sc
            JOIN cart_items ci ON sc.id = ci.cart_id
            JOIN products p ON ci.product_id = p.id
            WHERE sc.user_id = $1 AND p.is_active = true
        `, [user_id]);
        
        console.log('Itens no carrinho:', cartResult.rows);
        
        if (cartResult.rows.length === 0) {
            return res.status(400).json({ error: 'Carrinho vazio' });
        }
        
        // Calcular total
        const total = cartResult.rows.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
        console.log('Total do pedido:', total);
        
        // Buscar dados do usuário
        const userResult = await pool.query(
            'SELECT full_name, email, phone, address, city, state, zip_code FROM user_accounts WHERE id = $1',
            [user_id]
        );
        
        const user = userResult.rows[0];
        console.log('Dados do usuário:', user);
        
        // Criar pedido
        const orderResult = await pool.query(
            'INSERT INTO orders (customer_id, customer_name, customer_email, customer_phone, total_amount, payment_method, shipping_address, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [user_id, user.full_name, user.email, user.phone, total, payment_method, shipping_address || user.address, notes]
        );
        
        const order_id = orderResult.rows[0].id;
        console.log('Pedido criado com ID:', order_id);
        
        // Criar itens do pedido
        for (const item of cartResult.rows) {
            console.log('Criando item do pedido:', item);
            await pool.query(
                'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
                [order_id, item.product_id, item.name, item.quantity, item.price, item.total_price]
            );
            
            // Atualizar estoque
            await pool.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }
        
        // Limpar carrinho
        await pool.query(
            'DELETE FROM cart_items WHERE cart_id = (SELECT id FROM shopping_carts WHERE user_id = $1)',
            [user_id]
        );
        
        console.log('Pedido finalizado com sucesso');
        res.status(201).json({
            success: true,
            message: 'Pedido criado com sucesso',
            order_id: order_id,
            total: total
        });
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para buscar pedidos do usuário
app.get('/api/user/orders', authenticateUser, async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const result = await pool.query(
            'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
            [user_id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { name, description, category, price, stock_quantity, image } = req.body;
        
        // Validação dos campos obrigatórios
        if (!name || !price) {
            return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
        }
        
        // Converter e validar valores numéricos
        const priceValue = parseFloat(price);
        const stockValue = parseInt(stock_quantity) || 0;
        
        if (isNaN(priceValue) || priceValue < 0) {
            return res.status(400).json({ error: 'Preço deve ser um número válido maior que zero' });
        }
        
        if (isNaN(stockValue) || stockValue < 0) {
            return res.status(400).json({ error: 'Quantidade em estoque deve ser um número válido maior ou igual a zero' });
        }
        
        const result = await pool.query(
            'INSERT INTO products (name, description, category, price, stock_quantity, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description || '', category || '', priceValue, stockValue, image || '/uploads/default-product.jpg']
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, price, stock_quantity, image, status } = req.body;
        
        // Validação dos campos obrigatórios
        if (!name || !price) {
            return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
        }
        
        // Converter e validar valores numéricos
        const priceValue = parseFloat(price);
        const stockValue = parseInt(stock_quantity) || 0;
        
        if (isNaN(priceValue) || priceValue < 0) {
            return res.status(400).json({ error: 'Preço deve ser um número válido maior que zero' });
        }
        
        if (isNaN(stockValue) || stockValue < 0) {
            return res.status(400).json({ error: 'Quantidade em estoque deve ser um número válido maior ou igual a zero' });
        }
        
        // Determinar se o produto deve estar ativo baseado no status
        const isActive = status === 'active';
        
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, category = $3, price = $4, stock_quantity = $5, image = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
            [name, description || '', category || '', priceValue, stockValue, image || '/uploads/default-product.jpg', isActive, parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
            [parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas de pedidos
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM orders ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, total_amount, payment_method, shipping_address, notes } = req.body;
        
        const result = await pool.query(
            'INSERT INTO orders (customer_name, customer_email, customer_phone, total_amount, payment_method, shipping_address, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [customer_name, customer_email, customer_phone, parseFloat(total_amount), payment_method, shipping_address, notes]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, payment_method, shipping_address, notes } = req.body;
        
        const result = await pool.query(
            'UPDATE orders SET status = $1, payment_method = $2, shipping_address = $3, notes = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
            [status, payment_method, shipping_address, notes, parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM orders WHERE id = $1 RETURNING id',
            [parseInt(id)]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        res.json({ message: 'Pedido excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas de clientes (usuários normais)
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                username,
                email,
                full_name as name,
                phone,
                address,
                city,
                state,
                zip_code,
                role,
                is_active,
                created_at,
                updated_at,
                (SELECT COUNT(*) FROM orders WHERE customer_id = user_accounts.id) as orders_count,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = user_accounts.id AND status != 'cancelled') as total_spent
            FROM user_accounts 
            WHERE role = 'customer'
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address, city, state, zip_code } = req.body;
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO user_accounts (username, email, password, full_name, phone, address, city, state, zip_code, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, username, email, full_name as name, phone, address, city, state, zip_code, role, is_active, created_at',
            [username, email, hashedPassword, full_name, phone, address, city, state, zip_code, 'customer']
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, full_name, phone, address, city, state, zip_code, is_active } = req.body;
        
        const result = await pool.query(
            'UPDATE user_accounts SET username = $1, email = $2, full_name = $3, phone = $4, address = $5, city = $6, state = $7, zip_code = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 AND role = $11 RETURNING id, username, email, full_name as name, phone, address, city, state, zip_code, role, is_active, created_at, updated_at',
            [username, email, full_name, phone, address, city, state, zip_code, is_active, parseInt(id), 'customer']
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Em vez de deletar, apenas desativar o cliente
        const result = await pool.query(
            'UPDATE user_accounts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND role = $2 RETURNING id',
            [parseInt(id), 'customer']
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        
        res.json({ message: 'Cliente desativado com sucesso' });
    } catch (error) {
        console.error('Erro ao desativar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para estatísticas do dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const [productsResult, ordersResult, customersResult, salesResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as total FROM products WHERE is_active = true'),
            pool.query('SELECT COUNT(*) as total FROM orders WHERE status = \'pending\''),
            pool.query('SELECT COUNT(*) as total FROM user_accounts WHERE role = \'customer\' AND is_active = true'),
            pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != \'cancelled\'')
        ]);

        res.json({
            totalProducts: parseInt(productsResult.rows[0].total),
            pendingOrders: parseInt(ordersResult.rows[0].total),
            totalSales: parseFloat(salesResult.rows[0].total),
            activeCustomers: parseInt(customersResult.rows[0].total)
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para pedidos recentes
app.get('/api/dashboard/recent-orders', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM orders ORDER BY created_at DESC LIMIT 5'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos recentes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para produtos mais vendidos (simplificada por enquanto)
app.get('/api/dashboard/top-products', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, price, stock_quantity FROM products WHERE is_active = true ORDER BY created_at DESC LIMIT 5'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para servir o painel admin
app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

// Rota padrão
app.get('/', (req, res) => {
    res.json({
        message: 'API mutanha Backend',
        version: '1.0.0',
        endpoints: {
            auth: '/api/login',
            products: '/api/products',
            orders: '/api/orders',
            customers: '/api/customers',
            upload: '/api/upload-image',
            dashboard: '/api/dashboard/*'
        }
    });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
    console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
}); 