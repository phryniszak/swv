const src = require("./source/srcfile");
const decoder = require("./source/itmdecoder");

const filesrc = new src("./itm.fifo");
const itmDecoder = new decoder();

filesrc.on("data", itmDecoder.decode.bind(itmDecoder));
filesrc.on("connected", () => console.log("connected"));
filesrc.on("disconnected", () => console.log("disconnected"));


itmDecoder.on("ev", (ev) =>
    console.log(ev));
itmDecoder.on("error", (ev) => console.log("error", ev));
