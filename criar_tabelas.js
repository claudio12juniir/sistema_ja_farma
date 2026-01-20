const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sistema_ja_farma'
});

connection.connect(err => {
    if (err) return console.error("❌ Erro ao conectar: " + err.message);
    console.log("✅ Conectado! Criando tabelas do sistema...");

    // 1. TABELA PRODUTOS
    const sqlProdutos = `
        CREATE TABLE IF NOT EXISTS produtos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            codigo_barras VARCHAR(100),
            qtd_estoque INT DEFAULT 0,
            preco_custo DECIMAL(10,2) DEFAULT 0,
            preco_venda DECIMAL(10,2) DEFAULT 0,
            anvisa VARCHAR(50),
            fabricante VARCHAR(100)
        )
    `;

    // 2. TABELA COTAÇÕES
    const sqlCotacoes = `
        CREATE TABLE IF NOT EXISTS cotacoes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cliente VARCHAR(150),
            vendedor VARCHAR(100),
            data DATE,
            status VARCHAR(50),
            resultadoIA JSON,
            feedback TEXT
        )
    `;

    // 3. TABELA CLIENTES
    const sqlClientes = `
        CREATE TABLE IF NOT EXISTS clientes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(150),
            email VARCHAR(150),
            telefone VARCHAR(50)
        )
    `;

    connection.query(sqlProdutos, (err) => {
        if(err) console.error("Erro Produtos:", err); else console.log("📦 Tabela Produtos: OK");
    });

    connection.query(sqlCotacoes, (err) => {
        if(err) console.error("Erro Cotações:", err); else console.log("📄 Tabela Cotações: OK");
    });

    connection.query(sqlClientes, (err) => {
        if(err) console.error("Erro Clientes:", err); else console.log("👥 Tabela Clientes: OK");

        // 4. INSERIR DADOS DE TESTE (PARA NÃO FICAR TUDO BRANCO)
        console.log("Inserindo produtos de teste...");
        const sqlInsert = `
            INSERT INTO produtos (nome, codigo_barras, qtd_estoque, preco_custo, preco_venda, anvisa) VALUES 
            ('DIPIRONA SODICA 500MG', '789101010', 100, 2.50, 5.00, '1023456'),
            ('PARACETAMOL 750MG', '789202020', 50, 3.00, 7.50, '1987654'),
            ('LUVA LATEX M', 'LUVA-M', 0, 15.00, 25.00, 'ISENTO')
        `;
        
        connection.query(sqlInsert, (err) => {
            if(err) console.log("Aviso: Produtos já existem ou erro ao inserir.");
            else console.log("✅ 3 Produtos de teste inseridos!");
            
            console.log("\n------------------------------------------------");
            console.log("TUDO PRONTO! REINICIE O SISTEMA.");
            console.log("------------------------------------------------");
            process.exit();
        });
    });
});