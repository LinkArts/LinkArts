document.addEventListener('DOMContentLoaded', () => {
    const contacts = document.querySelectorAll('.contact');
    const messagesContainer = document.querySelector('.messages');
    const input = document.querySelector('.input-bar input');
    const button = document.querySelector('.input-bar button');
  
    // Trocar contato ativo
    contacts.forEach(contact => {
      contact.addEventListener('click', () => {
        contacts.forEach(c => c.classList.remove('selected'));
        contact.classList.add('selected');
  
        // Aqui você pode carregar mensagens diferentes por contato (mock)
        messagesContainer.innerHTML = `
          <div class="message left"><p>Olá! Tudo certo?<span>09:00</span></p></div>
          <div class="message right"><p>Sim, tudo sim!<span>09:01</span></p></div>
        `;
      });
    });
  
    // Enviar mensagem
    button.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  
    function sendMessage() {
      const text = input.value.trim();
      if (text === '') return;
  
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
      const msg = document.createElement('div');
      msg.classList.add('message', 'right');
      msg.innerHTML = `<p>${text}<span>${time}</span></p>`;
  
      messagesContainer.appendChild(msg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
      input.value = '';
    }
  });
  