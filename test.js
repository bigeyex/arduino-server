const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000', {
    perMessageDeflate: false
});

ws.on('open', function open() {
    ws.send(JSON.stringify({"board":"arduino:avr:uno", "source":"void loop(){} void setup(){}"}));
});

ws.on('message', function(data, flags) {
    console.log(data);
})