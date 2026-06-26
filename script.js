function redirecionarConfig() {
    window.location.href = "./config.html"
}

function redirecionarSorteador() {
    window.location.href = "./index.html"
}

// Inicializar IndexedDB para armazenar PDFs
let db;
function inicializarIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("SorteadorDB", 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("slides")) {
                db.createObjectStore("slides", { keyPath: "nome" });
            }
        };
    });
}

// Salvar PDF em IndexedDB
function salvarPDFIndexedDB(nome, file) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["slides"], "readwrite");
        const store = transaction.objectStore("slides");
        const request = store.put({ nome: nome, arquivo: file });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Recuperar PDF de IndexedDB
function recuperarPDFIndexedDB(nome) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["slides"], "readonly");
        const store = transaction.objectStore("slides");
        const request = store.get(nome);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.arquivo);
    });
}

// Estrutura padrão do banco de dados
const dbPadrao = {
    turmas: [],
    slides: [],
    historico: [],
    paginasSorteadas: {}
};

// Carregar dados do localStorage (simulando um banco de dados)
function carregarDB() {
    const dbJSON = localStorage.getItem("sorteadorDB");
    return dbJSON ? JSON.parse(dbJSON) : JSON.parse(JSON.stringify(dbPadrao));
}

// Salvar dados no localStorage
function salvarDB(db) {
    localStorage.setItem("sorteadorDB", JSON.stringify(db));
}

// Inicializar página com turmas e slides salvos
function inicializar() {
    inicializarIndexedDB().then(() => {
        const db = carregarDB();

        const selectTurma = document.getElementById("turma");
        const selectSlide = document.getElementById("slide");

        // Adicionar turmas
        for (const turma of db.turmas) {
            const option = document.createElement("option");
            option.value = turma.nome;
            option.text = turma.nome;
            selectTurma.appendChild(option);
        }

        // Adicionar slides
        for (const slide of db.slides) {
            const option = document.createElement("option");
            option.value = slide.nome;
            option.text = slide.nome;
            selectSlide.appendChild(option);
        }
    });
}

// Chamar inicializar ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    inicializar();
    document.getElementById("opcoes").style.display = "none";
    document.getElementById("salvar").style.display = "none";
    document.getElementById("fullscreenSlide").style.display = "none";
});

function sortear() {
    // Sortear aluno
    const turmaSelecionada = document.getElementById("turma").value;
    if (turmaSelecionada === "--") {
        alert("Selecione uma turma primeiro!");
        return;
    }

    const db = carregarDB();
    const turma = db.turmas.find(t => t.nome === turmaSelecionada);
    
    if (!turma || turma.alunos.length === 0) {
        alert("Nenhum aluno cadastrado nesta turma!");
        return;
    }

    const indiceAleatorio = Math.floor(Math.random() * turma.alunos.length);
    const alunoSorteado = turma.alunos[indiceAleatorio];

    document.getElementById("aluno").classList.remove("empty");
    document.getElementById("aluno-text").textContent = alunoSorteado;
    document.getElementById("numAluno").textContent = `#${indiceAleatorio + 1}`;

    // Armazenar dados do sorteio atual
    window.sorteioAtual = {
        turma: turmaSelecionada,
        aluno: alunoSorteado,
        numeroAluno: indiceAleatorio + 1,
        slide: document.getElementById("slide").value !== "--" ? document.getElementById("slide").value : null,
        pagina: null
    };

    // Sortear página do slide
    const slideSelecionado = document.getElementById("slide").value;
    const fullscreenButton = document.getElementById("fullscreenSlide");
    if (slideSelecionado !== "--") {
        sortearPaginaPDF(slideSelecionado);
        fullscreenButton.style.display = "block";
    } else {
        fullscreenButton.style.display = "none";
    }

    document.getElementById("opcoes").style.display = "flex";
    document.getElementById("salvar").style.display = "block";
}

function salvar() {
    document.getElementById("opcoes").style.display = "none";
    document.getElementById("salvar").style.display = "none";

    // Salvar resultado no histórico
    if (window.sorteioAtual) {
        const resultado = document.querySelector('input[name="resultado"]:checked')?.id;
        
        if (resultado) {
            const db = carregarDB();
            const registroHistorico = {
                id: db.historico.length + 1,
                turma: window.sorteioAtual.turma,
                aluno: window.sorteioAtual.aluno,
                numeroAluno: window.sorteioAtual.numeroAluno,
                slide: window.sorteioAtual.slide,
                pagina: window.sorteioAtual.pagina,
                resultado: resultado === "acertou" ? "acertou" : (resultado === "meio-certo" ? "meio certo" : "errou"),
                data: new Date().toISOString()
            };
            
            db.historico.push(registroHistorico);
            salvarDB(db);
        }
    }

    // Resetar campos
    document.getElementById("aluno").classList.add("empty");
    document.getElementById("aluno-text").textContent = "Nenhum aluno sorteado ainda.";
    document.getElementById("numAluno").textContent = "";
    document.getElementById("pergunta").classList.add("empty");
    document.getElementById("pergunta-text").textContent = "Nenhuma pergunta sorteada ainda.";
    document.getElementById("pergunta-numero").textContent = "";
    document.getElementById("fullscreenSlide").style.display = "none";

    // Limpar seleção de opções
    document.getElementById("acertou").checked = false;
    document.getElementById("meio-certo").checked = false;
    document.getElementById("errou").checked = false;

    window.sorteioAtual = null;
}

function mostrarSlideFull() {
    const img = document.querySelector("#pergunta img");
    if (!img) {
        alert("Nenhum slide disponível para exibir.");
        return;
    }
    const win = window.open("", "fullscreenSlide");
    if (win) {
        win.document.write(`<style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}img{max-width:100vw;max-height:100vh;}</style><img src="${img.src}">`);
        win.document.title = "Slide em tela cheia";
    } else {
        alert("Não foi possível abrir a janela de visualização.");
    }
}


function adicionarTurma() {
    document.getElementById("adicionarTurmaPopup").style.display = "block";
}

function salvarTurma() {
    var turma = document.getElementById("novaTurma").value;
    var alunos = document.getElementById("novosAlunos").value;
    
    if (!turma || !alunos) {
        alert("Preencha todos os campos!");
        return;
    }

    const db = carregarDB();
    
    // Verificar se turma já existe
    const turmaExistente = db.turmas.findIndex(t => t.nome === turma);
    const alunosArray = alunos.split("\n").map(a => a.trim()).filter(a => a);
    
    if (turmaExistente !== -1) {
        // Atualizar turma existente
        db.turmas[turmaExistente].alunos = alunosArray;
    } else {
        // Adicionar nova turma
        db.turmas.push({
            nome: turma,
            alunos: alunosArray
        });
    }
    
    salvarDB(db);

    var select = document.getElementById("turma");
    
    // Verificar se opção já existe
    const opcaoExistente = Array.from(select.options).find(o => o.value === turma);
    if (!opcaoExistente) {
        var option = document.createElement("option");
        option.value = turma;
        option.text = turma;
        select.appendChild(option);
    }

    document.getElementById("novaTurma").value = "";
    document.getElementById("novosAlunos").value = "";
    document.getElementById("adicionarTurmaPopup").style.display = "none";
}

function adicionarSlide() {
    document.getElementById("adicionarSlidePopup").style.display = "block";
}

function salvarSlide() {
    var slide = document.getElementById("novoSlide").value;
    var file = document.getElementById("novasPerguntas").files[0];

    if (!slide || !file) {
        alert("Preencha todos os campos!");
        return;
    }

    var reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const db = carregarDB();
            
            // Salvar em IndexedDB
            await salvarPDFIndexedDB(slide, e.target.result);
            
            // Verificar se slide já existe
            const slideExistente = db.slides.findIndex(s => s.nome === slide);
            if (slideExistente !== -1) {
                // Atualizar slide existente
                db.slides[slideExistente].nome = slide;
            } else {
                // Adicionar novo slide
                db.slides.push({
                    nome: slide
                });
            }
            
            salvarDB(db);

            var select = document.getElementById("slide");
            
            // Verificar se opção já existe
            const opcaoExistente = Array.from(select.options).find(o => o.value === slide);
            if (!opcaoExistente) {
                var option = document.createElement("option");
                option.value = slide;
                option.text = slide;
                select.appendChild(option);
            }

            document.getElementById("novoSlide").value = "";
            document.getElementById("novasPerguntas").value = "";
            document.getElementById("adicionarSlidePopup").style.display = "none";
        } catch (error) {
            alert("Erro ao salvar o PDF: " + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function fechar() {
    document.getElementById("adicionarTurmaPopup").style.display = "none";
    document.getElementById("adicionarSlidePopup").style.display = "none";
}

async function sortearPaginaPDF(slide) {
    try {
        // Recuperar PDF de IndexedDB
        const pdfData = await recuperarPDFIndexedDB(slide);

        if (!pdfData) {
            alert("PDF não encontrado!");
            return;
        }

        // Configurar pdf.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // Carregar o PDF
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPaginas = pdf.numPages;

        // Pegar páginas já sorteadas do banco de dados
        const db = carregarDB();
        if (!db.paginasSorteadas[slide]) {
            db.paginasSorteadas[slide] = [];
        }

        // Se todas as páginas foram sorteadas, limpar e começar novamente
        if (db.paginasSorteadas[slide].length === numPaginas) {
            db.paginasSorteadas[slide] = [];
        }

        // Sortear uma página que não foi sorteada
        let paginaSorteada;
        do {
            paginaSorteada = Math.floor(Math.random() * numPaginas) + 1;
        } while (db.paginasSorteadas[slide].includes(paginaSorteada));

        db.paginasSorteadas[slide].push(paginaSorteada);
        salvarDB(db);

        // Armazenar número da página no sorteio atual
        if (window.sorteioAtual) {
            window.sorteioAtual.pagina = paginaSorteada;
        }

        // Renderizar a página
        const page = await pdf.getPage(paginaSorteada);
        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Mostrar a imagem
        const container = document.getElementById("pergunta");
        container.innerHTML = "";
        const img = document.createElement("img");
        img.src = canvas.toDataURL();
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        container.appendChild(img);

        // Mostrar o número da página
        const paginaInfo = document.createElement("p");
        paginaInfo.textContent = `Página: ${paginaSorteada}`;
        paginaInfo.style.marginTop = "10px";
        paginaInfo.style.color = "#7c7c7c";
        container.appendChild(paginaInfo);

    } catch (error) {
        console.error("Erro ao carregar PDF:", error);
        alert("Erro ao carregar o PDF!");
    }
}

