const argv = require("minimist")(process.argv.slice(2), {
    default: {
        type: "file",
        path: "itm.fifo",
        host: "localhost",
        port: 3344,
        nomerge: false
    },
});

console.dir(argv);

///////////////////////////////////////////////////////////////////////////////

const decoder = require("./source/itmdecoder");
const itmDecoder = new decoder(!argv.nomerge);

let itm_src;

if (argv.type == "file") {
    let src = require("./source/srcfile");
    itm_src = new src(argv.path);
} else if (argv.type == "pipe") {
    let src = require("./source/srcfifo");
    itm_src = new src(argv.path);
} else if (argv.type == "socket") {
    let src = require("./source/srcsocket");
    itm_src = new src(argv.host, argv.port);
}

itm_src.on("data", itmDecoder.decode.bind(itmDecoder));
itm_src.on("connected", () => console.log("connected"));
itm_src.on("disconnected", () => console.log("disconnected"));


itmDecoder.on("ev", (ev) =>
    console.log(ev));
itmDecoder.on("error", (ev) =>
    console.log("error", ev));
