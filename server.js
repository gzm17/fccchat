var app = require('express')();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);

var options = { root: __dirname };
console.log("__dirname=", __dirname);

app.get('/', function(req, res) {
   res.sendfile('index.html', options);
});

app.get('/client.js', function(req, res) {
   res.sendfile('client.js', options);
});
app.get('/index.css', function(req, res) {
   res.sendfile('index.css', options);
});

var rooms = {}, roomSize = 2, idToRoom={};
io.on('connection', function(socket) {

  socket.on("checkRoom", function(room){
    console.log("checkRoom:", room);
    if((room in rooms) ) { // if room exists
      if (rooms[room].size >= roomSize) // if full
        socket.emit("full", room);
      else { // if not full
        socket.join(room);
        console.log("jointed room", room);
        rooms[room].size += 1;
        socket.emit("joined", room);
        idToRoom[socket.id]=room;
        console.log("server: socket.id to room 2 ->", socket.id, idToRoom[socket.id]);

      }
    }
    else { // if room does not exist, create room
      rooms[room]={"room_id": room, "size": 1};
      socket.join(room);
      socket.emit("joined", room);
      idToRoom[socket.id]=room;
      console.log("server: socket.id to room 1 ->", socket.id, idToRoom[socket.id]);
    }
  });

  // copied from webrtc tutorial
  // sig channel ready - use room as private channel, then pass socket.id
  socket.on('ready', function(room) {
    console.log("server on ready, emit id=", socket.id, " room=", room, " room_id=",rooms[room].room_id, " idToRoom=", idToRoom[socket.id]);
    socket.broadcast.to(room).emit('ready', socket.id);
  });

  socket.on('offer', function (id, message) {
    console.log("server side: on offer, received id=", id, " emitted offer id=", socket.id);
    socket.to(id).emit('offer', socket.id, message);
  });
  socket.on('answer', function (id, message) {
    console.log("server side: on answer, rec id=", id, " emit id=", socket.id);
    socket.to(id).emit('answer', socket.id, message);
  });
  socket.on('candidate', function (id, message) {
    console.log("server side: on candidate, rec id=", id, "emit id=", socket.id);
    socket.to(id).emit('candidate', socket.id, message);
  });

  socket.on('disconnect', function() {
    console.log("server side: on disconnect, emit id", socket.id);
    var rm = idToRoom[socket.id];
    socket.broadcast.to(rm).emit('bye', socket.id); // say goodbye to remaining socket in room
    if(rm > 0) { // update rooms object
      rooms[rm].size -=1;
    }
    else
      delete rooms[rm];

    delete idToRoom[socket.id]; // remove socket from idToRoom pointer
    
    //console.log("server on discconnect: room = ", idToRoom[socket.id], "||size = ", rooms[idToRoom[socket.id]].size, "|| socket.id = ", socket.id);
  });

});

http.listen(3000, function() {
   console.log('listening on localhost:3000');
});
