// ======================================================
// ADESA - DISTRIBUIÇÃO AUTOMÁTICA DE LEADS
// ======================================================

// Configurações

const API_URL =
    "http://localhost:5080/api/v1/leads/distribuir";

const REQUEST_ID_KEY =
    "adesa_lead_request_id";

// true = apenas testa a distribuição, sem abrir WhatsApp.
// false = redireciona automaticamente para o WhatsApp.
const DEBUG_NO_REDIRECT = true;

// Tempo máximo para aguardar a API (15 segundos).
const REQUEST_TIMEOUT = 15000;


// ======================================================
// DIAGNÓSTICOS
// ======================================================

console.log("-----------------------------------------");
console.log("[ADESA] Inicializando página intermediária");
console.log("[ADESA] JavaScript carregado com sucesso!");
console.log("[ADESA] API:", API_URL);
console.log("[ADESA] Modo debug:", DEBUG_NO_REDIRECT);
console.log("-----------------------------------------");


// ======================================================
// ELEMENTOS HTML
// ======================================================

const loadingElement = document.getElementById("loading");

const errorElement = document.getElementById("error");

const loadingTitle = document.getElementById("loading-title");

const statusMessage = document.getElementById("status-message");

const errorMessage = document.getElementById("error-message");

const retryButton = document.getElementById("retry-button");


// Verifica se os elementos existem.
if (
    !loadingElement ||
    !errorElement ||
    !loadingTitle ||
    !statusMessage ||
    !errorMessage ||
    !retryButton
) {
    console.error(
        "[ADESA] ERRO: Não foi possível encontrar todos os elementos HTML."
    );

    throw new Error("Estrutura HTML incompleta.");
}


// ======================================================
// IDENTIFICADOR DA SOLICITAÇÃO
// ======================================================

function getRequestId() {

    try {

        let requestId = sessionStorage.getItem(REQUEST_ID_KEY);

        if (!requestId) {

            requestId = crypto.randomUUID();

            sessionStorage.setItem(
                REQUEST_ID_KEY,
                requestId
            );

            console.log(
                "[ADESA] Novo RequestId gerado:",
                requestId
            );

        } else {

            console.log(
                "[ADESA] RequestId recuperado:",
                requestId
            );

        }

        return requestId;

    } catch (error) {

        console.warn(
            "[ADESA] Não foi possível utilizar sessionStorage:",
            error
        );

        const requestId = crypto.randomUUID();

        console.log(
            "[ADESA] RequestId temporário:",
            requestId
        );

        return requestId;

    }

}


// Mantemos o mesmo identificador durante as tentativas.
const requestId = getRequestId();


// ======================================================
// CONTROLE DA INTERFACE
// ======================================================

function showLoading() {

    loadingElement.hidden = false;
    errorElement.hidden = true;

    loadingTitle.textContent = "Estamos conectando você!";

    statusMessage.textContent =
        "Estamos encontrando um corretor para atender você.";

}


function showError(message) {

    loadingElement.hidden = true;
    errorElement.hidden = false;

    errorMessage.textContent = message;

}


function showSuccess(message) {

    loadingElement.hidden = false;
    errorElement.hidden = true;

    const spinner = loadingElement.querySelector(".spinner");

    if (spinner) {
        spinner.style.display = "none";
    }

    loadingTitle.textContent = "Conexão realizada!";

    statusMessage.textContent = message;

}


// ======================================================
// DISTRIBUIÇÃO DO LEAD
// ======================================================

let isProcessing = false;

async function distribuirLead() {

    // Evita múltiplas chamadas provocadas por cliques repetidos.
    if (isProcessing) {
        console.warn("[ADESA] Já existe uma distribuição em andamento.");
        return;
    }

    isProcessing = true;

    showLoading();

    console.log("-----------------------------------------");
    console.log("[ADESA] Iniciando distribuição...");
    console.log("[ADESA] RequestId:", requestId);
    console.log("[ADESA] Endpoint:", API_URL);

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT);

    try {

        // ==============================================
        // REQUISIÇÃO HTTP
        // ==============================================

        console.log("[ADESA] Enviando POST para a API...");

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                requestId: requestId
            }),

            signal: controller.signal

        });

        console.log(
            "[ADESA] Status HTTP recebido:",
            response.status
        );

        // ==============================================
        // LEITURA DA RESPOSTA
        // ==============================================

        const data = await response.json();

        console.log("[ADESA] Resposta da API:", data);

        if (!response.ok) {

            throw new Error(
                data?.mensagem ||
                data?.title ||
                `Erro HTTP ${response.status}`
            );

        }

        // ==============================================
        // VALIDAÇÃO DOS DADOS
        // ==============================================

        if (!data.redirectUrl) {

            throw new Error(
                "A API não retornou o endereço do WhatsApp."
            );

        }

        if (!data.nomeCorretor) {

            throw new Error(
                "A API não retornou o nome do corretor."
            );

        }

        if (!data.atribuicaoId) {

            throw new Error(
                "A API não retornou o identificador da atribuição."
            );

        }

        // ==============================================
        // VALIDAR ENDEREÇO DO WHATSAPP
        // ==============================================

        const redirectUrl = new URL(data.redirectUrl);

        if (
            redirectUrl.protocol !== "https:" ||
            redirectUrl.hostname !== "wa.me"
        ) {

            throw new Error(
                "O endereço de redirecionamento não é válido."
            );

        }

        // ==============================================
        // DISTRIBUIÇÃO CONCLUÍDA
        // ==============================================

        console.log("-----------------------------------------");

        console.log(
            "[ADESA] DISTRIBUIÇÃO CONCLUÍDA!"
        );

        console.log(
            "[ADESA] Corretor selecionado:",
            data.nomeCorretor
        );

        console.log(
            "[ADESA] Corretor ID:",
            data.corretorId
        );

        console.log(
            "[ADESA] Atribuição ID:",
            data.atribuicaoId
        );

        console.log(
            "[ADESA] Requisição reutilizada:",
            data.reutilizada
        );

        console.log(
            "[ADESA] WhatsApp:",
            redirectUrl.toString()
        );

        console.log("-----------------------------------------");


        // ==============================================
        // MODO DE TESTE
        // ==============================================

        if (DEBUG_NO_REDIRECT) {

            showSuccess(
                `Encontramos o corretor ${data.nomeCorretor}. ` +
                "Distribuição realizada com sucesso. " +
                "O redirecionamento está desativado durante os testes."
            );

            console.log(
                "[ADESA] Modo debug ativo. WhatsApp não será aberto."
            );

            return;

        }


        // ==============================================
        // REDIRECIONAMENTO REAL
        // ==============================================

        console.log(
            "[ADESA] Redirecionando para o WhatsApp..."
        );

        // Remove o identificador para que uma nova visita
        // inicie uma nova distribuição.
        sessionStorage.removeItem(REQUEST_ID_KEY);

        window.location.replace(
            redirectUrl.toString()
        );

    } catch (error) {

        console.error(
            "[ADESA] ERRO NA DISTRIBUIÇÃO:",
            error
        );

        // ==============================================
        // TRATAMENTO DE ERROS
        // ==============================================

        if (error.name === "AbortError") {

            showError(
                "A conexão demorou mais que o esperado. " +
                "Verifique sua internet e tente novamente."
            );

        } else if (error instanceof TypeError) {

            showError(
                "Não foi possível conectar ao servidor. " +
                "Verifique se a API está funcionando."
            );

            console.error(
                "[ADESA] Verifique também a configuração de CORS."
            );

        } else {

            showError(
                error.message ||
                "Ocorreu um erro inesperado. Tente novamente."
            );

        }

    } finally {

        clearTimeout(timeout);

        isProcessing = false;

    }

}


// ======================================================
// EVENTOS
// ======================================================

// Botão de nova tentativa.
retryButton.addEventListener("click", () => {

    console.log(
        "[ADESA] Usuário solicitou uma nova tentativa."
    );

    distribuirLead();

});


// ======================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ======================================================

console.log("[ADESA] Iniciando aplicação...");

distribuirLead();