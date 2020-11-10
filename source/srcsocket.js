const EventEmitter = require("events");
const net = require("net");

class SocketSrc extends EventEmitter {

    constructor(host, port) {
        super();
        this._host = host;
        this._port = port;

        this.client = net.createConnection({ port: this._port, host: this._host, highWaterMark: 128 },
            () => {
                this._connected = true;
                this.emit("connected");
            });
        this.client.on("data",
            (buffer) => {
                this.emit("data", buffer);
            });
        this.client.on("end",
            () => {
                this.emit("disconnected");
            });
    }

    dispose() {
        this.emit("disconnected");
        this.client.destroy();
    }
}

module.exports = SocketSrc;
