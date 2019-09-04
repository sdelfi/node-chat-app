"use strict";

// const process = require('process');
const { generateMessage } = require('./utils/messages');
const users = require('./utils/users');
const path = require('path');
const http = require('http');
const Fastify = require('fastify');
const socketio = require('socket.io');
// const socketioClient = require('socket.io-client');
const Filter = require('bad-words');
const filter = new Filter();
filter.addWords('хер');

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;
// const io = require('socketio')(fastify.server);
const publicDirectoryPath = path.join(__dirname, '../public');
// const server = http.createServer(fastify);


const serverFactory = handler => {
    const server = http.createServer((req, res) => {
        handler(req, res);
    });
    return server;
};

const fastify = Fastify({
    serverFactory,
    ignoreTrailingSlash: true
});

const io = socketio(fastify.server);

fastify.register(require('fastify-static'), {
    root: publicDirectoryPath
});

// socket.emit - current client
// io.emit - all clients
// socket.broadcast.emit - all client except this
// io.to.emit - to everebody in a room
// socket.broadcast.to.emit - to anyone room, except this

io.on('connection', socket => {
    // io.emit('message', generateMessage('A user has joined!'));
    // socket.broadcast.emit('message', 'A user has joined!');    
    socket.on('join', (options, callback) => {
        const { error, user } = users.addUser({ id: socket.id, ...options });

        if (error) {
            return callback(error);
        }

        socket.join(user.room);
        socket.emit('message', generateMessage('Bot', `Welcome, ${user.username}!`));

        io.emit('roomData', {
            room: user.room,
            users: users.getUsersInRoom(user.room)
        });
        socket.broadcast.to(user.room).emit('message', generateMessage('Bot', `${user.username} has joined!`));

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        let cbMessage = '';

        const user = users.getUser(socket.id);

        if (user) {
            if (filter.isProfane(message)) {
                cbMessage = 'Bad, very bad';
                message = filter.clean(message);
            }

            io.to(user.room).emit('message', generateMessage(user.username, message));
            callback(cbMessage);
        }
    });


    socket.on('sendLocation', (coords, callback) => {
        const user = users.getUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage(user.username, 'Coordinates shared: ' + coords.latitude + ' ' + coords.longitude));
        }
        callback();
    });

    socket.on('disconnect', () => {
        const user = users.removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Robot', `${user.username} has left!`));
        }
    });
});



// let client = socketioClient.connect('http://' + host + ':' + port);
// client.on('message', (message) => {
//     console.log('server client message received', message);
// });

// fastify.get('/123', async (request, reply) => {
//     reply.send({
//         test: 'test123'
//     });
// });

fastify.listen(port, host, (err, address) => {
    if (err) {
        fastify.log.error(err);
        process.exit(1);
    }

    fastify.log.info(`server listening on ${address}`);
    // console.log(`server listening on ${port}`);
});
    // .then((address) => console.log(`server listening on ${address}`))
    // .catch(err => {
    //     console.log('Error starting server:', err)
    //     process.exit(1)
    // })