"use strict";

const socket = io();
// Elements
let $messages;
let $messageForm;
let $messageFormInput;
let $messageFormButton;
let $messageLocationButton;

let $sidebar;

// Templates
let $messageTemplate;
let $sidebarTemplate;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

window.onload = () => {
    // Elements
    $messages = document.querySelector('#messages');
    $messageForm = document.querySelector('#message-form');
    $messageFormInput = document.querySelector('#message-form input');
    $messageFormButton = document.querySelector('#message-form button');
    $messageLocationButton = document.querySelector('#send-location');

    $sidebar = document.querySelector('.chat__sidebar');
    // Templates
    $messageTemplate = document.querySelector('#message-template').innerHTML;
    $sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

    socket.on('roomData', (data) => {
        const html = Mustache.render($sidebarTemplate, data);
        console.log($sidebar);
        $sidebar.innerHTML = html;
    });

    socket.on('message', (message) => {
        renderMessage(message);
        scrollMessagesToBottom();
    });

    $messageForm.addEventListener('submit', e => {
        changeButtonState(true);
        e.preventDefault();
        const message = $messageFormInput.value;
        // const message = e.target.elements.message.value;
        socket.emit('sendMessage', message, err => {
            if (err) {
                renderMessage(err, 'text-red');
                console.log('CB from server: ', err);
            }

            changeButtonState(false);
            scrollMessagesToBottom();
        });
    });

    $messageLocationButton.onclick = e => {
        e.preventDefault();
        if (!navigator.geolocation) {
            return alert('Geolocation is not supported by your browser.');
        }
        changeButtonState(true, $messageLocationButton);
        navigator.geolocation.getCurrentPosition((position) => {
            socket.emit('sendLocation', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }, () => {
                changeButtonState(false, $messageLocationButton);
                scrollMessagesToBottom();
            });
        });
    };

    socket.emit('join', { username, room }, error => {
        if (error) {
            alert(error);
            location.href = '/';
        }
    });
};

function renderMessage(message, className = '') {
    const html = Mustache.render($messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('D.MM.YYYY HH:mm'),
        className
    });
    $messages.insertAdjacentHTML('beforeend', html);
}

function scrollMessagesToBottom() {
    $messageFormInput.value = '';
    $messageFormInput.focus();
    let messageContainer = document.querySelector('.chat__messages');
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function changeButtonState(disable, button = $messageFormButton) {
    if (disable) {
        button.setAttribute('disabled', 'disabled');
    } else {
        button.removeAttribute('disabled');
    }
}

