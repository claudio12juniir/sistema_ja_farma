require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// 1. CONFIGURAÇÃO DE SEGURANÇA E LIMITES
app.use(cors()); 
app.use(express.json({ limit: '50mb' }));

// 2. CONFIGURAÇÃO DO POOL DE CONEXÕES (HÍBRIDO: NUVEM/LOCAL)
const pool = mysql.createPool({
    // O Railway preenche essas variáveis automaticamente se você fez o "Reference"
    host: process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '', 
    database: process.env.MYSQLDATABASE || 'railway', 
    port: process.env.MYSQLPORT || 3306,
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Verificador de conexão para o Log do Railway
pool.getConnection((err, conn) => {
    if (err) {
        console.error("❌ ERRO NO POOL: Verifique se as variáveis do Railway estão conectadas!");
        console.error("Detalhe do erro:", err.message);
    } else {
        console.log("✅ Conectado ao MySQL da Nuvem com sucesso!");
        conn.release();
    }
});

// ============================================
// 3. ROTAS (LOGIN E OPERAÇÕES)
// ============================================

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    // O pool gerencia a abertura e fechamento da conexão automaticamente
    pool.query("SELECT * FROM usuarios WHERE user = ? AND pass = ?", [user, pass], (err, results) => {
        if (err) return res.status(500).json({ success: false, msg: "Erro interno no banco" });
        if (results.length > 0) {
            res.json({ success: true, usuario: results[0] });
        } else {
            res.json({ success: false, msg: "Usuário ou senha incorretos" });
        }
    });
});

app.get('/produtos', (req, res) => {
    const busca = req.query.busca;
    let sql = "SELECT * FROM produtos";
    let params = [];
    if (busca) {
        sql += " WHERE nome LIKE ? OR codigo_barras LIKE ?";
        params = [`%${busca}%`, `%${busca}%`];
    }
    sql += " LIMIT 50";
    
    pool.query(sql, params, (err, results) => {
        if (err) return res.json([]);
        res.json(results);
    });
});

app.post('/produtos/importar', (req, res) => {
    const itens = req.body;
    if (!itens || itens.length === 0) return res.json({ success: false });
    const valores = itens.map(i => [i.nome, i.codigo_barras, i.qtd_estoque, i.preco_custo, i.preco_venda || 0]);
    const sql = "INSERT INTO produtos (nome, codigo_barras, qtd_estoque, preco_custo, preco_venda) VALUES ?";
    
    pool.query(sql, [valores], (err, result) => {
        if (err) return res.json({ success: false, msg: err.message });
        res.json({ success: true, qtd: result.affectedRows });
    });
});

app.get('/cotacoes', (req, res) => {
    pool.query("SELECT * FROM cotacoes ORDER BY id DESC LIMIT 100", (err, results) => {
        if (err) return res.json([]);
        const formatado = results.map(c => ({
            ...c,
            resultadoIA: typeof c.resultadoIA === 'string' ? JSON.parse(c.resultadoIA) : c.resultadoIA
        }));
        res.json(formatado);
    });
});

app.post('/cotacoes', (req, res) => {
    const { cliente, vendedor, data, status, feedback, resultadoIA } = req.body;
    const jsonIA = JSON.stringify(resultadoIA);
    const sql = "INSERT INTO cotacoes (cliente, vendedor, data, status, feedback, resultadoIA) VALUES (?, ?, ?, ?, ?, ?)";
    
    pool.query(sql, [cliente, vendedor, data, status, feedback, jsonIA], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/usuarios', (req, res) => {
    pool.query("SELECT id, nome, user, perfil FROM usuarios", (err, r) => res.json(err ? [] : r));
});

app.post('/usuarios', (req, res) => {
    const { nome, user, pass, perfil } = req.body;
    pool.query("INSERT INTO usuarios (nome, user, pass, perfil) VALUES (?,?,?,?)", [nome, user, pass, perfil], (err) => {
        if(err) return res.json({ success: false, code: err.code });
        res.json({ success: true });
    });
});

app.delete('/usuarios/:id', (req, res) => {
    pool.query("DELETE FROM usuarios WHERE id = ?", [req.params.id], (err) => res.json({ success: !err }));
});

app.get('/analise/dados', (req, res) => {
    const sqlMais = "SELECT nome, qtd_estoque as qtd FROM produtos ORDER BY qtd_estoque DESC LIMIT 5";
    const sqlMenos = "SELECT nome, preco_custo as preco FROM produtos ORDER BY qtd_estoque ASC LIMIT 5";
    
    pool.query(sqlMais, (err, resMais) => {
        pool.query(sqlMenos, (err2, resMenos) => {
            res.json({
                maisVendidos: resMais || [],
                menosVendidos: resMenos || []
            });
        });
    });
});

// 4. INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});