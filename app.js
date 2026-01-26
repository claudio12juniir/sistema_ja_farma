// NO INÍCIO DO APP.JS
const API_URL = "https://sistema-ja-farma.onrender.com";
// VARIÁVEIS GLOBAIS
let listaClientes = [];
let dadosCotacaoAtual = [];
let usuarioLogado = null;
let nomeClienteFoco = "Cliente Balcão";
let fretePercentualGlobal = 0.30; 
let itensXMLParaImportar = []; 
let paginaAtualEstoque = 1;
let termoBuscaAtual = "";

// Instâncias dos Gráficos
let chartTopItens = null;
let chartMenosVendidos = null;
let chartVolume = null;

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("not-logged");
    showTab('aba-login');

    const btnLogin = document.getElementById("btn-login");
    if(btnLogin) btnLogin.addEventListener("click", realizarLogin);
    
    const inputBusca = document.getElementById('search-produto');
    if(inputBusca) inputBusca.addEventListener('keyup', (e) => { if(e.key === 'Enter') filtrarEstoqueServer(true); });
});

// ==========================================
// 1. LOGIN E IDENTIFICAÇÃO VISUAL
// ==========================================
// ======================================================
// SUBSTITUA A FUNÇÃO realizarLogin INTEIRA POR ESTA:
// ======================================================

async function realizarLogin() {

    const user = document.getElementById("login-user").value.trim().toLowerCase();
    const pass = document.getElementById("login-pass").value.trim();
    const msgErro = document.getElementById("msg-erro");
    const btn = document.getElementById("btn-login");
console.log(1);
    // Limpa mensagens anteriores
    if(msgErro) {
        msgErro.style.display = "none";
        msgErro.innerText = "";
    }

    if (!user || !pass) {
        if(msgErro) {
            msgErro.innerText = "⚠️ Preencha usuário e senha.";
            msgErro.style.display = "block";
        } else {
            alert("Preencha usuário e senha.");
        }
        return;
    }
console.log(2);
    try {
        btn.innerText = "Conectando...";
        btn.disabled = true;

        console.log("Tentando conectar em:", `${API_URL}/login`);
console.log(3);
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, pass })
        });
console.log(4);
console.log(res);
        // --- AQUI ESTÁ A CORREÇÃO DO ERRO JSON ---
        const textoResposta = await res.text(); // Lê a resposta crua primeiro
        let data;
        
        try { console.log(5);
            console.log(textoResposta);
            data =textoResposta; // Tenta converter para JSON
            console.log(data);
        } catch (e) {
            // Se falhar, é porque o servidor devolveu erro HTML ou vazio
            console.error("RESPOSTA NÃO É JSON:", textoResposta);
            throw new Error(`O servidor respondeu com erro: ${res.status} - Verifique o console.`);
        }
        // -----------------------------------------

        /* data = {
            status: res.status,
            usuario: { nome: "Administrador", perfil: "ADMIN" }
        }
            */
        
        if (res.status === 200) {
            console.log(6);
            console.log("✅ Login Sucesso! Iniciando transição...");
            usuarioLogado = data.usuario;
            document.body.classList.remove("not-logged");
            
            // Atualizações Visuais
            const elUser = document.getElementById('display-username');
            if (elUser) elUser.innerText = usuarioLogado.nome;

            const elInitials = document.getElementById('user-initials');
            if (elInitials && usuarioLogado.nome) {
                const iniciais = usuarioLogado.nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                elInitials.innerText = iniciais;
            }

            const elGreeting = document.getElementById('greeting-time');
            if (elGreeting) {
                const hora = new Date().getHours();
                elGreeting.innerText = (hora >= 5 && hora < 12) ? "Olá, bom dia" : (hora >= 12 && hora < 18) ? "Olá, boa tarde" : "Olá, boa noite";
            }

            document.querySelectorAll('.admin-only').forEach(btn => {
                if(btn) btn.style.display = (usuarioLogado.perfil === 'ADMIN') ? 'block' : 'none';
            });
            
            const elVendedor = document.getElementById("cotacaoVendedor");
            if(elVendedor) elVendedor.value = usuarioLogado.nome;

            await carregarDadosIniciais();
            showTab('intro'); 

        } else { console.log(7);
            // Senha incorreta (mas o servidor respondeu corretamente)
            if(msgErro) {
                msgErro.innerText = "❌ " + (data.msg || "Usuário ou senha incorretos.");
                msgErro.style.display = "block";
            } else {
                alert(data.msg || "Usuário ou senha incorretos.");
            }
        }
    } catch (error) { 
        console.error("ERRO TÉCNICO:", error);
        
        if (usuarioLogado) {
            showTab('intro');
        } else {
            if(msgErro) {
                // Mostra um erro mais amigável na tela
                msgErro.innerText = "⚠️ Erro de conexão com o Servidor. Tente novamente em 1 minuto.";
                msgErro.style.display = "block";
            } else {
                alert("Erro ao conectar no servidor. Verifique o console.");
            }
        }
    } finally {
        if(btn) {
            btn.innerText = "ACESSAR SISTEMA";
            btn.disabled = false;
        }
    }
}
// 2. NAVEGAÇÃO
function showTab(id) {
    if (['serv1', 'aba-gestao', 'aba-estoque'].includes(id) && usuarioLogado?.perfil !== 'ADMIN') 
        return alert("Acesso restrito ao Administrador.");
    
    document.querySelectorAll(".tab").forEach(t => { t.style.display = "none"; t.classList.remove('active'); });
    const target = document.getElementById(id);
    if(target) { target.style.display = "block"; target.classList.add('active'); }
    
    const sidebar = document.getElementById("main-sidebar");
    const content = document.getElementById("main-content");
    if (id === 'aba-login') { sidebar.style.display = "none"; content.style.marginLeft = "0"; }
    else { sidebar.style.display = "flex"; content.style.marginLeft = "320px"; }

    // Gatilhos de carregamento específicos
    if(id === 'serv1') carregarDashboard(); 
    if(id === 'aba-gestao') carregarEquipe(); 
    if(id === 'serv2') carregarHistorico(); 
}

// ==========================================
// 3. ESTOQUE (COM PAGINAÇÃO)
// ==========================================
async function filtrarEstoqueServer(reset = true) {
    const termoInput = document.getElementById('search-produto').value;
    const btnCarregar = document.getElementById('loader-estoque');
    const tbody = document.getElementById('tabela-estoque');

    if (reset) {
        paginaAtualEstoque = 1; termoBuscaAtual = termoInput;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando...</td></tr>';
        if(btnCarregar) btnCarregar.style.display = 'none';
    }

    try {
        const url = termoBuscaAtual 
            ? `${API_URL}/produtos?busca=${encodeURIComponent(termoBuscaAtual)}&page=${paginaAtualEstoque}` 
            : `${API_URL}/produtos?page=${paginaAtualEstoque}`;
        const res = await fetch(url);
        const novosItens = await res.json();

        if (reset) tbody.innerHTML = '';
        if (novosItens.length === 0 && reset) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum produto encontrado.</td></tr>';
            if(btnCarregar) btnCarregar.style.display = "none";
            return;
        }
        renderizarEstoque(novosItens);
        if (btnCarregar) btnCarregar.style.display = (novosItens.length < 50) ? "none" : "block";

    } catch (e) { console.error(e); if(reset) tbody.innerHTML = '<tr><td colspan="6">Erro conexão.</td></tr>'; }
}

function carregarMaisProdutos() { paginaAtualEstoque++; filtrarEstoqueServer(false); }

function renderizarEstoque(lista) {
    const tbody = document.getElementById('tabela-estoque');
    lista.forEach(prod => {
        const anvisa = prod.anvisa && prod.anvisa !== 'undefined' ? prod.anvisa : '-';
        tbody.innerHTML += `
            <tr>
                <td><strong>${prod.nome}</strong><br><small style="color:#666">${prod.codigo_barras || ''}</small></td>
                <td style="text-align:center;"><span class="badge ${prod.qtd_estoque > 0 ? 'badge-verde':'badge-amarelo'}">${prod.qtd_estoque} un</span></td>
                <td style="text-align:right">R$ ${Number(prod.preco_custo).toFixed(2)}</td>
                <td style="text-align:right">R$ ${Number(prod.preco_venda).toFixed(2)}</td>
                <td>${anvisa}</td>
                <td style="text-align:right"><button class="btn-primary" style="padding:5px 10px">✏</button></td>
            </tr>`;
    });
}

// ==========================================
// 4. CONFIGURAÇÃO DA COTAÇÃO
// ==========================================
function iniciarCotacao() { document.getElementById("dadosCotacaoModal").style.display = "flex"; }
function fecharDadosCotacao() { document.getElementById("dadosCotacaoModal").style.display = "none"; }
async function confirmarDadosCotacao() { 
    const cli = document.getElementById("cotacaoCliente").value;
    const freteSelect = document.getElementById("cotacaoRegiao").value;
    if(!cli) return alert("Informe o Cliente.");
    nomeClienteFoco = cli; fretePercentualGlobal = parseFloat(freteSelect); 
    fecharDadosCotacao(); showTab('aba-upload'); 
}

// ==========================================
// 5. COTAÇÃO INTELIGENTE (IA + MEMÓRIA)
// ==========================================
async function buscarProdutoNoEstoque(nomeItem) {
    if (!nomeItem) return null;
    let limpo = nomeItem.replace(/[\.\-\/]/g, " ");
    const ignorar = ["DE", "DA", "DO", "COM", "PARA", "P/", "C/", "FRASCO", "CX", "AMPOLA", "UNIDADE", "SOLUCAO"];
    const palavras = limpo.split(" ").filter(p => p.length > 2 && !ignorar.includes(p.toUpperCase()));
    const termo = palavras.slice(0, 3).join(" "); 
    const res = await fetch(`${API_URL}/produtos?busca=${encodeURIComponent(termo)}`);
    const prods = await res.json();
    return prods.length > 0 ? prods[0] : null;
}

async function processarAnaliseIA() {
    const btn = document.getElementById("btn-processar");
    const tbody = document.getElementById("tabela-conferencia-body");
    
    const fileBase = document.getElementById('pdf-base').files[0];
    const filesFornecedores = document.getElementById('pdf-fornecedores').files;

    btn.innerText = "⏳ Processando..."; 
    btn.disabled = true;

    try {
        let txtBase = "";
        let modoAnalise = "";

        // --- LÓGICA DE DECISÃO (Fase 1 ou Fase 2) ---

        // CENÁRIO 1: Novo Pedido do Cliente (Tem PDF no campo 1)
        if (fileBase) {
            console.log("Modo: Leitura Inicial do Cliente");
            const leitura = await window.api.readPdfs(fileBase.path);
            txtBase = leitura[0].texto;
            modoAnalise = "INICIAL";
        } 
        // CENÁRIO 2: Comparação de Fornecedores (Sem PDF 1, mas tem PDF 2)
        else if (filesFornecedores.length > 0) {
            console.log("Modo: Comparação de Fornecedores (Usando Memória)");
            
            const memoria = localStorage.getItem('cotacao_pendente_itens');
            if (!memoria) {
                throw new Error("Não encontrei a lista de produtos na memória. Por favor, faça o upload do PDF do Cliente pelo menos uma vez.");
            }
            
            const listaSalva = JSON.parse(memoria);
            txtBase = "LISTA DE PRODUTOS DESEJADOS:\n" + listaSalva.map(i => `- ${i.item} (Qtd: ${i.qtd})`).join("\n");
            modoAnalise = "COMPARACAO";
        } 
        else {
            throw new Error("Selecione o PDF do Cliente (para iniciar) ou PDFs de Fornecedores (para comparar).");
        }

        // --- LEITURA DOS FORNECEDORES (SE HOUVER) ---
        let txtForn = "";
        if (filesFornecedores.length > 0) {
            const paths = Array.from(filesFornecedores).map(f => f.path);
            const resForn = await window.api.readPdfs(paths);
            txtForn = resForn.map(r => r.texto).join("\n");
        }

        // --- ENVIA PARA A IA ---
        const itensIA = await window.api.compararCotacao({ textoBase: txtBase, textoFornecedores: txtForn });
        
        if (!itensIA || itensIA.length === 0) throw new Error("A IA não retornou itens válidos.");

        // Limpa tabela visual
        dadosCotacaoAtual = []; 
        tbody.innerHTML = "";
        let temItemFaltante = false;

        // --- PROCESSAMENTO DOS DADOS RETORNADOS ---
        for (const item of itensIA) {
            const produtoInterno = await buscarProdutoNoEstoque(item.item);
            
            let status="", acao="", cor="", origem=""; 
            let precoReferencia = 0, custoUnit = 0;
            let anvisa = "N/D", fabricante = "N/D";

            // Recupera referência interna
            if (produtoInterno) {
                precoReferencia = Number(produtoInterno.preco_custo);
                anvisa = produtoInterno.anvisa || "Isento";
                fabricante = produtoInterno.fabricante || "Genérico";
            }

            // Lógica de Cores e Decisão
            if (produtoInterno && produtoInterno.qtd_estoque >= item.qtd) {
                // TEM NO ESTOQUE (Verde)
                status = `ESTOQUE (${produtoInterno.qtd_estoque})`;
                acao = "SEPARAR";
                cor = "#dcfce7"; 
                origem = "LOJA";
                custoUnit = Number(produtoInterno.preco_custo);
            } else {
                temItemFaltante = true; 
                
                if (item.valor > 0) {
                    // JÁ TEMOS COTAÇÃO DO FORNECEDOR (Azul)
                    status = `COMPRA (${item.fornecedor})`;
                    acao = "MENOR PREÇO";
                    cor = "#dbeafe"; 
                    origem = "FORNECEDOR";
                    custoUnit = Number(item.valor);
                } else {
                    // AINDA NÃO TEMOS PREÇO (Vermelho)
                    status = "FALTA ESTOQUE";
                    acao = "COTAR";
                    cor = "#fee2e2"; 
                    origem = "PENDENTE";
                    custoUnit = 0;
                }
            }

            // Cálculos Financeiros
            const vendaUnit = custoUnit > 0 ? custoUnit * 1.5 : 0;
            const vendaFreteTotal = (vendaUnit * (1 + fretePercentualGlobal)) * item.qtd;

            dadosCotacaoAtual.push({ 
                item: item.item, qtd: Number(item.qtd), status, acao, origem, 
                precoReferencia, custoUnit, vendaFreteTotal, anvisa, fabricante
            });

            // Renderiza na tela
            let displayPreco = custoUnit > 0 ? `R$ ${custoUnit.toFixed(2)}` : "Aguardando";
            
            tbody.innerHTML += `
            <tr style="background:${cor}; border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px"><b>${item.item}</b><br><small>${origem}</small></td>
                <td style="text-align:center;">${item.qtd}</td>
                <td style="text-align:center;">${status}</td>
                <td style="text-align:right;">
                    <small style="color:#64748b">Ref: R$ ${precoReferencia.toFixed(2)}</small><br>
                    <strong>${displayPreco}</strong>
                </td>
            </tr>`;
        }

        // --- SALVA NA MEMÓRIA (FASE 1) ---
        if (modoAnalise === "INICIAL") {
            const listaParaSalvar = dadosCotacaoAtual.map(i => ({ item: i.item, qtd: i.qtd }));
            localStorage.setItem('cotacao_pendente_itens', JSON.stringify(listaParaSalvar));
        }
        
        // --- BOTÕES ---
        document.getElementById("status-estoque").style.display = "block";
        let botoesHtml = "";

        if (temItemFaltante) {
            botoesHtml += `<button class="btn-primary" onclick="gerarPDFSolicitacaoFornecedor()" style="background: #f59e0b; margin-right: 10px;">📄 PDF Para Fornecedores (Sem Preços)</button>`;
        }
        botoesHtml += `<button class="btn-primary" onclick="finalizarCotacaoEBanco()" style="background: #1677ff;">✅ Gerar Proposta Cliente</button>`;

        document.getElementById("msg-resumo-estoque").innerHTML = `
            <div style="display:flex; justify-content: flex-end; margin-top:15px;">
                ${botoesHtml}
            </div>`;

    } catch (e) { 
        alert("Atenção: " + e.message); 
        console.error(e);
    } finally { 
        btn.innerText = "INICIAR ANÁLISE"; 
        btn.disabled = false; 
        if(fileBase) document.getElementById('pdf-base').value = ""; // Limpa input
    }
}

// ==========================================
// 6. GERAÇÃO DE PDFS
// ==========================================
function gerarPDFSolicitacaoFornecedor() {
    const faltantes = dadosCotacaoAtual.filter(i => i.origem !== 'LOJA');
    
    if(faltantes.length === 0) return alert("Não há itens faltantes para cotar.");

    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF();

    // Cabeçalho Profissional
    doc.setFillColor(30, 58, 138); 
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(18); doc.setTextColor(255,255,255); 
    doc.text("SOLICITAÇÃO DE COTAÇÃO", 14, 20);
    
    doc.setFontSize(10); doc.setTextColor(0,0,0);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 40);
    doc.text("Solicitamos cotação para os itens abaixo. Favor informar valor unitário.", 14, 45);

    // Tabela SEM COLUNA DE PREÇO INTERNO
    const colunas = ["Descrição do Produto", "Quantidade Solicitada", "Observações"];
    const linhas = faltantes.map(i => [
        i.item.toUpperCase(), i.qtd, ""
    ]);

    doc.autoTable({ 
        head: [colunas], body: linhas, startY: 50, theme: 'grid',
        headStyles: { fillColor: [22, 119, 255] },
        styles: { fontSize: 11, cellPadding: 4 }
    });

    doc.save(`Cotacao_Fornecedor_${Date.now()}.pdf`);
}

async function finalizarCotacaoEBanco() {
    const temPendencia = dadosCotacaoAtual.some(i => i.origem !== 'LOJA' && i.custoUnit === 0);
    const statusFinal = temPendencia ? "PENDENTE" : "AGUARDANDO";
    const totalGeral = dadosCotacaoAtual.reduce((acc, i) => acc + i.vendaFreteTotal, 0);

    const novaCotacao = {
        cliente: nomeClienteFoco, vendedor: usuarioLogado.nome,
        data: new Date().toISOString().split('T')[0], status: statusFinal,
        feedback: `Frete: ${(fretePercentualGlobal*100)}%. Total: R$ ${totalGeral.toFixed(2)}`,
        resultadoIA: dadosCotacaoAtual
    };
    await fetch(`${API_URL}/cotacoes`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(novaCotacao) });
    carregarHistorico();
    gerarTabelaFinalCliente(dadosCotacaoAtual, nomeClienteFoco);
}

function gerarTabelaFinalCliente(dados, clienteNome) {
    const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
    doc.setFillColor(30, 58, 138); doc.rect(0, 0, 297, 30, 'F'); 
    doc.setFontSize(22); doc.setTextColor(255,255,255); doc.text("Proposta Comercial", 14, 18);
    doc.setFontSize(10); doc.setTextColor(0,0,0); doc.text(`Cliente: ${clienteNome}`, 14, 40);
    
    const colunas = ["Item", "Qtd", "Custo Unit", "Custo Total", "Total+Frete", "Anvisa", "Fabricante", "Venda Unit", "Venda Total"];
    const linhas = dados.map(i => [
        i.item, i.qtd, `R$ ${i.custoUnit.toFixed(2)}`, `R$ ${(i.custoUnit*i.qtd).toFixed(2)}`, `R$ ${(i.custoUnit*(1+fretePercentualGlobal)*i.qtd).toFixed(2)}`,
        i.anvisa, i.fabricante, `R$ ${(i.vendaFreteTotal/i.qtd).toFixed(2)}`, `R$ ${i.vendaFreteTotal.toFixed(2)}`
    ]);

    doc.autoTable({ head: [colunas], body: linhas, startY: 45, styles: { fontSize: 8 } });
    const total = dados.reduce((acc, i) => acc + i.vendaFreteTotal, 0);
    doc.text(`TOTAL GERAL: R$ ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`Proposta_${clienteNome}.pdf`);
}

// ==========================================
// 7. HISTÓRICO E EXCLUSÃO
// ==========================================
async function carregarHistorico() {
    try {
        const res = await fetch(`${API_URL}/cotacoes`);
        const dados = await res.json();
        const tbody = document.getElementById("tabela-corpo");
        
        tbody.innerHTML = "";
        document.getElementById('stat-total').innerText = dados.length;

        let vendas = 0, pendentes = 0;

        dados.forEach(c => {
            if(c.status === 'VENDIDA') vendas++;
            if(c.status === 'PENDENTE' || c.status === 'AGUARDANDO') pendentes++;

            let cor = c.status === 'AGUARDANDO' ? 'badge-azul' : c.status === 'VENDIDA' ? 'badge-verde' : 'badge-amarelo';
            
            tbody.innerHTML += `
            <tr style="cursor: pointer;" onclick="carregarCotacaoParaEdicao(${c.id})">
                <td><strong>${c.cliente}</strong></td>
                <td>${c.vendedor}</td>
                <td>${new Date(c.data).toLocaleDateString()}</td>
                <td><span class="badge ${cor}">${c.status}</span></td>
                <td style="text-align: right;" onclick="event.stopPropagation()">
                    
                    <button onclick="abrirModalFeedback(${c.id})" class="btn-primary" style="padding:4px 8px; font-size:1rem; background:none; border:none; cursor:pointer;" title="Escrever Feedback">🖊️</button>
                    <button onclick="alterarStatus(${c.id}, 'VENDIDA')" class="btn-primary" style="padding:5px 10px; font-size:0.8rem; background:#10b981;" title="Marcar como Vendida">💲</button>
                    
                    <button onclick="excluirCotacao(${c.id})" class="btn-primary" style="padding:5px 10px; font-size:0.8rem; background:#ef4444;" title="Excluir Permanentemente">✖</button>
                    
                    <button onclick='reimprimirPDF(${JSON.stringify(c).replace(/'/g, "&#39;")})' class="btn-primary" style="padding:5px 10px; font-size:0.8rem; background:#3b82f6;" title="Ver PDF">📄</button>
                </td>
            </tr>`;
        });

        if(document.getElementById('stat-concluidas')) document.getElementById('stat-concluidas').innerText = vendas;
        if(document.getElementById('stat-pendentes')) document.getElementById('stat-pendentes').innerText = pendentes;

    } catch (e) { console.error("Erro histórico:", e); }
}

async function excluirCotacao(id) {
    if(confirm("ATENÇÃO: Tem certeza que deseja excluir esta cotação permanentemente?")) {
        try {
            await fetch(`${API_URL}/cotacoes/${id}`, { method: 'DELETE' });
            carregarHistorico(); 
        } catch (e) { alert("Erro ao excluir cotação."); }
    }
}

async function carregarCotacaoParaEdicao(id) {
    const res = await fetch(`${API_URL}/cotacoes`);
    const todas = await res.json();
    const cotacao = todas.find(c => c.id === id);
    if(!cotacao || !cotacao.resultadoIA) return alert("Erro ao carregar dados.");
    
    dadosCotacaoAtual = cotacao.resultadoIA;
    nomeClienteFoco = cotacao.cliente;
    
    // Força o modo 'Memória' caso queira comparar novamente
    const listaParaSalvar = dadosCotacaoAtual.map(i => ({ item: i.item, qtd: i.qtd }));
    localStorage.setItem('cotacao_pendente_itens', JSON.stringify(listaParaSalvar));

    // Renderiza
    const tbody = document.getElementById("tabela-conferencia-body");
    tbody.innerHTML = "";
    dadosCotacaoAtual.forEach(item => {
        let cor = item.origem === 'LOJA' ? "#dcfce7" : (item.origem === 'FORNECEDOR' ? "#dbeafe" : "#fee2e2");
        let precoRef = item.precoReferencia ? `R$ ${item.precoReferencia.toFixed(2)}` : "R$ 0.00";
        
        tbody.innerHTML += `
        <tr style="background:${cor}; border-bottom:1px solid #e2e8f0;">
            <td style="padding:12px"><b>${item.item}</b><br><small>${item.origem}</small></td>
            <td style="text-align:center;">${item.qtd}</td>
            <td style="text-align:center;">${item.status}</td>
            <td style="text-align:right;"><small style="color:#64748b">Ref: ${precoRef}</small><br><strong>R$ ${item.custoUnit.toFixed(2)}</strong></td>
        </tr>`;
    });

    document.getElementById("status-estoque").style.display = "block";
    document.getElementById("msg-resumo-estoque").innerHTML = `
        <div style="display:flex; gap:10px; justify-content: flex-end; margin-top:15px;">
            <button class="btn-primary" onclick="gerarPDFSolicitacaoFornecedor()" style="background: #f59e0b;">📦 PDF Fornecedor</button>
            <button class="btn-primary" onclick="finalizarCotacaoEBanco()" style="background: #10b981;">✅ Gerar Tabela Cliente</button>
        </div>`;

    showTab('aba-upload'); 
}

// Funções de Feedback e Status
async function alterarStatus(id, novoStatus) {
    if(novoStatus === 'VENDIDA' && !confirm("Confirmar venda?")) return;
    await fetch(`${API_URL}/cotacoes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus, feedback: "", resultadoIA: [] }) });
    carregarHistorico();
}
function abrirModalFeedback(id) { document.getElementById('idCotaFeedback').value = id; document.getElementById('modalFeedback').style.display = 'flex'; }
async function salvarFeedbackConfirmado() {
    const id = document.getElementById('idCotaFeedback').value; const txt = document.getElementById('textoFeedback').value;
    await fetch(`${API_URL}/cotacoes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PENDENTE', feedback: txt }) });
    document.getElementById('modalFeedback').style.display = 'none'; carregarHistorico();
}
function reimprimirPDF(c) { if(c.resultadoIA) gerarTabelaFinalCliente(c.resultadoIA, c.cliente); }

// ==========================================
// 8. GRÁFICOS
// ==========================================
async function carregarDashboard() {
    try {
        const resAnalise = await fetch(`${API_URL}/analise/dados`);
        const dadosAnalise = await resAnalise.json();
        const resCotacoes = await fetch(`${API_URL}/cotacoes`);
        const cotacoes = await resCotacoes.json();

        const ctx1 = document.getElementById('chartTopItens');
        if (chartTopItens) chartTopItens.destroy();
        chartTopItens = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: dadosAnalise.maisVendidos.map(d => d.nome.substring(0, 15) + '...'),
                datasets: [
                    { label: 'Sua Loja (Qtd)', data: dadosAnalise.maisVendidos.map(d => d.qtd), backgroundColor: '#3b82f6', borderRadius: 4 },
                    { label: 'Média Mercado (Qtd)', data: dadosAnalise.maisVendidos.map(d => d.mediaMercadoQtd), backgroundColor: '#94a3b8', borderRadius: 4 }
                ]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });

        const ctx2 = document.getElementById('chartMenosVendidos');
        if (chartMenosVendidos) chartMenosVendidos.destroy();
        chartMenosVendidos = new Chart(ctx2, {
            type: 'line', 
            data: {
                labels: dadosAnalise.menosVendidos.map(d => d.nome.substring(0, 15) + '...'),
                datasets: [
                    { label: 'Seu Preço (R$)', data: dadosAnalise.menosVendidos.map(d => d.preco), borderColor: '#10b981', backgroundColor: '#10b981', borderWidth: 2, pointRadius: 4 },
                    { label: 'Preço Mercado (R$)', data: dadosAnalise.menosVendidos.map(d => d.precoMercado), borderColor: '#ef4444', backgroundColor: '#ef4444', borderWidth: 2, borderDash: [5, 5], pointRadius: 4 }
                ]
            },
            options: { responsive: true, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true } } }
        });

        const statusCont = { 'VENDIDA': 0, 'PENDENTE': 0, 'AGUARDANDO': 0, 'FINALIZADA': 0 };
        cotacoes.forEach(c => { if (statusCont[c.status] !== undefined) statusCont[c.status]++; });

        const ctx3 = document.getElementById('chartVolumeVendas');
        if (chartVolume) chartVolume.destroy();
        chartVolume = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCont),
                datasets: [{ data: Object.values(statusCont), backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

    } catch (e) { console.error("Erro ao carregar gráficos:", e); }
}

// ==========================================
// 9. GESTÃO DE EQUIPE
// ==========================================
async function carregarEquipe() {
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        const usuarios = await res.json();
        const tbody = document.getElementById("tabela-usuarios");
        tbody.innerHTML = "";
        usuarios.forEach(u => {
            const badgeClass = u.perfil === 'ADMIN' ? 'badge-azul' : 'badge-verde';
            const iconPerfil = u.perfil === 'ADMIN' ? '🛡️ ADMIN' : '👤 COLABORADOR';
            tbody.innerHTML += `<tr><td><strong>${u.nome}</strong></td><td>${u.user}</td><td><span style="background:#f1f5f9; padding: 2px 8px; border-radius:4px; font-family: monospace;">${u.pass}</span></td><td><span class="badge ${badgeClass}">${iconPerfil}</span></td><td style="text-align:right"><button onclick="excluirUsuario(${u.id})" class="btn-primary" style="background: #ef4444; padding: 5px 10px;" title="Remover Acesso">🗑 Excluir</button></td></tr>`;
        });
    } catch (e) { console.error("Erro ao carregar equipe:", e); }
}

async function adicionarFuncionario() {
    const nome = document.getElementById("new-nome").value.trim();
    const user = document.getElementById("new-user").value.trim();
    const pass = document.getElementById("new-pass").value.trim();
    const perfil = document.getElementById("new-perfil").value;
    if(!nome || !user || !pass) return alert("Por favor, preencha todos os campos.");

    try {
        const res = await fetch(`${API_URL}/usuarios`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ nome, user, pass, perfil }) });
        const data = await res.json();
        if (data.code === 'ER_DUP_ENTRY') alert("Login já existe.");
        else if (data.success) {
            alert("Usuário cadastrado!");
            document.getElementById("new-nome").value = ""; document.getElementById("new-user").value = ""; document.getElementById("new-pass").value = "";
            carregarEquipe();
        } else alert("Erro ao salvar.");
    } catch (e) { alert("Erro de conexão."); }
}

async function excluirUsuario(id) {
    if(usuarioLogado && usuarioLogado.id === id) return alert("Não pode excluir a si mesmo.");
    if(confirm("Remover acesso?")) { await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' }); carregarEquipe(); }
}
function logout() { location.reload(); }

// ==========================================
// 10. IMPORTAÇÃO XML E SIDICOM
// ==========================================
function processarArquivoXML(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
        const itens = xmlDoc.getElementsByTagName("det");
        itensXMLParaImportar = [];
        const tbody = document.getElementById("tbody-xml");
        tbody.innerHTML = "";
        let valorTotalNota = 0;
        for (let i = 0; i < itens.length; i++) {
            const prod = itens[i].getElementsByTagName("prod")[0];
            const nome = prod.getElementsByTagName("xProd")[0]?.textContent || "Sem Nome";
            const ean = prod.getElementsByTagName("cEAN")[0]?.textContent || "";
            const qtd = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || 0);
            const vUnit = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || 0);
            const codigoFinal = (ean === "SEM GTIN" || ean === "") ? `REF-${Date.now()}-${i}` : ean;
            itensXMLParaImportar.push({ nome: nome, codigo_barras: codigoFinal, qtd_estoque: qtd, preco_custo: vUnit });
            const totalItem = qtd * vUnit;
            valorTotalNota += totalItem;
            tbody.innerHTML += `<tr><td>${nome}</td><td>${codigoFinal}</td><td>${qtd}</td><td>R$ ${vUnit.toFixed(2)}</td><td>R$ ${totalItem.toFixed(2)}</td></tr>`;
        }
        document.getElementById("total-xml").innerText = `Total da Nota: R$ ${valorTotalNota.toFixed(2)}`;
        document.getElementById("modalXML").style.display = "flex";
        input.value = ""; 
    };
    reader.readAsText(file);
}

function processarArquivoSidicom(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const linhas = text.split('\n');
        itensXMLParaImportar = [];
        let htmlPreview = "";
        let totalItens = 0;
        const linhasDados = linhas.slice(4).filter(l => l.trim().length > 10);
        linhasDados.forEach(linha => {
            const cols = linha.split(';');
            if(cols.length < 10) return; 
            const codigo = cols[2] ? cols[2].trim() : '';
            const nome = cols[3] ? cols[3].trim() : 'Sem Nome';
            const limparNum = (v) => { if(!v) return 0; return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0; };
            const estoque = limparNum(cols[7]);      
            const precoCusto = limparNum(cols[15]);  
            const precoVenda = limparNum(cols[17]);  
            if (nome && nome !== 'Produto' && nome !== 'Sem Nome') {
                itensXMLParaImportar.push({ nome, codigo_barras: codigo, qtd_estoque: estoque, preco_custo: precoCusto, preco_venda: precoVenda });
                if(totalItens < 100) {
                    htmlPreview += `<tr><td>${nome}</td><td>${codigo}</td><td>${estoque}</td><td>R$ ${precoCusto.toFixed(2)}</td><td>R$ ${(estoque * precoCusto).toFixed(2)}</td></tr>`;
                }
                totalItens++;
            }
        });
        document.getElementById("tbody-xml").innerHTML = htmlPreview;
        document.getElementById("total-xml").innerText = `Total de Itens Lidos: ${totalItens}`;
        document.querySelector('#modalXML h2').innerText = "Importação Sistema (Sidicom)";
        document.getElementById("modalXML").style.display = "flex";
        input.value = ""; 
    };
    reader.readAsText(file, "ISO-8859-1"); 
}

async function confirmarImportacaoBanco() {
    if (itensXMLParaImportar.length === 0) return alert("Nenhum item para importar.");
    const btn = document.querySelector('#modalXML .btn-primary');
    btn.innerText = "⏳ Importando..."; btn.disabled = true;
    try {
        const res = await fetch(`${API_URL}/produtos/importar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itensXMLParaImportar) });
        const data = await res.json();
        if (data.success) {
            alert(`Sucesso! ${data.qtd} itens processados.`);
            document.getElementById("modalXML").style.display = "none";
            filtrarEstoqueServer(true);
        } else { alert("Erro ao importar."); }
    } catch (e) { alert("Erro na conexão: " + e.message); } 
    finally { btn.innerText = "✅ CONFIRMAR E LANÇAR"; btn.disabled = false; }
}