const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Google's public STUN server
        }
    ]
};

startButton.addEventListener('click', startCall);

async function startCall() {
    // Get the local media stream
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    // Create the peer connection
    peerConnection = new RTCPeerConnection(servers);

    // Add the local stream to the peer connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Handle the remote stream
    peerConnection.ontrack = event => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            // Send the ICE candidate to the remote peer
            sendMessage('ice-candidate', event.candidate);
        }
    };

    // Create an offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send the offer to the remote peer
    sendMessage('offer', offer);
}

async function handleMessage(message) {
    const data = JSON.parse(message);

    if (data.type === 'offer') {
        // Set the remote description and create an answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send the answer to the remote peer
        sendMessage('answer', answer);
    } else if (data.type === 'answer') {
        // Set the remote description
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'ice-candidate') {
        // Add the ICE candidate
        const candidate = new RTCIceCandidate(data.candidate);
        await peerConnection.addIceCandidate(candidate);
    }
}

const socket = new WebSocket('ws://localhost:8080');

socket.onmessage = event => handleMessage(event.data);

function sendMessage(type, data) {
    const message = JSON.stringify({ type, data });
    socket.send(message);
}