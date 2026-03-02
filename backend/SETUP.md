# 🗄️ Configuração do Banco de Dados PostgreSQL

## 📋 Pré-requisitos

1. **PostgreSQL instalado** no seu sistema
2. **Node.js** e **npm** instalados
3. **Permissões** para criar bancos de dados

## 🚀 Passos para Configuração

### 1. Instalar PostgreSQL

#### Windows:
- Baixe o PostgreSQL em: https://www.postgresql.org/download/windows/
- Durante a instalação, anote a senha do usuário `postgres`
- Mantenha a porta padrão (5432)

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Criar o Banco de Dados

Conecte ao PostgreSQL como superusuário:

```bash
# Windows (se instalado via instalador)
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

Execute os comandos SQL:

```sql
-- Criar o banco de dados
CREATE DATABASE "Mutanha";

-- Verificar se foi criado
\l

-- Sair do psql
\q
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/` com o seguinte conteúdo:

```env
# Configurações do Banco de Dados PostgreSQL
DB_USER=postgres
DB_HOST=localhost
DB_NAME=Mutanha
DB_PASSWORD=sua_senha_aqui
DB_PORT=5432

# Configurações do JWT
JWT_SECRET=Mutanhaness_secret_key_2024

# Configurações do Servidor
PORT=3000
NODE_ENV=development
```

**⚠️ IMPORTANTE:** Substitua `sua_senha_aqui` pela senha que você definiu durante a instalação do PostgreSQL.

### 4. Instalar Dependências

```bash
cd backend
npm install
```

### 5. Inicializar o Banco de Dados

```bash
# Criar as tabelas e dados iniciais
npm run db:init
```

### 6. Iniciar o Servidor

```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# Modo produção
npm start
```

## 🔑 Credenciais Padrão

Após a inicialização, você pode fazer login com:

- **Username:** `admin`
- **Password:** `password`

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas:

1. **`users`** - Administradores do sistema
2. **`products`** - Produtos do catálogo
3. **`customers`** - Clientes cadastrados
4. **`orders`** - Pedidos realizados
5. **`order_items`** - Itens de cada pedido

### Scripts Disponíveis:

- `npm run db:init` - Inicializar banco de dados
- `npm run db:reset` - Resetar banco de dados (apagar todas as tabelas)
- `npm run dev` - Iniciar servidor em modo desenvolvimento

## 🔧 Solução de Problemas

### Erro de Conexão:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solução:**
1. Verifique se o PostgreSQL está rodando
2. Confirme se a porta 5432 está correta
3. Verifique as credenciais no arquivo `.env`

### Erro de Permissão:
```
Error: permission denied for database "Mutanha"
```

**Solução:**
1. Verifique se o usuário `postgres` tem permissões
2. Confirme se o banco "Mutanha" existe
3. Execute: `GRANT ALL PRIVILEGES ON DATABASE "Mutanha" TO postgres;`

### Erro de Senha:
```
Error: password authentication failed
```

**Solução:**
1. Verifique a senha no arquivo `.env`
2. Teste a conexão: `psql -U postgres -d Mutanha -h localhost`

## 📱 URLs de Acesso

Após iniciar o servidor:

- **API:** http://localhost:3000/api
- **Admin Panel:** http://localhost:3000/admin
- **Uploads:** http://localhost:3000/uploads

## 🔒 Segurança

- **Altere a senha padrão** do usuário admin após o primeiro login
- **Configure um JWT_SECRET único** em produção
- **Use HTTPS** em ambiente de produção
- **Configure firewall** para proteger o PostgreSQL

## 📈 Próximos Passos

1. Fazer login no painel admin
2. Adicionar produtos ao catálogo
3. Configurar categorias
4. Testar upload de imagens
5. Cadastrar clientes de teste
6. Criar pedidos de exemplo 