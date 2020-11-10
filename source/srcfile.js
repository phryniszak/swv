const EventEmitter = require("events");
const fs = require("fs");

class FileSrc extends EventEmitter {

    constructor(file) {
        super();
        this.connected = false;
        this.fd;
        this.interval;

        fs.open(file, "r", (err, fd) => {
            if (err) {
                this.emit("error", err);
            }
            else {
                this.fd = fd;
                this.interval = setInterval(this.read.bind(this), 2);
                this.connected = true;
                this.emit("connected");
            }
        });
    }

    read() {
        const buf = Buffer.alloc(64);
        fs.read(this.fd, buf, 0, 64, null, (err, bytesRead, buffer) => {
            if (bytesRead > 0) {
                this.emit("data", buffer.slice(0, bytesRead));
            }
        });
    }

    dispose() {
        this.emit("disconnected");
        clearInterval(this.interval);
        fs.closeSync(this.fd);
    }
}

module.exports = FileSrc;
