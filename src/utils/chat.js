const Message = require('../models/message')

document.addEventListener('DOMContentLoaded', (event) => {
    const chatWindow = document.querySelector('.chat-window');

    chatWindow.innerHTML = ''
  
    fetch('/messages')
      .then(response => response.json())
      .then(messages => {
        messages.forEach(msg => {
          addMessageToWindow(msg.name, msg.content, msg.formattedDate, msg.formattedTime);
        });
      });
  
    document.querySelector('button').addEventListener('click', enviar);
  
    async function enviar() {
      console.log('enviando')
      let mensagem = document.querySelector('#userMsg').value;
      let user = document.querySelector('#userName').value;
      let pk = document.querySelector('#pk').value;
      let now = new Date();
      let hours = now.getHours().toString().padStart(2, '0');
      let minutes = now.getMinutes().toString().padStart(2, '0');
      let day = now.getDate().toString().padStart(2, '0');
      let month = (now.getMonth() + 1).toString().padStart(2, '0'); // Mês começa do zero
      let year = now.getFullYear();
      let formattedTime = `${hours}:${minutes}`;
      let formattedNewDate = `${day}/${month}/${year}`;
      const message = {name: user, content: mensagem, formattedDate:formattedNewDate, formattedTime: formattedNewDate,talkId:pk}
      if (mensagem.trim() !== '') {
        await Message.create(message)
        document.querySelector('#userMsg').value = ''; // Limpa o campo de input após o envio
        const chatWindow = document.querySelector('.chat-window');

    chatWindow.innerHTML = ''
  
    fetch('/messages')
      .then(response => response.json())
      .then(messages => {
        messages.forEach(msg => {
          addMessageToWindow(msg.name, msg.content, msg.formattedDate, msg.formattedTime);
        });
      });
      }
    }
  
    function addMessageToWindow(user, content, fd, ft) {
      let formattedDate = fd
      let formattedTime = ft 

      chatWindow.innerHTML += `<article class="msg-container msg-remote" id="msg-0">
        <div class="msg-box">
          <img class="user-img" id="user-0" src="//gravatar.com/avatar/00034587632094500000000000000000?d=retro" />
          <div class="flr">
            <div class="messages">
              <p class="msg" id="msg-0">
                ${content}
              </p>
            </div>
            <span class="timestamp"><span class="username">${user}</span>&bull;<span class="posttime">${formattedDate} ${formattedTime}</span></span>
          </div>
        </div>
      </article>`;
  
      chatWindow.scrollTop = chatWindow.scrollHeight; // Rola para o fim da janela de chat
    }
  });