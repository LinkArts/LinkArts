/**
 * Sistema de Upload de Imagens para LinkArts
 * Integrado com Supabase Storage
 */

// Utility functions
function showToast(message, type = 'info') {
    // Implementar ou usar o sistema de toast existente
    console.log(`Toast [${type}]: ${message}`);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Cria um componente de upload de imagem
 * @param {Object} options - Configurações do upload
 * @param {string} options.containerId - ID do container onde inserir o componente
 * @param {string} options.uploadEndpoint - Endpoint de upload (/upload/profile/photo, /upload/event/photo, etc.)
 * @param {string} options.currentImageUrl - URL da imagem atual (opcional)
 * @param {function} options.onSuccess - Callback executado quando upload for bem-sucedido
 * @param {function} options.onError - Callback executado quando houver erro
 * @param {string} options.label - Label do botão (opcional)
 * @param {string} options.acceptTypes - Tipos de arquivo aceitos (opcional)
 */
function createImageUploader(options = {}) {
    const {
        containerId,
        uploadEndpoint,
        currentImageUrl = null,
        onSuccess = () => {},
        onError = () => {},
        label = 'Escolher Imagem',
        acceptTypes = 'image/jpeg,image/jpg,image/png,image/webp'
    } = options;

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container com ID '${containerId}' não encontrado`);
        return null;
    }

    // Limpar container
    container.innerHTML = '';

    // HTML do componente
    const uploaderHTML = `
        <div class="image-uploader">
            <div class="image-preview-container">
                <img class="image-preview" src="${currentImageUrl || '/img/placeholder.svg'}" alt="Preview da imagem" />
                <div class="image-overlay">
                    <button type="button" class="change-image-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        Alterar
                    </button>
                </div>
            </div>
            
            <div class="upload-controls">
                <input type="file" class="file-input" accept="${acceptTypes}" style="display: none;" />
                <div class="upload-info">
                    <small>Clique na imagem para alterar | Formatos aceitos: JPEG, PNG, WebP | Máximo: 10MB</small>
                </div>
            </div>
            
            <div class="upload-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="upload-status">Enviando...</div>
            </div>
        </div>
    `;

    container.innerHTML = uploaderHTML;

    // Elementos do DOM
    const fileInput = container.querySelector('.file-input');
    const changeBtn = container.querySelector('.change-image-btn');
    const imagePreview = container.querySelector('.image-preview');
    const progressContainer = container.querySelector('.upload-progress');
    const progressFill = container.querySelector('.progress-fill');
    const uploadStatus = container.querySelector('.upload-status');

    // Event listeners - agora só clicando na imagem
    changeBtn.addEventListener('click', () => fileInput.click());
    imagePreview.addEventListener('click', () => fileInput.click());

    // Variável para armazenar o arquivo selecionado temporariamente
    let selectedFile = null;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validar arquivo
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione apenas arquivos de imagem.', 'error');
            onError(new Error('Tipo de arquivo inválido'));
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            showToast('O arquivo é muito grande. Máximo permitido: 10MB', 'error');
            onError(new Error('Arquivo muito grande'));
            return;
        }

        // Armazenar arquivo para upload posterior
        selectedFile = file;

        // Mostrar preview imediatamente (local)
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.border = '2px solid #4f46e5'; // Indicar que há mudança pendente
        };
        reader.readAsDataURL(file);

        // Feedback visual removido conforme solicitado
    });

    // Função de upload
    async function uploadFile(file) {
        const formData = new FormData();
        const fieldName = getFieldNameFromEndpoint(uploadEndpoint);
        formData.append(fieldName, file);

        try {
            // Mostrar progresso
            showProgress(true);
            updateProgress(0, 'Preparando...');

            const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro no upload');
            }

            const result = await response.json();

            if (result.success) {
                updateProgress(100, 'Concluído!');
                
                setTimeout(() => {
                    showProgress(false);
                    showToast(result.message || 'Imagem enviada com sucesso!', 'success');
                    
                    // Atualizar preview com a imagem do Supabase
                    if (result.imageUrl) {
                        imagePreview.src = result.imageUrl;
                    }
                    
                    // Callback de sucesso
                    onSuccess(result);
                }, 1000);

                return result;
            } else {
                throw new Error(result.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            showProgress(false);
            showToast(error.message || 'Erro ao enviar imagem', 'error');
            
            // Voltar para imagem anterior
            imagePreview.src = currentImageUrl || '/img/placeholder.svg';
            
            onError(error);
            throw error;
        }
    }

    // Função para obter nome do campo baseado no endpoint
    function getFieldNameFromEndpoint(endpoint) {
        if (endpoint.includes('/profile/photo')) return 'profilePhoto';
        if (endpoint.includes('/event/photo')) return 'eventPhoto';
        if (endpoint.includes('/music/cover')) return 'musicCover';
        if (endpoint.includes('/album/cover')) return 'albumCover';
        return 'image';
    }

    // Função para mostrar/esconder progresso
    function showProgress(show) {
        if (show) {
            progressContainer.style.display = 'block';
            changeBtn.disabled = true;
        } else {
            progressContainer.style.display = 'none';
            changeBtn.disabled = false;
        }
    }

    // Função para atualizar progresso
    function updateProgress(percent, status) {
        progressFill.style.width = `${percent}%`;
        uploadStatus.textContent = status;
    }

    // Retornar interface pública
    return {
        element: container,
        updateImage: (newImageUrl) => {
            imagePreview.src = newImageUrl;
        },
        getCurrentImageUrl: () => imagePreview.src,
        reset: () => {
            imagePreview.src = currentImageUrl || '/img/placeholder.svg';
            fileInput.value = '';
            selectedFile = null;
            imagePreview.style.border = '';
            // Reset da interface visual
            showProgress(false);
        },
        // Método para fazer o upload real quando o usuário salvar
        uploadPendingImage: async () => {
            if (!selectedFile) {
                return { success: false, message: 'Nenhuma imagem pendente' };
            }

            try {
                const result = await uploadFile(selectedFile);
                if (result && result.success) {
                    selectedFile = null;
                    imagePreview.style.border = '';
                    // Reset da interface visual
                }
                return result;
            } catch (error) {
                return { success: false, message: error.message };
            }
        },
        // Verificar se há upload pendente
        hasPendingUpload: () => selectedFile !== null
    };
}

// Export para uso global
window.createImageUploader = createImageUploader; 