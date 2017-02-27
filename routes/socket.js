

var userNames = (function () {
  var names = {};

  var claim = function (name) {
    if (!name || (names[name])) {
      return false;
    } else {
      names[name] = true;
      return true;
    }
  };


  var getGuestName = function () {
    var name,
      nextUserId = 1;

    do {
      name = 'Anonymous' + nextUserId;
      nextUserId += 1;
    } while (!claim(name));

    return name;
  };

  // serialize claimed names as an array
  var get = function () {
    var res = [];
    for (user in names) {
      res.push(user);
    }

    return res;
  };

  var free = function (name) {
    if (names[name]) {
      delete names[name];
    }
  };

  return {
    claim: claim,
    free: free,
    get: get,
    getGuestName: getGuestName
  };
}());

var channels = (function () {
  var channelList = ['Coffee room', 'Cat pics', 'Random'];

  // serialize claimed names as an array
  var get = function () {
    return channelList;
  };
  return {
    get: get,
  };
}());

function usersByChannel(io, channelName) {
  var users = [];
  var room = io.sockets.adapter.rooms[channelName];
  if (room) {
    var clients = io.sockets.adapter.rooms[channelName].sockets;
    for (var clientId in clients) {
      var clientSocket = io.sockets.connected[clientId]
      console.log('Connected client: ' + clientSocket.username + " in " + clientSocket.room);
      users.push(clientSocket.username);
    }
  }
  return users;
};

function InitRooms(socket){
  for (var room in channels.get())
  {
    socket.rooms.push({room : room});
  }
}


var socketIo = module.exports = {};

socketIo.events = function (socket, io) {
  var name = userNames.getGuestName();
  socket.username = name;
  socket.room = channels.get()[0];
  socket.join(socket.room);

  // send the new user their name and a list of users
  socket.emit('init', {
    name: name,
    users: usersByChannel(io, socket.room),
    channels: channels.get(),
    channel: socket.room
  });



  // notify other clients that a new user has joined
  socket.broadcast.to(socket.room).emit('user:join', {
    name: name
  });

  // broadcast a user's message to other users
  socket.on('send:message', function (data) {
    socket.broadcast.to(socket.room).emit('send:message', {
      user: data.user,
      text: data.text
    });
  });


  // validate a user's name change, and broadcast it on success
  socket.on('change:name', function (data, fn) {
    if (userNames.claim(data.name)) {
      var oldName = name;
      userNames.free(oldName);
      socket.username = data.name;
      name = data.name;
      console.log("Name change " + oldName + ' -> ' + socket.username);
      console.log("Broadcasting name change to " + socket.room);
      socket.broadcast.emit('change:name', {
        oldName: oldName,
        newName: name
      });

      fn(true);
    } else {
      fn(false);
    }
  });

  socket.on('switchRoom', function (newRoom) {
    var oldRoom;
    oldRoom = socket.room;
    console.log(socket.username + ' switching room ' + oldRoom + '->' + newRoom);
    // sent message to OLD room
    socket.broadcast.to(socket.room).emit('send:message', {
      user: '',
      text: socket.username + ' has left the channel'
    });
    socket.leave(oldRoom);
    socket.room = newRoom;
    socket.join(newRoom);
    socket.broadcast.to(oldRoom).emit('update:users', {
      users: usersByChannel(io, oldRoom)
    });

    io.sockets.in(newRoom).emit('update:users', {
      users: usersByChannel(io, newRoom)
    });

    // update socket session room title
   
    socket.broadcast.to(newRoom).emit('send:message', {
      user: '',
      text: socket.username + ' has joined the channel'
    });
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    socket.broadcast.emit('user:left', {
      name: name
    });
    userNames.free(name);
  });
};
