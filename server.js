require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// Aumentando limites e logs
app.use(cors()); 
app.use(express.json({ limit: '50mb' }));

// Middleware de Log (Vai mostrar cada pedido no Render)
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Configuração do Banco
console.log("--> Iniciando configuração do Pool...");
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Teste inicial de conexão
pool.getConnection((err, conn) => {
    if (err) {
        console.error("❌ ERRO FATAL NA CONEXÃO COM BANCO:", err.message);
    } else {
        console.log("✅ Conexão com Banco de Dados ESTÁVEL!");
        conn.release();
    }
});

// Rota de Teste Simples (Pra saber se o servidor está vivo)
app.get('/', (req, res) => {
    res.send("Servidor Online e Rodando! 🚀");
});

// === ROTA DE LOGIN (COM LOGS DE DEBUG) ===
app.post('/login', (req, res) => {
    console.log("🔑 Tentativa de Login recebida:", req.body.user);

    const { user, pass } = req.body;

    if (!user || !pass) {
        console.log("❌ Login recusado: Dados incompletos");
        return res.json({ success: false, msg: "Dados incompletos" });
    }

    const sql = "SELECT * FROM usuarios WHERE user = ? AND pass = ?";
    
    pool.query(sql, [user, pass], (err, results) => {
        if (err) {
            console.error("❌ ERRO NO SQL:", err.message);
            // IMPORTANTE: Retornar JSON mesmo no erro
            return res.status(500).json({ success: false, msg: "Erro interno no banco de dados." });
        }

        if (results.length > 0) {
            console.log("✅ Login SUCESSO para:", user);
            res.json({ success: true, usuario: results[0] });
        } else {
            console.log("⚠️ Login FALHOU (senha errada) para:", user);
            res.json({ success: false, msg: "Usuário ou senha incorretos." });
        }
    });
});

// ... (Mantenha suas outras rotas de produtos/cotações aqui embaixo igual estavam) ...

// Se nenhuma rota for encontrada
app.use((req, res) => {
    console.log("⚠️ Rota não encontrada:", req.url);
    res.status(404).json({ success: false, msg: "Rota inexistente" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});