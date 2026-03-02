const pool = require('../config/database');

async function resetDatabase() {
  try {
    console.log('🔄 Resetando banco de dados...');
    
    // Lista de tabelas para deletar (em ordem de dependência)
    const tables = [
      'order_items',
      'orders', 
      'products',
      'customers',
      'users'
    ];
    
    // Deletar tabelas
    for (const table of tables) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ Tabela ${table} deletada`);
      } catch (error) {
        console.log(`   ⚠️  Erro ao deletar ${table}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ Banco de dados resetado com sucesso!');
    console.log('📝 Execute "npm run db:init" para recriar as tabelas');
    
  } catch (error) {
    console.error('❌ Erro ao resetar banco de dados:', error.message);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase }; 