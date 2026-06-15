// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE (COMPLETA E RESTAURADA)
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

// Inicializa o Firebase se não estiver inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// Variáveis Globais de Controle de Fluxo Geral
let todosOsCards = {};
let usuarioLogadoUid = null;
let informacoesUsuarioLogado = {};
let solicitacoesGeraisDoBanco = {};
let abaSolicitacoesAtivaAdmin = "pendentes";

// Estrutura em Memória para Construtor Visual do Menu Horizontal
let estruturaLayoutMenuVisual = [];

// Inicialização e Vinculação de Eventos Globais do Sistema
document.addEventListener("DOMContentLoaded", () => {
    configurarAbasAutenticacao();
    configurarFormulariosAutenticacao();
    configurarPerfilCliente();
    configurarUploadComprovante();
    configurarAbasPainelAdmin();
    configurarFormularioCadastroCards();

    // Eventos do Modal de Detalhes
    const btnRevelarSenha = document.getElementById("btn-revelar-senha-modal");
    if(btnRevelarSenha) {
        btnRevelarSenha.addEventListener("click", () => {
            btnRevelarSenha.style.display = "none";
            document.getElementById("area-texto-senha-secreta").style.display = "block";
        });
    }

    // Botões auxiliares do painel Admin
    const btnCancel = document.getElementById("btn-cancelar-edicao");
    if(btnCancel) {
        btnCancel.addEventListener("click", () => limparFormularioCardAdmin());
    }
    const btnExport = document.getElementById("btn-exportar-cards");
    if(btnExport) {
        btnExport.addEventListener("click", () => exportarCardsParaJSON());
    }
    const btnSaveMenu = document.getElementById("btn-salvar-visual-menu");
    if(btnSaveMenu) {
        btnSaveMenu.addEventListener("click", () => salvarLayoutMenuNoFirebase());
    }
    const btnResetTemporada = document.getElementById("btn-reset-geral-temporada");
    if(btnResetTemporada) {
        btnResetTemporada.addEventListener("click", () => executarResetGeralTemporadaPreVenda());
    }

    // Ouvinte em tempo real de Mudança do Estado da Autenticação do Usuário
    auth.onAuthStateChanged(user => {
        if (user) {
            usuarioLogadoUid = user.uid;
            escutarDadosDoUsuario();
        } else {
            usuarioLogadoUid = null;
            informacoesUsuarioLogado = {};
            alternarTelasVisiveis("view-auth");
        }
    });

    // RETORNOU: Escuta ativa de Cards Cadastrados no caminho correto "cards_disponiveis"
    db.ref("cards_disponiveis").on("value", snapshot => {
        todosOsCards = snapshot.val() || {};
        processarEPresentarDados();
        if (usuarioLogadoUid && informacoesUsuarioLogado.regra === "admin") {
            renderizarPainelControleAdmin();
        }
    });

    // Escuta ativa de Pedidos/Inscrições Gerais para Sincronização Instantânea
    db.ref("solicitacoes_comprovantes").on("value", snapshot => {
        solicitacoesGeraisDoBanco = snapshot.val() || {};
        processarEPresentarDados();
        if (usuarioLogadoUid && informacoesUsuarioLogado.regra === "admin") {
            renderizarPainelControleAdmin();
        }
    });

    // Escuta ativa do Layout do Menu Horizontal Suspenso
    db.ref("configuracao_menu_horizontal").on("value", snapshot => {
        const dadosMenu = snapshot.val() || [];
        estruturaLayoutMenuVisual = dadosMenu;
        renderizarMenuHorizontalCliente(dadosMenu);
        if (usuarioLogadoUid && informacoesUsuarioLogado.regra === "admin") {
            renderizarConstrutorVisualMenuAdmin();
        }
    });
});

// Alternar entre Telas/Views principais do app
function alternarTelasVisiveis(idDaViewAlvo) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const viewAlvo = document.getElementById(idDaViewAlvo);
    if (viewAlvo) viewAlvo.classList.add("active");
}

// Configura Abas Login / Cadastro da Autenticação
function configurarAbasAutenticacao() {
    const btnLogin = document.getElementById("tab-login");
    const btnCadastro = document.getElementById("tab-cadastro");
    const formLogin = document.getElementById("form-login");
    const formCadastro = document.getElementById("form-cadastro-auth");

    if(btnLogin && btnCadastro) {
        btnLogin.addEventListener("click", () => {
            btnLogin.classList.add("active");
            btnCadastro.classList.remove("active");
            formLogin.classList.add("active");
            formCadastro.classList.remove("active");
        });
        btnCadastro.addEventListener("click", () => {
            btnCadastro.classList.add("active");
            btnLogin.classList.remove("active");
            formCadastro.classList.add("active");
            formLogin.classList.remove("active");
        });
    }
}

// Lógica de Autenticação Completa (Login, Cadastro e Sincronização do Shadow Password)
function configurarFormulariosAutenticacao() {
    const shadowPass = document.getElementById("login-shadow-pass");
    const realPass = document.getElementById("login-senha");

    if (shadowPass && realPass) {
        shadowPass.addEventListener("input", (e) => {
            realPass.value = e.target.value;
        });
    }

    // Formulário de Login
    document.getElementById("form-login").addEventListener("submit", e => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const senha = realPass.value;

        auth.signInWithEmailAndPassword(email, senha)
            .catch(err => alert("Erro ao efetuar login: " + err.message));
    });

    // Formulário de Cadastro
    document.getElementById("form-cadastro-auth").addEventListener("submit", e => {
        e.preventDefault();
        const nome = document.getElementById("cad-nome").value.trim();
        const sobrenome = document.getElementById("cad-sobrenome").value.trim();
        const whatsapp = document.getElementById("cad-whatsapp").value.trim();
        const email = document.getElementById("cad-email").value.trim();
        const senha = document.getElementById("cad-senha").value;

        auth.createUserWithEmailAndPassword(email, senha)
            .then(cred => {
                return db.ref("usuarios/" + cred.user.uid).set({
                    uid: cred.user.uid,
                    nome: nome,
                    sobrenome: sobrenome,
                    whatsapp: whatsapp,
                    email: email,
                    regra: "cliente",
                    status: "ativo"
                });
            })
            .catch(err => alert("Erro ao realizar cadastro: " + err.message));
    });

    // Botão Esqueci Minha Senha
    const btnEsqueci = document.getElementById("btn-esqueci-senha");
    if(btnEsqueci) {
        btnEsqueci.addEventListener("click", () => {
            const email = document.getElementById("login-email").value.trim();
            if(!email) {
                alert("Por favor, digite o seu e-mail no campo correspondente para podermos enviar o link de redefinição.");
                return;
            }
            auth.sendPasswordResetEmail(email)
                .then(() => alert("Um e-mail de redefinição de senha foi enviado para: " + email + ". Verifique sua caixa de entrada ou spam."))
                .catch(err => alert("Erro ao processar solicitação: " + err.message));
        });
    }
}

// Escuta ativa de dados cadastrais da conta logada no banco
function escutarDadosDoUsuario() {
    db.ref("usuarios/" + usuarioLogadoUid).on("value", snapshot => {
        informacoesUsuarioLogado = snapshot.val() || {};
        
        if (informacoesUsuarioLogado.status === "excluido") {
            alternarTelasVisiveis("view-cliente-bloqueado");
            return;
        }

        const nomeDisplay = document.getElementById("user-display-name");
        if(nomeDisplay) nomeDisplay.innerText = `${informacoesUsuarioLogado.nome || ""} ${informacoesUsuarioLogado.sobrenome || ""}`;

        // Redireciona o usuário para a View correspondente ao seu nível de acesso
        if (informacoesUsuarioLogado.regra === "admin") {
            alternarTelasVisiveis("view-admin");
            renderizarPainelControleAdmin();
        } else {
            alternarTelasVisiveis("view-cliente");
            processarEPresentarDados();
        }
    });
}

// Processa cruzamento de dados de liberação de patchs do cliente logado
function processarEPresentarDados() {
    if (!usuarioLogadoUid || informacoesUsuarioLogado.regra === "admin") return;

    let jogosAdquiridosIds = [];
    let jogosEmAnaliseIds = [];

    Object.keys(solicitacoesGeraisDoBanco).forEach(key => {
        const sol = solicitacoesGeraisDoBanco[key];
        if (sol.usuarioUid === usuarioLogadoUid) {
            if (sol.statusSolicitacao === "aprovado") {
                jogosAdquiridosIds.push(sol.cardId);
            } else if (sol.statusSolicitacao === "pendente") {
                jogosEmAnaliseIds.push(sol.cardId);
            }
        }
    });

    atualizarPainelCliente(jogosAdquiridosIds, jogosEmAnaliseIds);
}

// RENDERIZAÇÃO ESTÁVEL DA INTERFACE DO CLIENTE
function atualizarPainelCliente(jogosAdquiridosIds, jogosEmAnaliseIds) {
    const gridLiberados = document.getElementById("grid-cards-cliente");
    const gridVitrine = document.getElementById("grid-vitrine-vendas");
    const areaCompraPendente = document.getElementById("area-compra-pendente");

    if (!gridLiberados || !gridVitrine) return;

    gridLiberados.innerHTML = "";
    gridVitrine.innerHTML = "";

    let contemPatchesParaComprar = false;

    Object.keys(todosOsCards).forEach(id => {
        const card = todosOsCards[id];

        if (jogosAdquiridosIds.includes(id)) {
            const divGamer = document.createElement("div");
            divGamer.className = "game-card";
            divGamer.onclick = () => abrirModalDetalhesJogo(id, true);
            divGamer.innerHTML = `
                <img src="${card.capa_url || card.capa}" alt="${card.titulo}">
                <h4>${card.titulo}</h4>
            `;
            gridLiberados.appendChild(divGamer);
        } else {
            contemPatchesParaComprar = true;
            
            const divVitrine = document.createElement("div");
            divVitrine.className = "game-card";
            divVitrine.onclick = () => abrirModalDetalhesJogo(id, false);
            divVitrine.innerHTML = `
                <div style="position:absolute; top:10px; right:10px; background:#00ff66; color:#000; font-weight:bold; padding:4px 8px; font-size:0.75rem; border-radius:4px; z-index:2;">${card.preco || "R$ 10,00"}</div>
                <img src="${card.capa_url || card.capa}" alt="${card.titulo}">
                <h4>${card.titulo}</h4>
            `;
            gridVitrine.appendChild(divVitrine);
        }
    });

    areaCompraPendente.style.display = contemPatchesParaComprar ? "block" : "none";
}

// Janela Modal Dinâmica de Detalhes do Jogo Selecionado
function abrirModalDetalhesJogo(cardId, jaAdquirido) {
    const card = todosOsCards[cardId];
    if (!card) return;

    document.getElementById("modal-jogo-titulo").innerText = card.titulo;
    document.getElementById("modal-jogo-capa").src = card.capa_url || card.capa;
    document.getElementById("modal-jogo-descricao").innerText = card.descricao;

    const containerSenha = document.getElementById("container-senha-protegida-modal");
    const areaBotoes = document.getElementById("modal-jogo-botoes");
    const btnAdquirir = document.getElementById("btn-adquirir-patch-vitrine");
    const blocoPixPreview = document.getElementById("bloco-pix-dinamico-preview");

    areaBotoes.innerHTML = "";
    document.getElementById("area-texto-senha-secreta").style.display = "none";
    document.getElementById("btn-revelar-senha-modal").style.display = "block";

    if (jaAdquirido) {
        btnAdquirir.style.display = "none";
        blocoPixPreview.style.display = "none";

        if (card.senha_patch || card.senhaPatch) {
            containerSenha.style.display = "block";
            document.getElementById("texto-senha-secreta-real").innerText = card.senha_patch || card.senhaPatch;
            document.getElementById("btn-copiar-senha-modal").onclick = () => {
                navigator.clipboard.writeText(card.senha_patch || card.senhaPatch);
                alert("Senha do patch copiada com sucesso!");
            };
        } else {
            containerSenha.style.display = "none";
        }

        for (let i = 1; i <= 4; i++) {
            const txt = card[`btnTxt${i}`] || card[`btn_txt_${i}`];
            const url = card[`btnUrl${i}`] || card[`btn_url_${i}`];
            if (txt && url) {
                const a = document.createElement("a");
                a.href = url;
                a.target = "_blank";
                a.className = "btn-download-dinamico";
                a.style.textAlign = "center";
                a.style.display = "block";
                a.innerText = txt;
                areaBotoes.appendChild(a);
            }
        }
    } else {
        containerSenha.style.display = "none";
        areaBotoes.innerHTML = "";
        btnAdquirir.style.display = "block";
        
        document.getElementById("texto-preco-botao-dinamico").innerText = card.preco || "R$ 10,00";

        if (card.pix) {
            blocoPixPreview.style.display = "block";
            document.getElementById("texto-pix-dinamico-preview-real").innerText = card.pix;
            document.getElementById("btn-copiar-pix-preview-dinamico").onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(card.pix);
                alert("Chave PIX do Patch copiada com sucesso!");
            };
        } else {
            blocoPixPreview.style.display = "none";
        }

        btnAdquirir.onclick = () => {
            fecharModalJogo();
            abrirCheckoutFormularioCompra(cardId);
        };
    }

    document.getElementById("modal-details-container-gamer").style.display = "block";
}

function fecharModalJogo() {
    document.getElementById("modal-details-container-gamer").style.display = "none";
}

// Checkout de Inscrição
function abrirCheckoutFormularioCompra(cardId) {
    const card = todosOsCards[cardId];
    if (!card) return;

    document.getElementById("id-card-escolhido-compra").value = cardId;
    document.getElementById("titulo-envio-comprovante-dinamico").innerText = `Confirmar Inscrição: ${card.titulo}`;
    document.getElementById("texto-preco-modal-checkout").innerText = card.preco || "R$ 10,00";
    document.getElementById("texto-chave-pix-checkout").innerText = card.pix || "88988470190";

    document.getElementById("modal-formulario-envio").classList.add("active");
}

function configurarUploadComprovante() {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("comprovante");
    const fileInfo = document.getElementById("file-info");
    const btnFechar = document.getElementById("btn-fechar-form");

    if (btnFechar) {
        btnFechar.addEventListener("click", () => {
            document.getElementById("modal-formulario-envio").classList.remove("active");
        });
    }

    if(dropZone && fileInput) {
        dropZone.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => {
            if (fileInput.files.length) fileInfo.innerText = fileInput.files[0].name;
        });
    }

    document.getElementById("form-comprovante").addEventListener("submit", e => {
        e.preventDefault();
        const cardId = document.getElementById("id-card-escolhido-compra").value;
        const arquivo = fileInput.files[0];

        if (!arquivo) {
            alert("Por favor, selecione ou arraste o arquivo do seu comprovante.");
            return;
        }

        const leitor = new FileReader();
        leitor.readAsDataURL(arquivo);
        leitor.onload = () => {
            const dadosBase64 = leitor.result;
            const novaSolicitacaoRef = db.ref("solicitacoes_comprovantes").push();

            novaSolicitacaoRef.set({
                solicitacaoId: novaSolicitacaoRef.key,
                cardId: cardId,
                usuarioUid: usuarioLogadoUid,
                nomeUsuario: `${informacoesUsuarioLogado.nome} ${informacoesUsuarioLogado.sobrenome}`,
                whatsappUsuario: informacoesUsuarioLogado.whatsapp || "Não Informado",
                comprovanteBase64: dadosBase64,
                statusSolicitacao: "pendente",
                dataEnvio: new Date().toLocaleString("pt-BR")
            }).then(() => {
                alert("Seu comprovante foi enviado com sucesso!");
                document.getElementById("modal-formulario-envio").classList.remove("active");
                document.getElementById("form-comprovante").reset();
                fileInfo.innerText = "Nenhum arquivo selecionado";
            });
        };
    });
}

// Perfil do Cliente
function configurarPerfilCliente() {
    const btnAbrir = document.getElementById("btn-abrir-perfil");
    const btnFechar = document.getElementById("btn-fechar-perfil");
    const modalPerfil = document.getElementById("modal-editar-perfil");

    if(btnAbrir && modalPerfil) {
        btnAbrir.addEventListener("click", () => {
            document.getElementById("perf-email").value = informacoesUsuarioLogado.email || "";
            document.getElementById("perf-nome").value = informacoesUsuarioLogado.nome || "";
            document.getElementById("perf-sobrenome").value = informacoesUsuarioLogado.sobrenome || "";
            document.getElementById("perf-whatsapp").value = informacoesUsuarioLogado.whatsapp || "";
            modalPerfil.classList.add("active");
        });
    }

    if(btnFechar) btnFechar.addEventListener("click", () => modalPerfil.classList.remove("active"));

    document.getElementById("form-editar-perfil-cliente").addEventListener("submit", e => {
        e.preventDefault();
        db.ref("usuarios/" + usuarioLogadoUid).update({
            nome: document.getElementById("perf-nome").value.trim(),
            sobrenome: document.getElementById("perf-sobrenome").value.trim(),
            whatsapp: document.getElementById("perf-whatsapp").value.trim()
        }).then(() => {
            alert("Perfil modificado com sucesso!");
            modalPerfil.classList.remove("active");
        });
    });

    const btnExcluir = document.getElementById("btn-solicitar-exclusao-conta");
    if(btnExcluir) {
        btnExcluir.addEventListener("click", () => {
            if(confirm("Deseja realmente solicitar a exclusão de todos os seus dados?")) {
                db.ref("usuarios/" + usuarioLogadoUid).update({ status: "excluido" })
                    .then(() => {
                        alert("Sua conta foi colocada em exclusão.");
                        modalPerfil.classList.remove("active");
                    });
            }
        });
    }
}

// Renderização do Menu Horizontal Suspenso
function renderizarMenuHorizontalCliente(listaMenu) {
    const containerUl = document.getElementById("container-links-menu");
    if (!containerUl) return;

    containerUl.innerHTML = "";

    if (!listaMenu || listaMenu.length === 0) {
        containerUl.innerHTML = `<li style="color:#667788; font-size:0.8rem; font-style:italic;">Nenhum link útil configurado no menu de navegação.</li>`;
        return;
    }

    listaMenu.forEach(cat => {
        if(cat.links && cat.links.length > 0) {
            const liTitulo = document.createElement("li");
            liTitulo.className = "nav-item-titulo";
            liTitulo.innerText = cat.categoria;
            containerUl.appendChild(liTitulo);

            cat.links.forEach(l => {
                const liLink = document.createElement("li");
                const a = document.createElement("a");
                a.href = l.url;
                a.target = "_blank";
                a.className = "nav-link-item";
                a.innerText = l.texto;
                liLink.appendChild(a);
                containerUl.appendChild(liLink);
            });
        }
    });
}

// ==========================================================================
// SEÇÃO DO PAINEL DE CONTROLE ADMINISTRATIVO (COMPLETA E RESTAURADA)
// ==========================================================================
function configurarAbasPainelAdmin() {
    const tabPend = document.getElementById("tab-solic-pendentes");
    const tabConcl = document.getElementById("tab-solic-concluidos");
    const tabCad = document.getElementById("tab-solic-cadastrados");

    if (tabPend && tabConcl && tabCad) {
        tabPend.addEventListener("click", () => {
            abaSolicitacoesAtivaAdmin = "pendentes";
            tabPend.className = "tab-btn active"; tabConcl.className = "tab-btn"; tabCad.className = "tab-btn";
            renderizarPainelControleAdmin();
        });
        tabConcl.addEventListener("click", () => {
            abaSolicitacoesAtivaAdmin = "concluidos";
            tabConcl.className = "tab-btn active"; tabPend.className = "tab-btn"; tabCad.className = "tab-btn";
            renderizarPainelControleAdmin();
        });
        tabCad.addEventListener("click", () => {
            abaSolicitacoesAtivaAdmin = "cadastrados";
            tabCad.className = "tab-btn active"; tabPend.className = "tab-btn"; tabConcl.className = "tab-btn";
            renderizarPainelControleAdmin();
        });
    }
}

function configurarFormularioCadastroCards() {
    document.getElementById("form-criar-card").addEventListener("submit", e => {
        e.preventDefault();
        const idEdicao = document.getElementById("card-id-edicao").value;
        const titulo = document.getElementById("card-titulo").value.trim();
        const capa = document.getElementById("card-capa").value.trim();
        const descricao = document.getElementById("card-descricao").value.trim();
        const preco = document.getElementById("card-preco").value.trim();
        const pix = document.getElementById("card-pix").value.trim();
        const senhaPatch = document.getElementById("card-senha-patch").value.trim();

        const cardData = {
            titulo, capa_url: capa, descricao, preco, pix, senha_patch: senhaPatch,
            btn_txt_1: document.getElementById("btn-txt-1").value.trim(),
            btn_url_1: document.getElementById("btn-url-1").value.trim(),
            btn_txt_2: document.getElementById("btn-txt-2").value.trim(),
            btn_url_2: document.getElementById("btn-url-2").value.trim(),
            btn_txt_3: document.getElementById("btn-txt-3").value.trim(),
            btn_url_3: document.getElementById("btn-url-3").value.trim(),
            btn_txt_4: document.getElementById("btn-txt-4").value.trim(),
            btn_url_4: document.getElementById("btn-url-4").value.trim()
        };

        if (idEdicao) {
            db.ref("cards_disponiveis/" + idEdicao).update(cardData).then(() => {
                alert("Card atualizado com sucesso!");
                limparFormularioCardAdmin();
            });
        } else {
            const novoCardRef = db.ref("cards_disponiveis").push();
            novoCardRef.set(cardData).then(() => {
                alert("Novo Card de Jogo cadastrado com sucesso!");
                limparFormularioCardAdmin();
            });
        }
    });
}

function limparFormularioCardAdmin() {
    document.getElementById("form-criar-card").reset();
    document.getElementById("card-id-edicao").value = "";
    document.getElementById("titulo-form-card").innerText = "1. Criar Novo Card de Jogo";
    document.getElementById("btn-salvar-card").innerText = "SALVAR CARD";
    document.getElementById("btn-cancelar-edicao").style.display = "none";
}

function carregarCardParaEdicao(id) {
    const card = todosOsCards[id];
    if (!card) return;

    document.getElementById("card-id-edicao").value = id;
    document.getElementById("card-titulo").value = card.titulo || "";
    document.getElementById("card-capa").value = card.capa_url || card.capa || "";
    document.getElementById("card-descricao").value = card.descricao || "";
    document.getElementById("card-preco").value = card.preco || "";
    document.getElementById("card-pix").value = card.pix || "";
    document.getElementById("card-senha-patch").value = card.senha_patch || card.senhaPatch || "";
    
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`btn-txt-${i}`).value = card[`btn_txt_${i}`] || card[`btnTxt${i}`] || "";
        document.getElementById(`btn-url-${i}`).value = card[`btn_url_${i}`] || card[`btnUrl${i}`] || "";
    }

    document.getElementById("titulo-form-card").innerText = "📝 Editando Card Existente";
    document.getElementById("btn-salvar-card").innerText = "ATUALIZAR CARD";
    document.getElementById("btn-cancelar-edicao").style.display = "inline-block";
}

function deletarCardJogoAdmin(id) {
    if (confirm("Deseja realmente remover este card permanentemente do sistema?")) {
        db.ref("cards_disponiveis/" + id).remove().then(() => alert("Card excluído com sucesso!"));
    }
}

function renderizarPainelControleAdmin() {
    const containerListaCards = document.getElementById("lista-cards-criados");
    if(containerListaCards) {
        containerListaCards.innerHTML = "";
        Object.keys(todosOsCards).forEach(id => {
            const card = todosOsCards[id];
            const item = document.createElement("div");
            item.className = "user-item-box";
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";
            item.innerHTML = `
                <div>
                    <strong style="font-size:0.9rem; color:#fff;">${card.titulo}</strong>
                    <p style="font-size:0.75rem; color:#8899a6; margin-top:3px;">Preço: ${card.preco || "R$ 10,00"}</p>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="carregarCardParaEdicao('${id}')" class="btn-visualizar-comprovante" style="padding:4px 8px; font-size:0.7rem; margin:0;">✏️</button>
                    <button onclick="deletarCardJogoAdmin('${id}')" class="btn-recusar-pedido" style="padding:4px 8px; font-size:0.7rem; margin:0;">❌</button>
                </div>
            `;
            containerListaCards.appendChild(item);
        });
    }

    const containerListaPedidosUsuarios = document.getElementById("lista-usuarios-admin");
    const containerResetBox = document.getElementById("container-reset-pre-venda");
    if (!containerListaPedidosUsuarios) return;

    containerListaPedidosUsuarios.innerHTML = "";
    if(containerResetBox) containerResetBox.style.display = "none";

    if (abaSolicitacoesAtivaAdmin === "pendentes" || abaSolicitacoesAtivaAdmin === "concluidos") {
        if(abaSolicitacoesAtivaAdmin === "concluidos" && containerResetBox) containerResetBox.style.display = "block";

        let contadorFiltro = 0;
        Object.keys(solicitacoesGeraisDoBanco).forEach(key => {
            const sol = solicitacoesGeraisDoBanco[key];
            const statusFiltroAlvo = abaSolicitacoesAtivaAdmin === "pendentes" ? "pendente" : "aprovado";

            if (sol.statusSolicitacao === statusFiltroAlvo) {
                contadorFiltro++;
                const card = todosOsCards[sol.cardId] || { titulo: "Card Removido" };
                const div = document.createElement("div");
                div.className = "user-item-box";
                
                let acoesHtml = "";
                if (sol.statusSolicitacao === "pendente") {
                    acoesHtml = `
                        <div class="acoes-admin-row">
                            <button onclick="alterarStatusPedidoCliente('${sol.solicitacaoId}', 'aprovado')" class="btn-aprovar-pedido">LIBERAR PATCH</button>
                            <button onclick="alterarStatusPedidoCliente('${sol.solicitacaoId}', 'recusado')" class="btn-recusar-pedido">Recusar</button>
                        </div>
                    `;
                } else {
                    acoesHtml = `
                        <div class="acoes-admin-row">
                            <button onclick="alterarStatusPedidoCliente('${sol.solicitacaoId}', 'pendente')" class="btn-recusar-pedido" style="border-color:#ffcc00; color:#ffcc00; width:100%;">Reverter para Análise</button>
                        </div>
                    `;
                }

                div.innerHTML = `
                    <div class="user-item-header">
                        <div class="user-item-info">
                            <h4>${sol.nomeUsuario}</h4>
                            <p>WhatsApp: <strong>${sol.whatsappUsuario}</strong></p>
                            <p>Item Adquirido: <strong style="color:#00ff66;">${card.titulo}</strong></p>
                        </div>
                        <span class="badge-status ${sol.statusSolicitacao}">${sol.statusSolicitacao}</span>
                    </div>
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        <a href="${sol.comprovanteBase64}" target="_blank" class="btn-visualizar-comprovante" style="width:100%;">VER FOTO DO COMPROVANTE</a>
                    </div>
                    ${acoesHtml}
                `;
                containerListaPedidosUsuarios.appendChild(div);
            }
        });

        if(contadorFiltro === 0) {
            containerListaPedidosUsuarios.innerHTML = `<div style="text-align:center; color:#667788; padding:30px; font-size:0.85rem;">Nenhuma inscrição nesta aba.</div>`;
        }
    } else if (abaSolicitacoesAtivaAdmin === "cadastrados") {
        db.ref("usuarios").once("value", snapshot => {
            const users = snapshot.val() || {};
            let countUsers = 0;
            Object.keys(users).forEach(uid => {
                const u = users[uid];
                countUsers++;
                const itemUser = document.createElement("div");
                itemUser.className = "user-item-box";
                
                let btnAcaoUser = "";
                if(u.regra !== "admin") {
                    btnAcaoUser = `<button onclick="promoverUsuarioParaAdmin('${u.uid}')" class="btn-visualizar-comprovante" style="margin-top:10px; font-size:0.7rem; padding:4px 8px; border-color:#00ff66; color:#00ff66;">Promover a Admin</button>`;
                } else {
                    btnAcaoUser = `<span style="font-size:0.7rem; color:#ffcc00; display:block; margin-top:10px; font-weight:bold;">👑 Administrador Geral</span>`;
                }

                itemUser.innerHTML = `
                    <div class="user-item-header">
                        <div class="user-item-info">
                            <h4>${u.nome || "Sem Nome"} ${u.sobrenome || ""}</h4>
                            <p>E-mail: ${u.email}</p>
                            <p>WhatsApp: ${u.whatsapp || "Não cadastrado"}</p>
                        </div>
                        <span class="badge-status cliente">${u.regra || 'cliente'}</span>
                    </div>
                    ${btnAcaoUser}
                `;
                containerListaPedidosUsuarios.appendChild(itemUser);
            });
        });
    }
}

function alterarStatusPedidoCliente(solicitacaoId, novoStatus) {
    db.ref(`solicitacoes_comprovantes/${solicitacaoId}`).update({ statusSolicitacao: novoStatus })
        .then(() => alert("Status do pedido modificado com sucesso!"));
}

function promoverUsuarioParaAdmin(uid) {
    if(confirm("Deseja promover este usuário a Administrador?")) {
        db.ref(`usuarios/${uid}`).update({ regra: "admin" })
            .then(() => alert("Usuário promovido com sucesso!"));
    }
}

function renderizarConstrutorVisualMenuAdmin() {
    const container = document.getElementById("construtor-menu-visual-container");
    if (!container) return;

    container.innerHTML = "";

    if (estruturaLayoutMenuVisual.length === 0) {
        container.innerHTML = `<p style="color:#667788; font-size:0.8rem; font-style:italic; text-align:center;">Nenhum link ou categoria adicionado.</p>`;
        return;
    }

    estruturaLayoutMenuVisual.forEach((cat, indexCat) => {
        const blocoCat = document.createElement("div");
        blocoCat.className = "bloco-categoria-visual";
        
        let linksHtml = "";
        if(cat.links && cat.links.length > 0) {
            cat.links.forEach((l, indexLink) => {
                linksHtml += `
                    <div class="linha-link-visual">
                        <input type="text" value="${l.texto}" placeholder="Texto do Link" oninput="atualizarCampoTextoMenuVisual(${indexCat}, ${indexLink}, 'texto', this.value)" style="flex:1; background:#0b0e14; border:1px solid #1f2a3c; padding:6px; color:#fff; font-size:0.8rem; border-radius:4px;">
                        <input type="url" value="${l.url}" placeholder="URL" oninput="atualizarCampoTextoMenuVisual(${indexCat}, ${indexLink}, 'url', this.value)" style="flex:1.5; background:#0b0e14; border:1px solid #1f2a3c; padding:6px; color:#fff; font-size:0.8rem; border-radius:4px;">
                        <button type="button" onclick="removerLinkMenuVisual(${indexCat}, ${indexLink})" style="background:none; border:none; color:#ff3333; cursor:pointer;">❌</button>
                    </div>
                `;
            });
        }

        blocoCat.innerHTML = `
            <div class="bloco-categoria-header">
                <input type="text" value="${cat.categoria}" oninput="atualizarNomeCategoriaMenuVisual(${indexCat}, this.value)" style="flex:1; background:#0b0e14; border:1px solid #1f2a3c; padding:8px; color:#ffcc00; font-weight:bold; font-size:0.85rem; border-radius:4px;">
                <button type="button" onclick="removerCategoriaMenuVisual(${indexCat})" class="btn-recusar-pedido" style="margin:0; padding:4px 10px; font-size:0.75rem;">Excluir</button>
            </div>
            <div class="lista-links-visual-container">${linksHtml}</div>
            <button type="button" onclick="adicionarLinkEmCategoriaVisual(${indexCat})" class="btn-visualizar-comprovante" style="margin:0; font-size:0.7rem; padding:4px 8px;">+ Adicionar Link</button>
        `;
        container.appendChild(blocoCat);
    });
}

function adicionarBlocoCategoriaVisual() {
    estruturaLayoutMenuVisual.push({ categoria: "NOVA CATEGORIA", links: [] });
    renderizarConstrutorVisualMenuAdmin();
}
function removerCategoriaMenuVisual(indexCat) {
    estruturaLayoutMenuVisual.splice(indexCat, 1);
    renderizarConstrutorVisualMenuAdmin();
}
function atualizarNomeCategoriaMenuVisual(indexCat, valor) {
    estruturaLayoutMenuVisual[indexCat].categoria = valor;
}
function adicionarLinkEmCategoriaVisual(indexCat) {
    if(!estruturaLayoutMenuVisual[indexCat].links) estruturaLayoutMenuVisual[indexCat].links = [];
    estruturaLayoutMenuVisual[indexCat].links.push({ texto: "Novo Link", url: "https://" });
    renderizarConstrutorVisualMenuAdmin();
}
function removerLinkMenuVisual(indexCat, indexLink) {
    estruturaLayoutMenuVisual[indexCat].links.splice(indexLink, 1);
    renderizarConstrutorVisualMenuAdmin();
}
function atualizarCampoTextoMenuVisual(indexCat, indexLink, campo, valor) {
    estruturaLayoutMenuVisual[indexCat].links[indexLink][campo] = valor;
}
function salvarLayoutMenuNoFirebase() {
    db.ref("configuracao_menu_horizontal").set(estruturaLayoutMenuVisual)
        .then(() => alert("Menu salvo com sucesso!"));
}

function exportarCardsParaJSON() {
    const dadosConvertidosStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todosOsCards, null, 2));
    const elementoDownloadAuxiliar = document.createElement("a");
    elementoDownloadAuxiliar.setAttribute("href", dadosConvertidosStr);
    elementoDownloadAuxiliar.setAttribute("download", `backup_cards_hub_gamer.json`);
    document.body.appendChild(elementoDownloadAuxiliar);
    elementoDownloadAuxiliar.click();
    elementoDownloadAuxiliar.remove();
}

function executarResetGeralTemporadaPreVenda() {
    if (confirm("Deseja redefinir as pré-vendas?")) {
        let chavesParaRemover = [];
        Object.keys(solicitacoesGeraisDoBanco).forEach(key => {
            if (solicitacoesGeraisDoBanco[key].statusSolicitacao === "aprovado") {
                chavesParaRemover.push(key);
            }
        });
        let tarefasRemocao = chavesParaRemover.map(key => db.ref(`solicitacoes_comprovantes/${key}`).remove());
        Promise.all(tarefasRemocao).then(() => alert("Temporada redefinida!"));
    }
}

function deslogar() {
    auth.signOut();
}
