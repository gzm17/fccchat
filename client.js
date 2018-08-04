"use strict";
(function() { // start of iife

const roomSize = 2;
//var socket = io.connect('http://localhost:3000');
var socket = io();

var room = prompt("Please enter a room:");
var joinedRoom;

while (room == null || room == "") {
  room = prompt("Please select a room:");
}

socket.emit("checkRoom", room);
socket.on("full", function(data){
  console.log("checkedRoom", data);
  room = "";
  while (room == null || room == "") {
    room = prompt("Room is full. Enter another room:");
  }
  socket.emit("checkRoom", room);
});
socket.on("joined", function(room){
  joinedRoom = room;
  console.log("joined room", joinedRoom);
})

// from webrtc tutorial
//const socket = io.connect(window.location.origin);
const localVideo = document.querySelector('.localVideo');
const remoteVideos = document.querySelector('.remoteVideos');
const peerConnections = {};

//let room = !location.pathname.substring(1) ? 'home' : location.pathname.substring(1);
let getUserMediaAttempts = 5;
let gettingUserMedia = false;

/** @type {RTCConfiguration} */
const config = { // used in RTCPeerConnection(config)
  'iceServers': [{
    'urls': ['stun:stun.l.google.com:19302']
  }]
};

/** @type {MediaStreamConstraints} */
const constraints = {
  // audio: true,
  video: { facingMode: "user" }
};

/*
socket.on('full', function(room) {
  alert('Room ' + room + ' is full');
});
*/

socket.on('bye', function(id) {
  handleRemoteHangup(id);
  console.log("client on bye: socket.id = ", socket.id);
});

/*
if (room && !!room) {
  socket.emit('join', room);
}
*/

window.onunload = window.onbeforeunload = function() {
  socket.close();
};

socket.on('ready', function (id) {
  console.log("client on ready: id = ", id, " socket.id=", socket.id);

  if (!(localVideo instanceof HTMLVideoElement) || !localVideo.srcObject) {
    return;
  }
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;
  if (localVideo instanceof HTMLVideoElement) {
    peerConnection.addStream(localVideo.srcObject);
  }
  peerConnection.createOffer()
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(function () {
    socket.emit('offer', id, peerConnection.localDescription);
  });
  peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, id);
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      socket.emit('candidate', id, event.candidate);
    }
  };
});

socket.on('offer', function(id, description) {
  console.log("client on offer: id=", id, "||socket.id = ", socket.id, "||desc=", description);

  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;
  if (localVideo instanceof HTMLVideoElement) {
    peerConnection.addStream(localVideo.srcObject);
  }
  peerConnection.setRemoteDescription(description)
  .then(() => peerConnection.createAnswer())
  .then(sdp => peerConnection.setLocalDescription(sdp))
  .then(function () {
    socket.emit('answer', id, peerConnection.localDescription);
  });
  peerConnection.onaddstream = event => handleRemoteStreamAdded(event.stream, id);
  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      socket.emit('candidate', id, event.candidate);
    }
  };
});

socket.on('candidate', function(id, candidate) {
  console.log("client on candidte: id=", id, "||socket.id = ", socket.id, "||cand=", candidate);

  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
  .catch(e => console.error(e));
});

socket.on('answer', function(id, description) {
  console.log("client on answer: id=", id, "||socket.id = ", socket.id, "||desc=", description);

  peerConnections[id].setRemoteDescription(description);
});

function getUserMediaSuccess(stream) {
  console.log("client: entered getUserMediaSucc");
  gettingUserMedia = false;
  if (localVideo instanceof HTMLVideoElement) {
    !localVideo.srcObject && (localVideo.srcObject = stream);
  }
  socket.emit('ready', joinedRoom);
}

function handleRemoteStreamAdded(stream, id) {
  const remoteVideo = document.createElement('video');
  remoteVideo.srcObject = stream;
  remoteVideo.setAttribute("id", id.replace(/[^a-zA-Z]+/g, "").toLowerCase());
  remoteVideo.setAttribute("playsinline", "true");
  remoteVideo.setAttribute("autoplay", "true");
  remoteVideos.appendChild(remoteVideo);
  if (remoteVideos.querySelectorAll("video").length === 1) {
    remoteVideos.setAttribute("class", "one remoteVideos");
  } else {
    remoteVideos.setAttribute("class", "remoteVideos");
  }
}

function getUserMediaError(error) {
  console.error(error);
  gettingUserMedia = false;
  (--getUserMediaAttempts > 0) && setTimeout(getUserMediaDevices, 1000);
}

function getUserMediaDevices() {
  console.log("client: enter getUseM");
  if (localVideo instanceof HTMLVideoElement) {
    console.log("client: enter getUseM, after videoelement");
    if (localVideo.srcObject) {
      console.log("client: enter getUseM, after test localV.src");
      getUserMediaSuccess(localVideo.srcObject);
    } else if (!gettingUserMedia && !localVideo.srcObject) {
      console.log("client: getUsrMediaD");
      gettingUserMedia = true;
      navigator.mediaDevices.getUserMedia(constraints)
      .then(getUserMediaSuccess)
      .catch(getUserMediaError);
    }
  }
}

function handleRemoteHangup(id) {
  peerConnections[id] && peerConnections[id].close();
  delete peerConnections[id];
  document.querySelector("#" + id.replace(/[^a-zA-Z]+/g, "").toLowerCase()).remove();
  if (remoteVideos.querySelectorAll("video").length === 1) {
    remoteVideos.setAttribute("class", "one remoteVideos");
  } else {
    remoteVideos.setAttribute("class", "remoteVideos");
  }
}

getUserMediaDevices();

})(); // end of iife
