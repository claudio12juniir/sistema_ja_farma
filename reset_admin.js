const mysql = require('mysql2');

// Tenta conectar com 127.0.0.1, se falhar tente 'localhost'
const connection = mysql.createConnection({
    host: '127.0.0.1', 
    user: 'root',
    password: '',
    database: 'sistema_ja_farma'
});

connection.connect(err => {
    if (err) {
        console.error('❌ ERRO CRÍTICO DE CONEXÃO:', err.message);
        console.log('Dica: Verifique se o MySQL do XAMPP está VERDE.');
        return;
    }
    console.log('✅ Conectado ao Banco de Dados.');

    // 1. Apagar usuário admin antigo (se existir) para garantir
    connection.query("DELETE FROM usuarios WHERE user = 'admin'", (err) => {
        if (err) console.log('Aviso ao limpar:', err.message);

        // 2. Inserir o Admin Oficial
        const sql = "INSERT INTO usuarios (nome, user, pass, perfil) VALUES (?, ?, ?, ?)";
        const valores = ['Administrador Supremo', 'admin', 'admin123', 'ADMIN'];

        connection.query(sql, valores, (err, result) => {
            if (err) {
                console.error('❌ Erro ao criar usuário:', err.message);
            } else {
                console.log('✅ Usuário ADMIN recriado com sucesso!');
            }

            // 3. PROVA REAL: Listar o que tem no banco agora
            connection.query("SELECT id, nome, user, pass FROM usuarios", (err, rows) => {
                console.log('\n📋 LISTA REAL DE USUÁRIOS NO BANCO:');
                console.table(rows); // Vai desenhar uma tabela no terminal
                console.log('\n------------------------------------------------');
                console.log('Tente logar agora com:');
                console.log('Usuário: admin');
                console.log('Senha:   admin123');
                console.log('------------------------------------------------');
                process.exit();
            });
        });
    });
});