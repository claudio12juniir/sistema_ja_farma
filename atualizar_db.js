const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost', user: 'root', password: '', database: 'sistema_ja_farma'
});

connection.connect();

const sql = `
    ALTER TABLE produtos
    ADD COLUMN anvisa VARCHAR(50) DEFAULT 'Isento',
    ADD COLUMN fabricante VARCHAR(100) DEFAULT 'Genérico';
`;

connection.query(sql, (err) => {
    if (err) console.log("Aviso: Colunas já existem ou erro:", err.message);
    else console.log("✅ Colunas 'anvisa' e 'fabricante' adicionadas com sucesso!");
    process.exit();
});