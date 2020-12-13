const SerialPort = require("serialport");

const __sin = { index: 0, step: 64, max: (2 << 15) - 1 };

const port = new SerialPort("/dev/ttyACM1", function (err) {
    if (err) {
        return console.log("* Error: ", err.message);
    }
});

port.on("data", function (data) {
    let str = data.asciiSlice().trim();
    str.split(/\s/g).forEach((el) => {
        el = el.trim();
        if (el !== "") {
            parser.next(el);
        }
    });
});

function askSin() {
    if (__sin.index < __sin.max) {
        port.write(`sin ${__sin.index}\n`);
    }
    __sin.index += __sin.step;
}

function* parse() {
    let sin_arg1, sin_arg2, sin_res;
    let str1, str2;
    while (true) {
        str1 = yield;
        // shell>
        if (str1 === "shell>") {
            askSin();
        } else {
            continue;
        }
        // sin
        str1 = yield;
        if (str1 !== "sin") {
            continue;
        }
        // sin argument sent
        str1 = yield;
        sin_arg1 = parseInt(str1);

        // > OK,
        str1 = yield;
        str2 = yield;
        if ((str1 !== ">") && (str2 !== "OK,")) {
            continue;
        }

        // sin argument received
        str1 = yield;
        sin_arg2 = parseInt(str1);

        // =
        str1 = yield;
        if (str1 !== "=") {
            continue;
        }

        str1 = yield;
        sin_res = parseInt(str1);

        console.log(`${sin_arg2},${sin_res}`);
    }
}

const parser = parse();
parser.next("");

port.write("\n");