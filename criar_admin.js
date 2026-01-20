const mysql = require('mysql2');

// CONFIGURAÇÃO DO BANCO
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sistema_ja_farma'
});

connection.connect(err => {
    if (err) return console.error('❌ Erro ao conectar:', err);
    console.log('✅ Conectado ao Banco!');

    // 1. Primeiro removemos o admin se ele já existir (para evitar duplicidade ou senha errada)
    const sqlDelete = "DELETE FROM usuarios WHERE user = 'admin'";
    
    connection.query(sqlDelete, (err) => {
        if (err) console.log("Aviso: " + err.message);

        // 2. Agora criamos o admin novo com a senha correta
        const sqlInsert = `INSERT INTO usuarios (nome, user, pass, perfil) VALUES (?, ?, ?, ?)`;
        
        // DADOS: Nome, Login (user), Senha (pass), Perfil
        const dados = ['Administrador', 'admin', 'admin123', 'ADMIN'];

        connection.query(sqlInsert, dados, (err, result) => {
            if (err) {
                console.error("❌ Erro ao criar admin:", err.message);
            } else {
                console.log("------------------------------------------------");
                console.log("🎉 USUÁRIO ADMIN CRIADO/RECUPERADO COM SUCESSO!");
                console.log("------------------------------------------------");
                console.log("Login: admin");
                console.log("Senha: admin123");
                console.log("------------------------------------------------");
            }
            process.exit();
        });
    });
});