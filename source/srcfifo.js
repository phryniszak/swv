const EventEmitter = require("events");
const fs = require("fs");

class FifoSrc extends EventEmitter {

    constructor(file) {
        super();
        this._file = file;

        // check for file asynchronus way
        setImmediate(() => {
            if (fs.existsSync(file)) {
                this.emit("connected");
                this._stream = fs.createReadStream(file, { highWaterMark: 128, encoding: null, autoClose: false });

                this._stream.on("data", data => {
                    this.emit("data", data);
                });
                this._stream.on("close", () => {
                    this.emit("disconnected");
                });
            }
        });
    }
}

module.exports = FifoSrc;
