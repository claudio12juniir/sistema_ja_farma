const mysql = require('mysql2');

// Configuração da Conexão
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sistema_ja_farma'
});

connection.connect(err => {
    if (err) {
        console.error("❌ ERRO GRAVE: O MySQL não conectou.");
        console.error("Verifique se o XAMPP está aberto e o MySQL está VERDE.");
        return;
    }
    console.log("✅ Conectado ao MySQL. Iniciando reconstrução da tabela de usuários...");

    // 1. APAGAR TABELA ANTIGA (Para garantir que não tenha coluna errada)
    connection.query("DROP TABLE IF EXISTS usuarios", (err) => {
        if(err) console.log("Aviso ao apagar:", err.message);

        // 2. CRIAR TABELA NOVA (Com os nomes exatos que o server.js pede: user, pass)
        const sqlCreate = `
            CREATE TABLE usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100),
                user VARCHAR(50) NOT NULL,
                pass VARCHAR(50) NOT NULL,
                perfil VARCHAR(20) DEFAULT 'COLABORADOR'
            )
        `;

        connection.query(sqlCreate, (err) => {
            if (err) {
                console.error("❌ Erro ao criar tabela:", err.message);
                process.exit(1);
            }
            console.log("✅ Tabela 'usuarios' recriada do zero.");

            // 3. INSERIR O ADMIN
            const sqlInsert = "INSERT INTO usuarios (nome, user, pass, perfil) VALUES (?, ?, ?, ?)";
            const valores = ['Administrador', 'admin', 'admin123', 'ADMIN'];

            connection.query(sqlInsert, valores, (err) => {
                if (err) {
                    console.error("❌ Erro ao inserir admin:", err.message);
                } else {
                    console.log("------------------------------------------------");
                    console.log("🎉 CONSERTO CONCLUÍDO!");
                    console.log("------------------------------------------------");
                    console.log("Pode tentar logar agora com:");
                    console.log("Usuário: admin");
                    console.log("Senha:   admin123");
                    console.log("------------------------------------------------");
                }
                process.exit();
            });
        });
    });
});