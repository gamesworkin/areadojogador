// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE (Substitua pelos dados do seu Console Firebase)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBu7DKMzV-LwEKcnDYK7Y-1q9pNSCHE7jE",
    authDomain: "pre-venda-4168c.firebaseapp.com",
    databaseURL: "https://pre-venda-4168c-default-rtdb.firebaseio.com/",
    projectId: "pre-venda-4168c",
    storageBucket: "pre-venda-4168c.firebasestorage.app",
    messagingSenderId: "113812783935",
    appId: "1:113812783935:web:2b1229abdd35be7b73898a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const GOOGLE_WEB_APP_URL = "COLE_AQUI_O_LINK_DO_APP_DA_WEB_DO_GOOGLE";

// Elementos HTML
const viewAuth = document.getElementById('view-auth');
const viewCliente = document.getElementById('view-cliente');
const viewAdmin = document.getElementById('view-admin');
const modalFormEnvio = document.getElementById('modal-formulario-envio');
const modalDetalhesJogo = document.getElementById('modal-detalhes-jogo');
const gridCardsCliente = document.getElementById('grid-cards-cliente');
const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');
const listaCardsCriados = document.getElementById('lista-cards-criados');
const inputWhatsApp = document.getElementById('cad-whatsapp');

let usuarioLogadoUid = null;
let dadosClienteAtual = {};
let filtroAdminAtual = "pendentes"; // Filtros possíveis: pendentes, concluidos, cadastrados

// Máscara WhatsApp
inputWhatsApp.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) { value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`; }
    else if (value.length > 2) { value = `(${value.slice(0, 2)}) ${value.slice(2)}`; }
    else if (value.length > 0) { value = `(${value}`; }
    e.target.value = value;
});

function validarProvedorEmail(email) {
    const emailLimpo = email.trim().toLowerCase();
    if (emailLimpo === "teste@teste.com") return true;
    const provedoresValidos = ["gmail.com", "hotmail.com", "outlook.com", "outlook.com.br", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com", "uol.com.br", "terra.com.br", "bol.com.br"];
    const dominio = emailLimpo.split('@')[1];
    return provedoresValidos.includes(dominio);
}

function irParaTela(tela) {
    viewAuth.classList.remove('active');
    viewCliente.classList.remove('active');
    viewAdmin.classList.remove('active');
    tela.classList.add('active');
}

// Chaves de Abas Login/Cadastro
document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('form-login').classList.add('active');
    document.getElementById('form-cadastro-auth').classList.remove('active');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-cadastro').classList.remove('active');
});
document.getElementById('tab-cadastro').addEventListener('click', () => {
    document.getElementById('form-cadastro-auth').classList.add('active');
    document.getElementById('form-login').classList.remove('active');
    document.getElementById('tab-cadastro').classList.add('active');
    document.getElementById('tab-login').classList.add('active');
});

// Configuração das 3 Abas do Admin
document.getElementById('tab-solic-pendentes').addEventListener('click', () => {
    filtroAdminAtual = "pendentes";
    document.getElementById('tab-solic-pendentes').classList.add('active');
    document.getElementById('tab-solic-concluidos').classList.remove('active');
    document.getElementById('tab-solic-cadastrados').classList.remove('active');
    document.getElementById('container-reset-pre-venda').style.display = "none";
    inicializarPainelAdmin();
});
document.getElementById('tab-solic-concluidos').addEventListener('click', () => {
    filtroAdminAtual = "concluidos";
    document.getElementById('tab-solic-concluidos').classList.add('active');
    document.getElementById('tab-solic-pendentes').classList.remove('active');
    document.getElementById('tab-solic-cadastrados').classList.remove('active');
    document.getElementById('container-reset-pre-venda').style.display = "block";
    inicializarPainelAdmin();
});
document.getElementById('tab-solic-cadastrados').addEventListener('click', () => {
    filtroAdminAtual = "cadastrados";
    document.getElementById('tab-solic-cadastrados').classList.add('active');
    document.getElementById('tab-solic-pendentes').classList.remove('active');
    document.getElementById('tab-solic-concluidos').classList.remove('active');
    document.getElementById('container-reset-pre-venda').style.display = "none";
    inicializarPainelAdmin();
});

// ==========================================================================
// MONITOR DE SESSÃO COM INTELIGÊNCIA DE CENTRAL DE COMPRAS ADAPTADA
// ==========================================================================
auth.onAuthStateChanged(user => {
    if (user) {
        usuarioLogadoUid = user.uid;
        if (user.email === "admin@admin.com") {
            irParaTela(viewAdmin);
            inicializarPainelAdmin();
            ouvirCardsGlobaisAdmin();
            ouvirEPovoarMenuVisualAdmin(); 
        } else {
            database.ref('usuarios/' + user.uid).on('value', async snapshot => {
                const dados = snapshot.val();
                if (dados) {
                    dadosClienteAtual = dados;
                    document.getElementById('user-display-name').innerText = `${dados.nome} ${dados.sobrenome}`;
                    
                    const temCardDisponivelParaComprar = await verificarSeTemCardNaoAdquirido(dados.jogos_liberados || {});
                    const areaPendente = document.getElementById('area-compra-pendente');
                    const btnAbrirForm = document.getElementById('btn-abrir-formulario');

                    // MODIFICAÇÃO CIRÚRGICA: Clientes Cadastrados voltam a ver a caixa de alertas se houver novos patches
                    if (!temCardDisponivelParaComprar) {
                        areaPendente.style.display = "none";
                    } else {
                        areaPendente.style.display = "block";
                        
                        if (dados.status_cadastro === "comprovante_enviado") {
                            document.getElementById('texto-alerta-titulo').innerText = "⏳ Comprovante em Análise";
                            document.getElementById('texto-alerta-desc').innerText = "Seu comprovante foi enviado com sucesso. Aguarde a validação do administrador.";
                            btnAbrirForm.style.display = "none";
                        } else if (dados.status_cadastro === "pago") {
                            document.getElementById('texto-alerta-titulo').innerText = "Novas Versões Disponíveis!";
                            document.getElementById('texto-alerta-desc').innerText = "Deseja garantir os novos patches lançados? Clique abaixo!";
                            btnAbrirForm.innerText = "Realizar nova compra";
                            btnAbrirForm.className = "btn-gamer btn-nova-compra";
                            btnAbrirForm.style.display = "inline-block";
                        } else {
                            // Cobre 'pendente_pagamento' e o novo status 'cliente_cadastrado'
                            document.getElementById('texto-alerta-titulo').innerText = "Garanta as Novas Atualizações!";
                            document.getElementById('texto-alerta-desc').innerText = "Envie o seu novo comprovante PIX para liberar os patches recentes no seu painel.";
                            btnAbrirForm.innerText = "Adquirir Lançamento";
                            btnAbrirForm.className = "btn-gamer";
                            btnAbrirForm.style.display = "inline-block";
                        }
                    }
                    
                    irParaTela(viewCliente);
                    ouvirCardsDoCliente(user.uid);
                    ouvirEConstruirMenuCliente(); 
                    inicializarBotaoWhatsApp();
                    configurarCopiaPixPainel(); 
                }
            });
        }
    } else {
        usuarioLogadoUid = null;
        irParaTela(viewAuth);
    }
});

function verificarSeTemCardNaoAdquirido(jogosLiberadosUsuario) {
    return new Promise((resolve) => {
        database.ref('cards_disponiveis').once('value', snapshot => {
            const cardsGlobais = snapshot.val();
            if (!cardsGlobais) {
                resolve(false);
                return;
            }
            const idsGlobais = Object.keys(cardsGlobais);
            const temNovidade = idsGlobais.some(id => !jogosLiberadosUsuario[id]);
            resolve(temNovidade);
        });
    });
}

function deslogar() { auth.signOut().then(() => location.reload()); }

function executarCopiaGamerBlindada(textoParaCopiar, elementoBotao) {
    const textoOriginal = elementoBotao.innerText;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textoParaCopiar).then(() => {
            elementoBotao.innerText = "✅ Copiado";
            setTimeout(() => { elementoBotao.innerText = textoOriginal; }, 2000);
        }).catch(err => {
            executarMetodoCopiaAntigo(textoParaCopiar, elementoBotao, textoOriginal);
        });
    } else {
        executarMetopiaAntigo(textoParaCopiar, elementoBotao, textoOriginal);
    }
}

function executarMetodoCopiaAntigo(texto, botao, textoOrig) {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed"; textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand("copy"); botao.innerText = "✅ Copiado"; } catch (err) {}
    document.body.removeChild(textarea);
    setTimeout(() => { botao.innerText = textoOrig; }, 2000);
}

function configurarCopiaPixPainel() {
    const btnCopiarPix = document.getElementById('btn-copiar-pix-painel');
    if (btnCopiarPix) {
        btnCopiarPix.onclick = () => {
            const chaveTexto = document.getElementById('valor-chave-pix').innerText;
            executarCopiaGamerBlindada(chaveTexto, btnCopiarPix);
        };
    }
}

// ==========================================================================
// AUTENTICAÇÃO: CADASTRO, LOGIN E RECUPERAÇÃO DE SENHA
// ==========================================================================
document.getElementById('form-cadastro-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cad-nome').value.trim();
    const sobrenome = document.getElementById('cad-sobrenome').value.trim();
    const whatsapp = inputWhatsApp.value.replace(/\D/g, "");
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;

    if (!validarProvedorEmail(email)) {
        alert("⚠️ Inscrição Recusada! Utilize um e-mail legítimo/convencional para garantir suporte.");
        return;
    }
    try {
        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await database.ref('usuarios/' + credencial.user.uid).set({
            nome: nome, sobrenome: sobrenome, whatsapp: whatsapp, email: email,
            status_cadastro: "pendente_pagamento", comprovante_base64: "", jogos_liberados: {}
        });
    } catch (error) { alert("Erro ao cadastrar: " + error.message); }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const btnLogar = document.getElementById('btn-logar');
    btnLogar.innerText = "LOGANDO... AGUARDE"; btnLogar.disabled = true;
    try { 
        await auth.signInWithEmailAndPassword(email, senha); 
    } catch (error) { 
        alert("Dados incorretos: " + error.message); 
        btnLogar.innerText = "LOGAR NO HUB"; btnLogar.disabled = false;
    }
});

document.getElementById('btn-esqueci-senha').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    if (!email) { alert("⚠️ Digite o seu e-mail no campo acima."); return; }
    try {
        await auth.sendPasswordResetEmail(email);
        alert(`🚀 Link de redefinição enviado com sucesso para: ${email}`);
    } catch (error) { alert("Erro: " + error.message); }
});

// Envio de Comprovante
document.getElementById('btn-abrir-formulario').addEventListener('click', () => modalFormEnvio.classList.add('active'));
document.getElementById('btn-fechar-form').addEventListener('click', () => modalFormEnvio.classList.remove('active'));

const inputComprovante = document.getElementById('comprovante');
const dropZone = document.getElementById('drop-zone');
const fileInfo = document.getElementById('file-info');
dropZone.addEventListener('click', () => inputComprovante.click());
inputComprovante.addEventListener('change', (e) => verificarArquivo(e.target.files[0]));

function verificarArquivo(file) {
    if (!file) return;
    if (file.size > 1048576) { alert("Arquivo maior que 1MB."); inputComprovante.value = ""; return; }
    fileInfo.innerHTML = `✅ Selecionado: <strong>${file.name}</strong>`;
}

const converterBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); reader.onerror = (err) => reject(err);
    });
};

document.getElementById('form-comprovante').addEventListener('submit', async (e) => {
    e.preventDefault();
    const arquivo = inputComprovante.files[0];
    if (!arquivo) return alert("Anexe o arquivo!");
    const btn = document.getElementById('btn-enviar-tudo');
    btn.innerText = "ENVIANDO..."; btn.disabled = true;
    try {
        const base64Str = await converterBase64(arquivo);
        let base64Final = arquivo.type === "application/pdf" ? base64Str : base64Str.slice(0, 49000);
        await database.ref(`usuarios/${usuarioLogadoUid}/comprovante_base64`).set(base64Final);
        await database.ref(`usuarios/${usuarioLogadoUid}/status_cadastro`).set("comprovante_enviado");
        alert("🚀 Comprovante enviado com sucesso! Aguarde a liberação do administrador.");
        modalFormEnvio.classList.remove('active');
    } catch (error) { alert("Erro: " + error.message); }
    finally { btn.innerText = "CONCLUIR INSCRIÇÃO"; btn.disabled = false; }
});

// Renderização Cliente
function ouvirCardsDoCliente(uid) {
    database.ref(`usuarios/${uid}/jogos_liberados`).on('value', snapshot => {
        gridCardsCliente.innerHTML = "";
        const liberados = snapshot.val() || {};
        Object.keys(liberados).forEach(cardId => {
            database.ref(`cards_disponiveis/${cardId}`).once('value', cardSnap => {
                const card = cardSnap.val();
                if (card) {
                    const cardElement = document.createElement('div');
                    cardElement.className = 'game-card';
                    cardElement.innerHTML = `<img src="${card.capa_url}"><h4>${card.titulo}</h4>`;
                    cardElement.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
                    cardElement.addEventListener('click', () => abrirModalJogo(card));
                    gridCardsCliente.appendChild(cardElement);
                }
            });
        });
    });
}

function abrirModalJogo(card) {
    const imgCapa = document.getElementById('modal-jogo-capa');
    imgCapa.src = card.capa_url;
    document.getElementById('modal-jogo-titulo').innerText = card.titulo;
    document.getElementById('modal-jogo-descricao').innerText = card.descricao;
    imgCapa.addEventListener('dragstart', (e) => e.preventDefault());

    const containerSenha = document.getElementById('container-senha-protegida-modal');
    const btnRevelarSenha = document.getElementById('btn-revelar-senha-modal');
    const areaTextoSenha = document.getElementById('area-texto-senha-secreta');
    const textoSenhaReal = document.getElementById('texto-senha-secreta-real');
    const btnCopiarSenha = document.getElementById('btn-copiar-senha-modal');

    btnRevelarSenha.style.display = "block";
    areaTextoSenha.style.display = "none";

    if (card.senha_patch && card.senha_patch.trim() !== "") {
        textoSenhaReal.innerText = card.senha_patch.trim();
        containerSenha.style.display = "block";
        btnRevelarSenha.onclick = () => { btnRevelarSenha.style.display = "none"; areaTextoSenha.style.display = "block"; };
        btnCopiarSenha.onclick = () => { executarCopiaGamerBlindada(textoSenhaReal.innerText, btnCopiarSenha); };
    } else {
        containerSenha.style.display = "none";
    }

    const container = document.getElementById('modal-jogo-botoes');
    container.innerHTML = "";
    if (card.botoes) {
        card.botoes.forEach(btn => {
            const buttonElement = document.createElement('button');
            buttonElement.className = 'btn-download-dinamico';
            buttonElement.innerText = btn.texto;
            buttonElement.style.width = "100%";
            buttonElement.style.cursor = "pointer";
            buttonElement.addEventListener('dragstart', (e) => e.preventDefault());
            buttonElement.addEventListener('click', () => { window.open(btn.url, '_blank'); });
            container.appendChild(buttonElement);
        });
    }
    modalDetalhesJogo.classList.add('active');
}
function fecharModalJogo() { modalDetalhesJogo.classList.remove('active'); }

modalDetalhesJogo.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
window.addEventListener('keydown', (e) => {
    if (modalDetalhesJogo.classList.contains('active')) {
        if (e.key === "F12" || (e.ctrlKey && (e.shiftKey && e.key === "I" || e.key === "u" || e.key === "U"))) {
            e.preventDefault(); return false;
        }
    }
});

// ==========================================================================
// CONSTRUTOR DINÂMICO DO MENU HORIZONTAL (CLIENTE)
// ==========================================================================
function ouvirEConstruirMenuCliente() {
    const menuContainer = document.getElementById('area-menu-dinamico');
    const linksList = document.getElementById('container-links-menu');
    database.ref('configuracao_menu_json').on('value', snapshot => {
        linksList.innerHTML = ""; const jsonString = snapshot.val() || "";
        if (!jsonString.trim()) { menuContainer.style.display = "none"; return; }
        try {
            const categorias = JSON.parse(jsonString);
            if (Array.isArray(categorias) && categorias.length > 0) {
                categorias.forEach(item => {
                    const liCat = document.createElement('li'); liCat.className = 'nav-dinamica-item';
                    const aCat = document.createElement('a'); aCat.className = 'nav-dinamica-link'; aCat.innerText = item.categoria;
                    if (item.tipo === "link" && item.url_categoria) { aCat.href = item.url_categoria; aCat.target = "_blank"; }
                    liCat.appendChild(aCat);
                    if (item.tipo !== "link" && item.subcategorias && Array.isArray(item.subcategorias) && item.subcategorias.length > 0) {
                        const ulSub = document.createElement('ul'); ulSub.className = 'submenu-dinamico';
                        item.subcategorias.forEach(sub => {
                            const liSub = document.createElement('li'); const aSub = document.createElement('a');
                            aSub.innerText = sub.texto; aSub.href = sub.url; aSub.target = "_blank";
                            liSub.appendChild(aSub); ulSub.appendChild(liSub);
                        });
                        liCat.appendChild(ulSub);
                    }
                    linksList.appendChild(liCat);
                });
                menuContainer.style.display = "block";
            } else { menuContainer.style.display = "none"; }
        } catch (e) { menuContainer.style.display = "none"; }
    });
}

function inicializarBotaoWhatsApp() {
    const whatsappNumero = "5500000000000"; 
    document.getElementById('btn-whatsapp-flutuante').href = `https://api.whatsapp.com/send?phone=${whatsappNumero}&text=Ol%C3%A1,%20preciso%20de%20ajuda%20no%20Hub!`;
}

// ==========================================================================
// CONSTRUTOR VISUAL DE MENU
// ==========================================================================
function ouvirEPovoarMenuVisualAdmin() {
    const containerVisual = document.getElementById('construtor-menu-visual-container');
    database.ref('configuracao_menu_json').once('value', snapshot => {
        containerVisual.innerHTML = ""; const rawJson = snapshot.val() || "";
        if (!rawJson.trim()) return;
        try {
            const categoriasData = JSON.parse(rawJson);
            if (Array.isArray(categoriasData)) {
                categoriasData.forEach(cat => {
                    adicionarBlocoCategoriaVisual(cat.categoria, cat.subcategorias, cat.tipo || "menu", cat.url_categoria || "");
                });
            }
        } catch (e) {}
    });
}

function adicionarBlocoCategoriaVisual(nomeCategoria = "", subcategoriasArr = [], tipoCategoria = "menu", urlCategoria = "") {
    const containerVisual = document.getElementById('construtor-menu-visual-container');
    const blocoId = 'cat-' + Date.now() + Math.floor(Math.random() * 100);
    const divBloco = document.createElement('div'); divBloco.className = 'bloco-categoria-visual'; divBloco.id = blocoId;
    divBloco.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 5px; align-items:center;">
            <input type="text" class="input-nome-categoria" placeholder="Título da Categoria" value="${nomeCategoria}" style="margin-bottom:0; font-weight:bold; border-color:#ffaa00;">
            <button type="button" onclick="removerBlocoCategoriaVisual('${blocoId}')" class="btn-sair" style="margin-top:0; padding:6px 12px; height:38px;">Deletar</button>
        </div>
        <div class="radio-tipo-container">
            <label><input type="radio" name="tipo-${blocoId}" value="menu" ${tipoCategoria === "menu" ? "checked" : ""} onclick="alternarTipoCategoriaVisual('${blocoId}')"> 📁 Menu Retrátil</label>
            <label><input type="radio" name="tipo-${blocoId}" value="link" ${tipoCategoria === "link" ? "checked" : ""} onclick="alternarTipoCategoriaVisual('${blocoId}')"> 🔗 Link Direto</label>
        </div>
        <div class="container-url-categoria-direta" style="display: ${tipoCategoria === "link" ? "block" : "none"}; margin-bottom: 10px;">
            <input type="url" class="input-url-categoria" placeholder="URL de Destino" value="${urlCategoria}" style="margin-bottom:0; border-color:#00ff66;">
        </div>
        <div class="wrapper-subcategorias-area" style="display: ${tipoCategoria === "menu" ? "block" : "none"};">
            <div class="container-subcategorias-rows" style="padding-left: 15px; border-left: 2px dashed #242f41;"></div>
            <button type="button" onclick="adicionarLinhaSubcategoriaVisual('${blocoId}')" class="btn-link" style="color:#00ff66; margin-top: 5px; font-size: 0.8rem; text-align: left; display:block;">+ Adicionar Link</button>
        </div>
    `;
    containerVisual.appendChild(divBloco);
    if (subcategoriasArr && subcategoriasArr.length > 0) {
        subcategoriasArr.forEach(sub => { adicionarLinhaSubcategoriaVisual(blocoId, sub.texto, sub.url); });
    }
}

function alternarTipoCategoriaVisual(blocoId) {
    const bloco = document.getElementById(blocoId);
    const tipo = bloco.querySelector(`input[name="tipo-${blocoId}"]:checked`).value;
    const areaSub = bloco.querySelector('.wrapper-subcategorias-area');
    const areaUrlDireta = bloco.querySelector('.container-url-categoria-direta');
    if (tipo === 'link') { areaSub.style.display = 'none'; areaUrlDireta.style.display = 'block'; }
    else { areaSub.style.display = 'block'; areaUrlDireta.style.display = 'none'; }
}

function adicionarLinhaSubcategoriaVisual(blocoId, txtLink = "", urlLink = "") {
    const bloco = document.getElementById(blocoId);
    const containerRows = bloco.querySelector('.container-subcategorias-rows');
    const rowId = 'row-' + Date.now() + Math.floor(Math.random() * 100);
    const divRow = document.createElement('div'); divRow.className = 'linha-subcategoria-visual'; divRow.id = rowId;
    divRow.innerHTML = `
        <input type="text" class="sub-txt" placeholder="Texto" value="${txtLink}" style="flex: 1;">
        <input type="url" class="sub-url" placeholder="URL" value="${urlLink}" style="flex: 1.5;">
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="btn-sair" style="background:#421414; color:#ff3333; margin-top:0; border:1px solid #ff3333; height:38px; padding:0 10px;">Excluir</button>
    `;
    containerRows.appendChild(divRow);
}

function removerBlocoCategoriaVisual(blocoId) {
    if (confirm("⚠️ Deseja deletar toda essa categoria?")) { document.getElementById(blocoId).remove(); }
}

document.getElementById('btn-salvar-visual-menu').addEventListener('click', async () => {
    const blocos = document.querySelectorAll('.bloco-categoria-visual');
    const estruturaMenuFinal = []; let dadosValidos = true;
    blocos.forEach(bloco => {
        const nomeCat = bloco.querySelector('.input-nome-categoria').value.trim(); if (!nomeCat) return;
        const tipoSelecionado = bloco.querySelector(`input[name="tipo-${bloco.id}"]:checked`).value;
        const urlCategoriaDireta = bloco.querySelector('.input-url-categoria').value.trim();
        const subcategorias = [];
        if (tipoSelecionado === "link") { if (!urlCategoriaDireta) dadosValidos = false; }
        else {
            const linesSub = bloco.querySelectorAll('.linha-subcategoria-visual');
            linesSub.forEach(linha => {
                const txt = linha.querySelector('.sub-txt').value.trim();
                const url = linha.querySelector('.sub-url').value.trim();
                if (txt && url) subcategorias.push({ texto: txt, url: url });
                else if (txt || url) dadosValidos = false;
            });
        }
        estruturaMenuFinal.push({ categoria: nomeCat, tipo: tipoSelecionado, url_categoria: tipoSelecionado === "link" ? urlCategoriaDireta : "", subcategorias: tipoSelecionado === "menu" ? subcategorias : [] });
    });
    if (!dadosValidos) { alert("⚠️ Existem campos incompletos no construtor."); return; }
    try {
        await database.ref('configuracao_menu_json').set(estruturaMenuFinal.length > 0 ? JSON.stringify(estruturaMenuFinal, null, 2) : "");
        alert("🚀 Menu Horizontal atualizado com sucesso!");
    } catch (e) { alert("Erro: " + e.message); }
});

// ==========================================================================
// CONTROLE DE CARDS DE JOGOS (ADMIN)
// ==========================================================================
document.getElementById('form-criar-card').addEventListener('submit', async (e) => {
    e.preventDefault(); const idEdicao = document.getElementById('card-id-edicao').value;
    const botoes = [];
    for (let i = 1; i <= 4; i++) {
        const txt = document.getElementById(`btn-txt-${i}`).value.trim();
        const url = document.getElementById(`btn-url-${i}`).value.trim();
        if (txt && url) botoes.push({ texto: txt, url: url });
    }
    const dadosCard = { titulo: document.getElementById('card-titulo').value.trim(), capa_url: document.getElementById('card-capa').value.trim(), descricao: document.getElementById('card-descricao').value.trim(), senha_patch: document.getElementById('card-senha-patch').value.trim(), botoes: botoes };
    try {
        if (idEdicao) { await database.ref(`cards_disponiveis/${idEdicao}`).set(dadosCard); alert("🔄 Card atualizado!"); cancelarEdicaoCard(); }
        else { await database.ref('cards_disponiveis').push(dadosCard); alert("🎯 Novo Card criado!"); document.getElementById('form-criar-card').reset(); }
    } catch (error) { alert("Erro: " + error.message); }
});

function ouvirCardsGlobaisAdmin() {
    database.ref('cards_disponiveis').on('value', snapshot => {
        listaCardsCriados.innerHTML = ""; const cards = snapshot.val();
        if (!cards) { listaCardsCriados.innerHTML = `<p style="color:#aaa; font-size:0.9rem;">Nenhum card.</p>`; return; }
        Object.keys(cards).forEach(id => {
            const div = document.createElement('div'); div.className = 'user-item'; div.style.borderLeft = "3px solid #ffaa00";
            div.innerHTML = `
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${cards[id].capa_url}" style="width:40px; height:50px; object-fit:cover; border-radius:4px;">
                    <div><p style="margin:0; font-weight:bold; color:#fff;">${cards[id].titulo}</p></div>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn-visualizar-comprovante" style="margin:0; background:#24334c; border-color:#00ff66; color:#00ff66;" onclick="carregarCardParaEdicao('${id}')">✏️ Editar</button>
                    <button class="btn-visualizar-comprovante" style="margin:0; background:#3d1c1c; border-color:#ff3333; color:#ff3333;" onclick="deletarCardDoSistema('${id}')">🗑️ Apagar</button>
                </div>
            `;
            listaCardsCriados.appendChild(div);
        });
    });
}

function carregarCardParaEdicao(id) {
    database.ref(`cards_disponiveis/${id}`).once('value', snapshot => {
        const card = snapshot.val(); if (!card) return;
        document.getElementById('card-id-edicao').value = id;
        document.getElementById('card-titulo').value = card.titulo;
        document.getElementById('card-capa').value = card.capa_url;
        document.getElementById('card-descricao').value = card.descricao;
        document.getElementById('card-senha-patch').value = card.senha_patch || "";
        for(let i=1; i<=4; i++) { document.getElementById(`btn-txt-${i}`).value = ""; document.getElementById(`btn-url-${i}`).value = ""; }
        if (card.botoes) { card.botoes.forEach((btn, index) => { document.getElementById(`btn-txt-${index+1}`).value = btn.texto; document.getElementById(`btn-url-${index+1}`).value = btn.url; }); }
        document.getElementById('titulo-form-card').innerText = "✏️ Editando Card";
        document.getElementById('btn-cancelar-edicao').style.display = "block";
        document.getElementById('btn-salvar-card').innerText = "ATUALIZAR CARD";
    });
}

function cancelarEdicaoCard() {
    document.getElementById('card-id-edicao').value = ""; document.getElementById('form-criar-card').reset();
    document.getElementById('titulo-form-card').innerText = "1. Criar Novo Card de Jogo";
    document.getElementById('btn-cancelar-edicao').style.display = "none"; document.getElementById('btn-salvar-card').innerText = "SALVAR CARD";
}
document.getElementById('btn-cancelar-edicao').addEventListener('click', cancelarEdicaoCard);

async function deletarCardDoSistema(id) {
    if (confirm("⚠️ Deseja apagar este card?")) { await database.ref(`cards_disponiveis/${id}`).remove(); alert("Card excluído."); }
}

document.getElementById('btn-exportar-cards').addEventListener('click', () => {
    database.ref('cards_disponiveis').once('value', snapshot => {
        const data = snapshot.val(); if(!data) return alert("Vazio.");
        const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-cards.json'; a.click();
    });
});

// ==========================================================================
// PAINEL ADMINISTRATIVO: MOTOR DO SISTEMA QUALIFICADO DE 3 ABAS HISTÓRICAS
// ==========================================================================
function inicializarPainelAdmin() {
    database.ref('usuarios').on('value', snapshot => {
        listaUsuariosAdmin.innerHTML = ""; const users = snapshot.val();
        if (!users) { listaUsuariosAdmin.innerHTML = `<p style="color:#aaa; padding:15px;">Nenhum usuário.</p>`; return; }

        let contagemFiltrados = 0;

        Object.keys(users).forEach(uid => {
            if (users[uid].email === "admin@admin.com") return;

            const status = users[uid].status_cadastro || 'pendente_pagamento';

            // FILTRAGEM REVOLUCIONÁRIA DAS 3 ABAS INDEPENDENTES
            if (filtroAdminAtual === "pendentes" && status === "pago") return;
            if (filtroAdminAtual === "pendentes" && status === "cliente_cadastrado") return;
            
            if (filtroAdminAtual === "concluidos" && status !== "pago") return;
            
            if (filtroAdminAtual === "cadastrados" && status !== "cliente_cadastrado") return;

            contagemFiltrados++;
            const userBox = document.createElement('div'); userBox.className = 'user-item';

            let listaJogosAtivosHtml = "";
            const jogos = users[uid].jogos_liberados || {};
            const keysJogos = Object.keys(jogos);
            if (keysJogos.length === 0) { listaJogosAtivosHtml = "<li style='color:#ff3333;'>Nenhum card ativo</li>"; }
            else {
                keysJogos.forEach(gameId => {
                    listaJogosAtivosHtml += `<li style="display:flex; justify-content:space-between; align-items:center; background:#141d26; padding:5px; margin:3px 0; border-radius:4px; font-size:0.8rem;"><span>🎮 ID: ${gameId.slice(-6)}...</span><button onclick="removerAcessoJogo('${uid}', '${gameId}')" style="background:none; border:none; color:#ff3333; cursor:pointer;">[Remover]</button></li>`;
                });
            }

            if (filtroAdminAtual === "pendentes") {
                const temComp = users[uid].comprovante_base64 && users[uid].comprovante_base64.length > 10;
                const btnComp = temComp 
                    ? `<button class="btn-visualizar-comprovante" onclick="abrirComprovanteNovaAba('${uid}')">👁️ Ver Comprovante Enviado</button>`
                    : `<p style="color:#ffaa00; font-size:0.8rem; margin:5px 0;">⏳ Aguardando comprovante PIX...</p>`;

                userBox.innerHTML = `
                    <div class="user-info">
                        <p><strong>Jogador:</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                        <p><strong>E-mail:</strong> ${users[uid].email}</p>
                        <p><strong>WhatsApp:</strong> ${users[uid].whatsapp || 'Não cadastrado'}</p>
                        <p><strong>Status Antigo:</strong> <span style="color:#ffaa00">${status.toUpperCase()}</span></p>
                        ${btnComp}
                    </div>
                    <select id="select-game-${uid}" style="margin-bottom:10px;"><option value="">-- Selecione o Novo Card para Injetar --</option></select>
                    <button class="btn-inject" onclick="injetarCardParaUsuario('${uid}')">Confirmar Pagamento & Mover para Aprovados</button>
                    <button class="btn-sair" onclick="deletarUsuarioDoBancoTotal('${uid}', '${users[uid].email}')" style="width:100%; font-size:0.8rem; padding:6px; margin-top:5px; background:#211212; border:1px dashed #ff3333; color:#ff5555;">🗑️ Excluir Conta permanentemente</button>
                `;
            } else if (filtroAdminAtual === "concluidos") {
                userBox.innerHTML = `
                    <div class="user-info">
                        <p><strong>🏆 Jogador Ativo (Temporada):</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                        <p><strong>WhatsApp:</strong> ${users[uid].whatsapp || 'Não cadastrado'}</p>
                        <p><strong>E-mail:</strong> ${users[uid].email}</p>
                        <div style="margin: 10px 0; background:#1b2430; padding:8px; border-radius:4px;">
                            <p style="margin:0 0 5px 0; font-size:0.8rem; color:#00ff66;">Cards Ativos na Conta:</p>
                            <ul style="margin:0; padding:0; list-style:none;">${listaJogosAtivosHtml}</ul>
                        </div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <select id="select-game-${uid}" style="margin:0; flex:1; height:35px;"><option value="">+ Injetar Card Extra</option></select>
                        <button class="btn-gamer" onclick="injetarCardParaUsuario('${uid}')" style="margin:0; height:35px; width:auto; padding:0 10px;">+</button>
                    </div>
                    <button class="btn-sair" onclick="excluirSolicitacaoEComprovante('${uid}')" style="width:100%; font-size:0.8rem; padding:6px; margin-top:10px; background:#2d1313; border:1px solid #ff3333; color:#ff3333;">📦 Mover Manualmente para Cadastrados (Recuar)</button>
                `;
            } else {
                // VISÃO EXCLUSIVA DA ABA DE CLIENTES CADASTRADOS HISTÓRICOS
                userBox.innerHTML = `
                    <div class="user-info">
                        <p><strong>👥 Cliente da Base Comercial:</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                        <p><strong>WhatsApp:</strong> ${users[uid].whatsapp || 'Não cadastrado'}</p>
                        <p><strong>E-mail:</strong> ${users[uid].email}</p>
                        <div style="margin: 10px 0; background:#161c26; border:1px solid #242f41; padding:8px; border-radius:4px;">
                            <p style="margin:0 0 5px 0; font-size:0.8rem; color:#8899a6;">Patrimônio de Jogos do Cliente:</p>
                            <ul style="margin:0; padding:0; list-style:none;">${listaJogosAtivosHtml}</ul>
                        </div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <select id="select-game-${uid}" style="margin:0; flex:1; height:35px;"><option value="">Injetar Novo Patch Direto</option></select>
                        <button class="btn-gamer" onclick="injetarCardParaUsuario('${uid}')" style="margin:0; height:35px; width:auto; padding:0 10px;">+</button>
                    </div>
                `;
            }

            listaUsuariosAdmin.appendChild(userBox);
            alimentarSelectComCards(document.getElementById(`select-game-${uid}`), users[uid].jogos_liberados);
        });

        if (contagemFiltrados === 0) {
            listaUsuariosAdmin.innerHTML = `<p style="color:#aaa; padding:15px; text-align:center;">Nenhum jogador nesta aba.</p>`;
        }
    });
}

function abrirComprovanteNovaAba(uid) {
    database.ref(`usuarios/${uid}/comprovante_base64`).once('value', snapshot => {
        const base64Data = snapshot.val();
        if (base64Data) {
            const novaAba = window.open();
            if (base64Data.startsWith("data:application/pdf")) { novaAba.document.write(`<iframe src="${base64Data}" width="100%" height="100%" style="border:none;"></iframe>`); }
            else { novaAba.document.write(`<body style="background:#0b0e14; margin:0; display:flex; align-items:center; justify-content:center;"><img src="${base64Data}" style="max-width:100%; max-height:100vh; border:2px solid #00ff66; border-radius:8px;"></body>`); }
        }
    });
}

function alimentarSelectComCards(selectElement, jogosJaLiberados = {}) {
    if (!selectElement) return;
    database.ref('cards_disponiveis').once('value', snapshot => {
        const cards = snapshot.val() || {};
        Object.keys(cards).forEach(cardId => {
            const opt = document.createElement('option'); opt.value = cardId;
            opt.innerText = cards[cardId].titulo + (jogosJaLiberados[cardId] ? " (Ativo)" : "");
            selectElement.appendChild(opt);
        });
    });
}

async function injetarCardParaUsuario(uid) {
    const selectedCardId = document.getElementById(`select-game-${uid}`).value;
    try {
        await database.ref(`usuarios/${uid}/status_cadastro`).set("pago");
        if (selectedCardId) {
            await database.ref(`usuarios/${uid}/jogos_liberados/${selectedCardId}`).set(true);
            alert("🔥 Sucesso! Jogador movido para Aprovados com o novo card injetado!");
        } else {
            alert("Status atualizado para PAGO!");
        }
    } catch (error) { alert("Erro: " + error.message); }
}

async function removerAcessoJogo(uid, gameId) {
    if (confirm("Deseja remover o acesso deste card da conta do jogador?")) {
        await database.ref(`usuarios/${uid}/jogos_liberados/${gameId}`).remove();
        alert("Acesso removido!");
    }
}

// Recuo manual para clientes cadastrados
async function excluirSolicitacaoEComprovante(uid) {
    if (confirm("Deseja arquivar e mover este cliente para a aba de 'Clientes Cadastrados'?\n\nIsso limpará o comprovante atual permitindo que ele faça novas compras futuramente, mantendo o login e os jogos dele intactos.")) {
        try {
            await database.ref(`usuarios/${uid}/comprovante_base64`).set("");
            await database.ref(`usuarios/${uid}/status_cadastro`).set("cliente_cadastrado");
            alert("Mergulhado com sucesso na lista de cadastrados!");
        } catch (error) { alert("Erro: " + error.message); }
    }
}

async function deletarUsuarioDoBancoTotal(uid, email) {
    if (confirm(`🚨 ATENÇÃO:\n\nDeseja deletar DEFINITIVAMENTE os registros do banco?`)) {
        await database.ref(`usuarios/${uid}`).remove(); alert("Registro deletado.");
    }
}

// ==========================================================================
// NOVO: SISTEMA DE RESET EM LOTE PARA ARQUIVAMENTO HISTÓRICO DE TEMPORADA
// ==========================================================================
document.getElementById('btn-reset-geral-temporada').addEventListener('click', async () => {
    const conf1 = confirm("⚠️ ATENÇÃO - FIM DA PRÉ-VENDA:\n\nVocê vai fechar as vendas da temporada atual.\n\nTodos os jogadores Aprovados serão movidos com segurança para a aba 'Clientes Cadastrados'.\nO login deles continuará funcionando e eles NÃO perderão os jogos atuais, mas o Hub deles voltará a pedir o comprovante assim que você lançar um novo Card!\n\nDeseja continuar?");
    
    if (conf1) {
        try {
            const btnReset = document.getElementById('btn-reset-geral-temporada');
            btnReset.innerText = "ARQUIVANDO TEMPORADA..."; btnReset.disabled = true;

            const snapshot = await database.ref('usuarios').once('value');
            const usuarios = snapshot.val();

            if (usuarios) {
                const loteMudancas = {};
                Object.keys(usuarios).forEach(uid => {
                    // Move apenas quem está como 'pago' (aprovado na temporada), deixando os demais intactos
                    if (usuarios[uid].email !== "admin@admin.com" && usuarios[uid].status_cadastro === "pago") {
                        loteMudancas[`usuarios/${uid}/status_cadastro`] = "cliente_cadastrado";
                        loteMudancas[`usuarios/${uid}/comprovante_base64`] = ""; // Limpa a string pesada da imagem
                    }
                });
                
                await database.ref().update(loteMudancas);
                alert("🗂️ Temporada encerrada e arquivada com sucesso!\n\nSeu painel de Aprovados está zerado e pronto para a próxima pré-venda. Todos os clientes antigos estão guardados na aba 'Cadastrados'!");
            } else {
                alert("Nenhum usuário encontrado.");
            }
        } catch (error) {
            alert("Erro no reset geral: " + error.message);
        } finally {
            const btnReset = document.getElementById('btn-reset-geral-temporada');
            btnReset.innerText = "📦 ARQUIVAR APROVADOS DA TEMPORADA"; btnReset.disabled = false;
        }
    }
});

// Trava contra clique direito em elementos sensíveis
document.addEventListener('contextmenu', (e) => {
    if (document.getElementById('view-cliente').classList.contains('active')) {
        const target = e.target.closest('.game-card, .modal-content, img, #container-senha-protegida-modal');
        if (target) { e.preventDefault(); return false; }
    }
});
