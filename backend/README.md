# Backend Mutanha

Backend completo para o painel administrativo Mutanha com API REST, autenticação JWT, upload de imagens e banco de dados PostgreSQL.

## 🚀 Funcionalidades

### 🔐 Autenticação
- Login com JWT
- Middleware de autenticação
- Tokens com expiração de 24h

### 📁 Upload de Imagens
- Upload de arquivos com Multer
- Validação de tipos de imagem (JPG, PNG, GIF, WebP)
- Limite de 5MB por arquivo
- Nomes únicos para evitar conflitos

### 🛍️ API de Produtos
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Excluir produto

### 📦 API de Pedidos
- `GET /api/orders` - Listar pedidos
- `POST /api/orders` - Criar pedido
- `PUT /api/orders/:id` - Atualizar pedido
- `DELETE /api/orders/:id` - Excluir pedido

### 👥 API de Clientes
- `GET /api/customers` - Listar clientes
- `POST /api/customers` - Criar cliente
- `PUT /api/customers/:id` - Atualizar cliente
- `DELETE /api/customers/:id` - Excluir cliente

### 📊 Dashboard API
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/recent-orders` - Pedidos recentes
- `GET /api/dashboard/top-products` - Produtos mais vendidos

### 🗄️ Banco de Dados PostgreSQL
- Conexão com PostgreSQL
- Tabelas para usuários, produtos, clientes, pedidos
- Scripts de inicialização e reset
- Índices para performance

## 🛠️ Instalação

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn
- PostgreSQL 12+

### Passos
1. **Instalar dependências:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar banco de dados PostgreSQL:**
   ```bash
   # Criar banco de dados
   CREATE DATABASE "Mutanha";
   
   # Ver instruções completas em SETUP.md
   ```

3. **Configurar variáveis de ambiente:**
   ```bash
   # Criar arquivo .env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=Mutanha
   DB_PASSWORD=sua_senha_aqui
   DB_PORT=5432
   PORT=3000
   JWT_SECRET=sua-chave-secreta-aqui
   NODE_ENV=development
   ```

4. **Inicializar banco de dados:**
   ```bash
   # Criar tabelas e dados iniciais
   npm run db:init
   
   # Testar conexão
   npm run db:test
   ```

5. **Iniciar o servidor:**
   ```bash
   # Desenvolvimento
   npm run dev
   
   # Produção
   npm start
   ```

## 📁 Estrutura do Projeto

```
backend/
├── server.js              # Servidor principal
├── package.json           # Dependências
├── .env                  # Variáveis de ambiente
├── uploads/              # Pasta de uploads (criada automaticamente)
├── config/
│   └── database.js       # Configuração do PostgreSQL
├── database/
│   ├── schema.sql        # Schema do banco de dados
│   ├── init.js           # Script de inicialização
│   ├── reset.js          # Script de reset
│   └── test-connection.js # Teste de conexão
├── SETUP.md              # Instruções de configuração
└── README.md             # Esta documentação
```

## 🔧 Configuração

### Variáveis de Ambiente
- `DB_USER`: Usuário do PostgreSQL (padrão: postgres)
- `DB_HOST`: Host do PostgreSQL (padrão: localhost)
- `DB_NAME`: Nome do banco de dados (padrão: Mutanha)
- `DB_PASSWORD`: Senha do PostgreSQL
- `DB_PORT`: Porta do PostgreSQL (padrão: 5432)
- `PORT`: Porta do servidor (padrão: 3000)
- `JWT_SECRET`: Chave secreta para JWT
- `NODE_ENV`: Ambiente (development/production)

### Scripts Disponíveis
- `npm start` - Iniciar servidor em produção
- `npm run dev` - Iniciar servidor em desenvolvimento
- `npm run db:init` - Inicializar banco de dados
- `npm run db:reset` - Resetar banco de dados
- `npm run db:test` - Testar conexão com banco

### Endpoints Principais
- **API Base**: `http://localhost:3000/api`
- **Uploads**: `http://localhost:3000/uploads`
- **Admin**: `http://localhost:3000/admin`

## 📡 Endpoints da API

### Autenticação
```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Upload de Imagem
```http
POST /api/upload-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <arquivo>
```

### Produtos
```http
GET /api/products
Authorization: Bearer <token>

POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nome do Produto",
  "description": "Descrição",
  "category": "roupas",
  "price": 5000,
  "stock": 10,
  "image": "/uploads/imagem.jpg"
}
```

### Pedidos
```http
GET /api/orders
Authorization: Bearer <token>

POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "customer": "Nome do Cliente",
  "customerEmail": "email@exemplo.com",
  "customerPhone": "+244 123 456 789",
  "products": [
    {
      "id": 1,
      "name": "Produto",
      "quantity": 2,
      "price": 5000
    }
  ],
  "total": 10000
}
```

## 🔒 Segurança

### Autenticação
- Tokens JWT com expiração
- Middleware de autenticação em todas as rotas protegidas
- Validação de credenciais

### Upload de Arquivos
- Validação de tipos de arquivo
- Limite de tamanho (5MB)
- Nomes únicos para evitar conflitos
- Sanitização de nomes de arquivo

### CORS
- Configurado para permitir requisições do frontend
- Headers de segurança

## 📊 Dados Mockados

O backend inclui dados de exemplo para demonstração:

### Produtos
- Tênis de Corrida Performance
- Top de Treino Respirável

### Pedidos
- Pedido da Maria Silva com produtos

### Clientes
- Maria Silva com histórico

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Docker (opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Erro de CORS
- Verificar se o frontend está na porta correta
- Configurar CORS adequadamente

### Erro de Upload
- Verificar se a pasta `uploads` existe
- Verificar permissões de escrita
- Validar tamanho e tipo do arquivo

### Erro de Autenticação
- Verificar se o token está sendo enviado
- Verificar se o token não expirou
- Verificar se o JWT_SECRET está configurado

## 📈 Monitoramento

### Logs
- Logs de erro no console
- Logs de requisições
- Logs de upload de arquivos

### Métricas
- Número de requisições
- Tempo de resposta
- Uso de memória

## 🔄 Próximos Passos

### Melhorias Planejadas
- [ ] Integração com banco de dados (MongoDB/PostgreSQL)
- [ ] Cache com Redis
- [ ] Logs estruturados
- [ ] Métricas com Prometheus
- [ ] Rate limiting
- [ ] Compressão de imagens
- [ ] Backup automático
- [ ] Testes automatizados

### Segurança
- [ ] Rate limiting por IP
- [ ] Validação mais rigorosa de arquivos
- [ ] Sanitização de dados
- [ ] Logs de auditoria

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2024  
**Desenvolvido para**: Mutanha Angola 