const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sistema_ja_farma'
});

connection.connect(err => {
    if (err) {
        console.error("❌ ERRO: O MySQL não conectou. Verifique o XAMPP.");
        return;
    }
    console.log("✅ Conectado ao MySQL. Iniciando reparo...");

    // 1. CRIA A TABELA CORRETA (Se não existir)
    // O código exige as colunas: nome, user, pass, perfil
    const sqlCreate = `
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100),
            user VARCHAR(50) UNIQUE, 
            pass VARCHAR(50),
            perfil VARCHAR(20)
        )
    `;

    connection.query(sqlCreate, (err) => {
        if (err) console.log("Erro ao criar tabela:", err.message);
        else console.log("✅ Tabela 'usuarios' verificada.");

        // 2. LIMPA USUÁRIOS ANTIGOS (Para evitar duplicidade ou senha errada)
        connection.query("DELETE FROM usuarios WHERE user = 'admin'", () => {
            
            // 3. INSERE O ADMIN CORRETO
            const sqlInsert = "INSERT INTO usuarios (nome, user, pass, perfil) VALUES (?, ?, ?, ?)";
            const values = ['Administrador', 'admin', 'admin123', 'ADMIN'];

            connection.query(sqlInsert, values, (err) => {
                if (err) {
                    console.error("❌ Erro ao inserir admin:", err.message);
                } else {
                    console.log("---------------------------------------------------");
                    console.log("🛠️  BANCO DE DADOS REPARADO COM SUCESSO!");
                    console.log("---------------------------------------------------");
                    console.log("Agora o banco tem exatamente o que o código pede.");
                    console.log("Login: admin");
                    console.log("Senha: admin123");
                    console.log("---------------------------------------------------");
                }
                process.exit();
            });
        });
    });
});