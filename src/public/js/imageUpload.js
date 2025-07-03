
function showToast(message, type = 'info') {
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createImageUploader(options = {}) {
    const {
        containerId,
        uploadEndpoint,
        currentImageUrl = null,
        onSuccess = () => {},
        onError = () => {},
        onImageSelect = () => {},
        label = 'Escolher Imagem',
        acceptTypes = 'image/jpeg,image/jpg,image/png,image/webp'
    } = options;

    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container com ID '${containerId}' não encontrado`);
        return null;
    }

    container.innerHTML = '';

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

    const fileInput = container.querySelector('.file-input');
    const changeBtn = container.querySelector('.change-image-btn');
    const imagePreview = container.querySelector('.image-preview');
    const progressContainer = container.querySelector('.upload-progress');
    const progressFill = container.querySelector('.progress-fill');
    const uploadStatus = container.querySelector('.upload-status');

    changeBtn.addEventListener('click', () => fileInput.click());
    imagePreview.addEventListener('click', () => fileInput.click());

    let selectedFile = null;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

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

        selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.border = '2px solid #4f46e5';
            
            onImageSelect(e.target.result);
        };
        reader.readAsDataURL(file);

        if (uploadEndpoint.includes('/profile/photo')) {
            uploadFile(file);
        }
    });

    async function uploadFile(file) {

        const formData = new FormData();
        const fieldName = getFieldNameFromEndpoint(uploadEndpoint);
        formData.append(fieldName, file);

        try {
            showProgress(true);
            updateProgress(0, 'Preparando...');

            const response = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ [DEBUG] Erro na resposta:', errorData);
                throw new Error(errorData.message || 'Erro no upload');
            }

            const result = await response.json();
            
            if (result.success) {
                updateProgress(100, 'Concluído!');
                
                setTimeout(() => {
                    showProgress(false);
                    showToast(result.message || 'Imagem enviada com sucesso!', 'success');
                    
                    if (result.imageUrl) {
                        imagePreview.src = result.imageUrl;
                    }
                    
                    onSuccess(result);
                }, 1000);

                return result;
            } else {
                console.error('❌ [DEBUG] Upload não foi bem-sucedido:', result);
                throw new Error(result.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('💥 [DEBUG] Erro no upload - detalhes completos:', {
                message: error.message,
                stack: error.stack,
                endpoint: uploadEndpoint,
                fileName: file.name
            });
            showProgress(false);
            showToast(error.message || 'Erro ao enviar imagem', 'error');
            
            imagePreview.src = currentImageUrl || '/img/placeholder.svg';
            
            onError(error);
            throw error;
        }
    }

    function getFieldNameFromEndpoint(endpoint) {
        if (endpoint.includes('/profile/photo')) return 'profilePhoto';
        if (endpoint.includes('/event/photo')) return 'eventPhoto';
        if (endpoint.includes('/music/cover')) return 'musicCover';
        if (endpoint.includes('/album/cover')) return 'albumCover';
        return 'image';
    }

    function showProgress(show) {
        if (show) {
            progressContainer.style.display = 'block';
            changeBtn.disabled = true;
        } else {
            progressContainer.style.display = 'none';
            changeBtn.disabled = false;
        }
    }

    function updateProgress(percent, status) {
        progressFill.style.width = `${percent}%`;
        uploadStatus.textContent = status;
    }

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
            showProgress(false);
        },
        uploadPendingImage: async () => {
            if (!selectedFile) {
                return { success: false, message: 'Nenhuma imagem pendente' };
            }

            try {
                const result = await uploadFile(selectedFile);
                if (result && result.success) {
                    selectedFile = null;
                    imagePreview.style.border = '';
                }
                return result;
            } catch (error) {
                return { success: false, message: error.message };
            }
        },
        hasPendingUpload: () => selectedFile !== null
    };
}

window.createImageUploader = createImageUploader; 