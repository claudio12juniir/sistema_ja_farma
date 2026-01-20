require('dotenv').config(); // Permite ler variáveis da nuvem
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

// 1. CONFIGURAÇÃO DE SEGURANÇA (CORS)
// Libera o Electron para acessar o servidor de qualquer lugar
app.use(cors()); 
app.use(express.json({ limit: '50mb' })); // Aumenta limite para receber dados grandes

// 2. CONEXÃO COM BANCO DE DADOS (HÍBRIDA)
// Se tiver na nuvem (Railway), usa as variáveis de lá.
// Se tiver no seu PC, usa o padrão localhost/root.
// Substitua o bloco antigo por este:
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || '127.0.0.1',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway', // Geralmente 'railway' na nuvem
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// O Pool não precisa de ".connect()", ele conecta sob demanda.
// Mas podemos testar se ele está funcionando assim:
pool.getConnection((err, conn) => {
    if (err) console.error("❌ Erro no Pool:", err.message);
    else {
        console.log("✅ Pool de Conexões pronto!");
        conn.release(); // Devolve a conexão para o pool
    }
});
// Mantém a conexão viva
connection.connect(err => {
    if (err) {
        console.error("❌ ERRO AO CONECTAR NO BANCO:", err.message);
    } else {
        console.log("✅ Conectado ao MySQL com sucesso!");
    }
});

// ============================================
// 3. ROTAS DO SISTEMA
// ============================================

// ROTA DE LOGIN
app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    console.log(`🔍 Login: Tentativa de ${user}`);

    const sql = "SELECT * FROM usuarios WHERE user = ? AND pass = ?";
    pool.query(sql, [user, pass], (err, results) => {
        if (err) return res.status(500).json({ success: false, msg: "Erro no Banco" });
        
        if (results.length > 0) {
            res.json({ success: true, usuario: results[0] });
        } else {
            res.json({ success: false, msg: "Usuário/Senha incorretos" });
        }
    });
});

// ROTA DE PRODUTOS (Busca e Listagem)
app.get('/produtos', (req, res) => {
    const busca = req.query.busca;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    let sql = "SELECT * FROM produtos";
    let params = [];

    if (busca) {
        sql += " WHERE nome LIKE ? OR codigo_barras LIKE ?";
        params = [`%${busca}%`, `%${busca}%`];
    }

    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.error("Erro produtos:", err);
            return res.json([]);
        }
        res.json(results);
    });
});

// IMPORTAÇÃO DE PRODUTOS (XML/SIDICOM)
app.post('/produtos/importar', (req, res) => {
    const itens = req.body; // Array de produtos
    if (!itens || itens.length === 0) return res.json({ success: false });

    // Monta query gigante para salvar tudo de uma vez
    const valores = itens.map(i => [i.nome, i.codigo_barras, i.qtd_estoque, i.preco_custo, i.preco_venda || 0]);
    const sql = "INSERT INTO produtos (nome, codigo_barras, qtd_estoque, preco_custo, preco_venda) VALUES ?";
    
    pool.query(sql, [valores], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, msg: err.message });
        }
        res.json({ success: true, qtd: result.affectedRows });
    });
});

// ROTA DE COTAÇÕES (Histórico)
app.get('/cotacoes', (req, res) => {
    pool.query("SELECT * FROM cotacoes ORDER BY id DESC LIMIT 100", (err, results) => {
        if (err) return res.json([]);
        // Parseia o JSON do resultadoIA para não quebrar o front
        const formatado = results.map(c => ({
            ...c,
            resultadoIA: typeof c.resultadoIA === 'string' ? JSON.parse(c.resultadoIA) : c.resultadoIA
        }));
        res.json(formatado);
    });
});

// SALVAR NOVA COTAÇÃO
app.post('/cotacoes', (req, res) => {
    const { cliente, vendedor, data, status, feedback, resultadoIA } = req.body;
    const sql = "INSERT INTO cotacoes (cliente, vendedor, data, status, feedback, resultadoIA) VALUES (?, ?, ?, ?, ?, ?)";
    
    // Converte o objeto do resultado para String JSON para salvar no banco
    const jsonIA = JSON.stringify(resultadoIA);

    pool.query(sql, [cliente, vendedor, data, status, feedback, jsonIA], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// EXCLUIR COTAÇÃO
app.delete('/cotacoes/:id', (req, res) => {
    connection.query("DELETE FROM cotacoes WHERE id = ?", [req.params.id], (err) => {
        if(err) return res.status(500).json({success: false});
        res.json({success: true});
    });
});

// ATUALIZAR STATUS COTAÇÃO
app.put('/cotacoes/:id', (req, res) => {
    const { status, feedback } = req.body;
    pool.query("UPDATE cotacoes SET status = ?, feedback = ? WHERE id = ?", [status, feedback, req.params.id], (err) => {
        if(err) return res.status(500).json({success: false});
        res.json({success: true});
    });
});

// CLIENTES E USUÁRIOS
app.get('/clientes', (req, res) => {
    connection.query("SELECT * FROM clientes", (err, r) => res.json(err ? [] : r));
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

// DADOS PARA GRÁFICOS (Dashboard)
app.get('/analise/dados', (req, res) => {
    // Queries simples para popular os gráficos
    const sqlMais = "SELECT nome, qtd_estoque as qtd, 100 as mediaMercadoQtd FROM produtos ORDER BY qtd_estoque DESC LIMIT 5";
    const sqlMenos = "SELECT nome, preco_custo as preco, (preco_custo * 1.2) as precoMercado FROM produtos ORDER BY qtd_estoque ASC LIMIT 5";

    pool.query(sqlMais, (err, resMais) => {
        pool.query(sqlMenos, (err2, resMenos) => {
            res.json({
                maisVendidos: resMais || [],
                menosVendidos: resMenos || []
            });
        });
    });
});

// ============================================
// 4. INICIALIZAÇÃO DO SERVIDOR
// ============================================
// Usa a porta da nuvem (process.env.PORT) ou 3000 se for local
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Acessível via http://localhost:${PORT} ou IP da Nuvem`);
});