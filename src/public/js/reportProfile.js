export function setupReportProfileButton(buttonSelector = '#report-profile-btn') {
  const reportProfileButton = document.querySelector(buttonSelector);
  if (!reportProfileButton) {
    return;
  }

  reportProfileButton.addEventListener('click', () => {
    const userId = reportProfileButton.dataset.userId;
    const modalHTML = `
      <button type="button" class="modal-close-btn" aria-label="Fechar modal">×</button>
      <h2>Denunciar Perfil</h2>
      <form id="report-profile-form">
        <div class="form-group">
          <label for="report-reason">Motivo da denúncia *</label>
          <select id="report-reason" name="reason" required>
            <option value="">Selecione um motivo</option>
            <option value="spam">Spam ou conteúdo repetitivo</option>
            <option value="fake">Perfil falso ou enganoso</option>
            <option value="harassment">Assédio ou bullying</option>
            <option value="inappropriate">Conteúdo inapropriado</option>
            <option value="copyright">Violação de direitos autorais</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label for="report-description">Descrição detalhada</label>
          <textarea id="report-description" name="description" rows="4" placeholder="Descreva o problema em detalhes (opcional)"></textarea>
        </div>
        <div class="button-group">
          <button type="button" class="btn btn-cancel">Fechar</button>
          <button type="submit" class="btn btn-primary">Enviar Denúncia</button>
        </div>
      </form>
    `;

    const modalElement = openModal('.report-profile-overlay', 'report-profile-modal', modalHTML, reportProfileButton);
    if (!modalElement) return;

    const form = modalElement.querySelector('#report-profile-form');
    const reasonSelect = modalElement.querySelector('#report-reason');
    const descriptionTextarea = modalElement.querySelector('#report-description');
    const modalOverlay = modalElement.closest('.modal-overlay');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const reason = reasonSelect.value;
      const description = descriptionTextarea.value;

      if (!reason) {
        reasonSelect.classList.add('input-error');
        showToast('Por favor, selecione um motivo para a denúncia.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportedUserId: userId,
            reason,
            description
          })
        });

        if (response.ok) {
          showToast('Denúncia enviada com sucesso. Obrigado por nos ajudar a manter a comunidade segura.', 'success');
          closeModal(modalOverlay);
        } else {
          const errorData = await response.json();
          showToast(errorData.message || 'Erro ao enviar denúncia. Tente novamente.', 'error');
        }
      } catch (error) {
        console.error('Erro ao enviar denúncia:', error);
        showToast('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
      }
    });

    reasonSelect?.addEventListener('change', () => reasonSelect.classList.remove('input-error'));
  });
} 