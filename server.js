require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- DADOS DA CONEXÃO DIRETA (HARDCODED) ---
const pool = mysql.createPool({
    host: 'caboose.proxy.rlwy.net',
    port: 27046,
    user: 'root',
    password: 'UgRNqmQJypPRQyLCpTxWIAVaBSfsCByp',
    database: 'railway',                // Mantenha 'railway'. Se der erro, tente 'sistema_ja_farma'
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Teste de conexão ao iniciar
pool.getConnection((err, conn) => {
    if (err) console.error("❌ ERRO NO BANCO:", err.message);
    else {
        console.log("✅ Conectado ao Railway com Sucesso!");
        conn.release();
    }
});

// Rota de Login
app.post('/login', (req, res) => { 
    const { user, pass } = req.body;
    pool.query("SELECT * FROM usuarios WHERE user = ? AND pass = ?", [user, pass], (err, results) => {
        if (err) return res.status(500).json({ success: false, msg: err.message });
        if (results.length > 0) res.json({ success: true, usuario: results[0] });
        else res.json({ success: false, msg: "Login incorreto" });
    });
});

// Rotas Básicas
app.get('/', (req, res) => res.send("Sistema Online 🚀"));

// --- Importar Produtos ---
app.post('/produtos/importar', (req, res) => {
    const produtos = req.body;
    if (!produtos || produtos.length === 0) return res.json({ success: false, msg: "Nada para importar" });

    // Prepara SQL para inserção em massa
    const sql = "INSERT INTO produtos (nome, codigo_barras, qtd_estoque, preco_custo, preco_venda) VALUES ?";
    const values = produtos.map(p => [p.nome, p.codigo_barras, p.qtd_estoque, p.preco_custo, p.preco_venda]);

    pool.query(sql, [values], (err) => {
        if (err) return res.status(500).json({ success: false, msg: err.message });
        res.json({ success: true, qtd: produtos.length });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Rodando na porta ${PORT}`));