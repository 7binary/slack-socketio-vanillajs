const baseURL = 'http://localhost:8000';
let nsSocket;

// socket, the / namespace (pathname)
const socIndex = io(baseURL, {
  query: {
    username: prompt('What is your username?') || 'Unknown',
  },
});

// STARTS RENDER. Event fires after Socket is connected
socIndex.on('nsList', (nsData) => {
  renderNS(nsData);
  bindClickNS();
});

// scroll chat on resize with debouncing
let resizeTimeout;
window.addEventListener('resize', () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(() => {
    const messagesList = document.querySelector('#messages');
    messagesList.scrollTo(0, messagesList.scrollHeight);
  }, 30);
});

function renderNS(nsData) {
  const namespacesDiv = document.querySelector('.namespaces');
  namespacesDiv.innerHTML = '';
  nsData.forEach(ns => namespacesDiv.insertAdjacentHTML('afterbegin', `
    <div class="namespace" data-nsPath="${ns.path}">
      <img src="${ns.img}"/>
    </div>
  `));
}

function bindClickNS() {
  Array.from(document.getElementsByClassName('namespace')).forEach((nsNode, index) => {
    const nsPath = nsNode.getAttribute('data-nsPath');
    nsNode.addEventListener('click', () => {
      document.querySelector('.chat-panel').classList.add('no-room');
      joinNS(nsPath);
    });
    if (index === 0) {
      joinNS(nsPath); // join the first Namespace automatically
    }
  });
}

function joinNS(nsPath) {
  nsSocket && nsSocket.close();
  nsSocket = io(`${baseURL}${nsPath}`);
  nsSocket.on('nsRoomLoad', nsRooms => {
    renderRooms(nsRooms);
    bindClickRooms(nsSocket);
  });
  nsSocket.on('messageToClients', msg => {
    buildHtmlMessages([msg]);
  });
  listenSubmitMessage();
  listenUpdateChatMembers();
  listenSearch();
}

function renderRooms(nsRooms) {
  const roomsList = document.querySelector('.room-list');
  roomsList.innerHTML = '';
  nsRooms.forEach(room => roomsList.insertAdjacentHTML('afterbegin', renderRoom(room)));
}

function renderRoom(room) {
  return `
    <li class="room" data-roomId="${room.id}">
      <span class="glyphicon glyphicon-${room.isPrivate ? 'lock' : 'globe'}"></span>
      ${room.title}
    </li>
  `;
}

function bindClickRooms() {
  const roomNodes = document.getElementsByClassName('room');
  Array.from(roomNodes).forEach(roomNode => {
    roomNode.addEventListener('click', () => {
      const roomId = roomNode.getAttribute('data-roomId');
      joinRoom(roomId);
    });
  });
}

function joinRoom(roomId) {
  nsSocket.emit('joinRoomId', roomId, roomInfo => {
    const { messages, title } = roomInfo;
    document.querySelector('.curr-room-text').innerHTML = title;
    buildHtmlMessages(messages, true);
    document.querySelector('.chat-panel').classList.remove('no-room');
  });
}

function listenSubmitMessage() {
  // first remove all listeners
  const messageForm = document.querySelector('#message-form');
  messageForm.outerHTML = messageForm.outerHTML;
  // add listener
  document.querySelector('#message-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.querySelector('#message-input').value;
    nsSocket.emit('newMessageToServer', message);
    document.querySelector('#message-input').value = '';
  });
}

function listenSearch() {
  // first remove all listeners
  const searchBox = document.querySelector('#search-box');
  searchBox.outerHTML = searchBox.outerHTML;
  // add listener
  document.querySelector('#search-box').addEventListener('input', (event) => {
    const searchText = event.target.value.toLowerCase();
    Array.from(document.getElementsByClassName('message-text')).forEach(messageText => {
      if (messageText.innerHTML.toLowerCase().includes(searchText)) {
        messageText.closest('.message').style.display = 'flex';
      } else {
        messageText.closest('.message').style.display = 'none';
      }
    });
  });
}

function listenUpdateChatMembers() {
  nsSocket.on('updateChatMembers', chatMembers => {
    document.querySelector('.room-users-counter').innerHTML = chatMembers;
  });
}

function buildHtmlMessages(messages, clear = false) {
  const messagesList = document.querySelector('#messages');
  if (clear) {
    messagesList.innerHTML = '';
  }
  messages.filter(msg => !!msg.avatar).forEach(msg => preloadImage(msg.avatar));
  messages.forEach(msg => messagesList.insertAdjacentHTML('beforeend', buildHtmlMsg(msg)));
  messagesList.scrollTo(0, messagesList.scrollHeight);
}

function buildHtmlMsg(msg) {
  const convertedTime = new Date(msg.time).toLocaleString();
  return `
    <li class="message">
      <div class="user-image">
        <img src="${msg.avatar}"/>
      </div>
      <div class="user-message">
        <div class="user-name-time">
          ${msg.username} <span>${convertedTime}</span>
        </div>
        <div class="message-text">${msg.text}</div>
      </div>
     </li>
  `;
}

// to preload images
function preloadImageMemo() {
  const cachedUrls = [];
  const cache = document.createElement('CACHE');
  cache.style = 'position:absolute;z-index:-1000;opacity:0;';
  document.body.appendChild(cache);

  return function preloadImage(url) {
    if (cachedUrls[url]) {
      return;
    }
    const img = new Image();
    img.src = url;
    img.style = 'position:absolute';

    cache.appendChild(img);
    cachedUrls[url] = true;
  };
}

const preloadImage = preloadImageMemo();

