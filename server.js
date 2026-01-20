const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // LIBERA O ACESSO DO ELECTRON

// CONFIGURAÇÃO DO BANCO
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sistema_ja_farma'
});

connection.connect(err => {
    if (err) {
        console.error("❌ ERRO FATAL: O servidor não conectou no banco de dados!");
        console.error("Verifique se o XAMPP/MySQL está ligado.");
    } else {
        console.log("✅ Conectado ao MySQL com sucesso!");
    }
});

// ROTA DE LOGIN (AQUI ESTAVA O PROBLEMA PROVAVELMENTE)
app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    
    console.log(`🔍 Tentativa de login recebida para usuário: "${user}"`);

    // A consulta precisa usar os nomes EXATOS da tabela que criamos (user, pass)
    const sql = "SELECT * FROM usuarios WHERE user = ? AND pass = ?";
    
    connection.query(sql, [user, pass], (err, results) => {
        if (err) {
            console.error("❌ ERRO DE SQL:", err); // ISSO VAI MOSTRAR O ERRO REAL NO TERMINAL
            return res.status(500).json({ success: false, message: "Erro interno no banco de dados." });
        }

        if (results.length > 0) {
            console.log("✅ Login autorizado!");
            res.json({ success: true, usuario: results[0] });
        } else {
            console.log("⛔ Login negado (Senha incorreta ou usuário não existe).");
            res.json({ success: false, message: "Usuário ou senha incorretos." });
        }
    });
});

// ROTAS BÁSICAS PARA O SISTEMA NÃO DAR 404
app.get('/clientes', (req, res) => res.json([])); // Placeholder
app.get('/produtos', (req, res) => res.json([])); // Placeholder
app.get('/cotacoes', (req, res) => res.json([])); // Placeholder

// INICIALIZAÇÃO
app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 Servidor rodando na porta 3000 (http://127.0.0.1:3000)');
});