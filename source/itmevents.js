

class TraceEvent {
    constructor(desc = "", ts = 0) {
        this._desc = desc;
        this._timestamp = ts;
    }
}

// @brief DWT data trace event.    
// Valid combinations:
// - PC value.
// - Bits[15:0] of a data address.
// - Data value, whether it was read or written, and the transfer size.
// - PC value, data value, whether it was read or written, and the transfer size.
// - Bits[15:0] of a data address, data value, whether it was read or written, and the transfer size.
class TraceDataTraceEvent extends TraceEvent {
    constructor(cmpn, pc, addr, value, rnw, sz, ts = 0) {
        super("data-trace", ts);
        this._cmpn = cmpn;
        this._pc = pc;
        this._addr = addr;
        this._value = value;
        this._rnw = rnw;
        this._sz = sz;
    }
}

// @brief Trace ITM stimulus port event.
class TraceITMEvent extends TraceEvent {
    constructor(port, data, width, ts = 0) {
        super("itm", ts);
        this._port = port;
        this._data = data;
        this._width = width;
    }
}

// @brief Trace local timestamp.
class TraceTimestamp extends TraceEvent {
    constructor(tc, ts = 0) {
        super("timestamp", ts);
        this._tc = 0; // ??? = tc;
    }
}

// @brief Trace overflow event.
class TraceOverflow extends TraceEvent {
    constructor(ts = 0) {
        super("overflow", ts);
    }
}

// @brief Periodic PC trace event."""
class TracePeriodicPC extends TraceEvent {
    constructor(pc, ts = 0) {
        super("pc", ts);
        this._pc = pc;
    }
}

// @brief Exception trace event.
class TraceExceptionEvent extends TraceEvent {

    constructor(exceptionNumber, exceptionName, action, ts = 0) {
        super("exception", ts);
        this.ACTION_DESC = {
            "Entered": 1,
            "Exited": 2,
            "Returned": 3
        };
        this._number = exceptionNumber;
        this._name = exceptionName;
        this._action = action;
    }
}

// @brief Trace DWT counter overflow event.
class TraceEventCounter extends TraceEvent {

    constructor(counterMask, ts = 0) {
        super("exception", ts);
        this.MASK = {
            "CPI_MASK": 0x01,
            "EXC_MASK": 0x02,
            "SLEEP_MASK": 0x04,
            "LSU_MASK": 0x08,
            "FOLD_MASK": 0x10,
            "CYC_MASK": 0x20
        };

        this._mask = counterMask;
    }

    _get_event_desc(evt) {
        let msg = "";
        if (evt & TraceEventCounter.CYC_MASK)
            msg += " Cyc";
        if (evt & TraceEventCounter.FOLD_MASK)
            msg += " Fold";
        if (evt & TraceEventCounter.LSU_MASK)
            msg += " LSU";
        if (evt & TraceEventCounter.SLEEP_MASK)
            msg += " Sleep";
        if (evt & TraceEventCounter.EXC_MASK)
            msg += " Exc";
        if (evt & TraceEventCounter.CPI_MASK)
            msg += " CPI";
        return msg;
    }
}

module.exports.TraceDataTraceEvent = TraceDataTraceEvent;
module.exports.TraceITMEvent = TraceITMEvent;
module.exports.TraceTimestamp = TraceTimestamp;
module.exports.TraceOverflow = TraceOverflow;
module.exports.TracePeriodicPC = TracePeriodicPC;
module.exports.TraceExceptionEvent = TraceExceptionEvent;
module.exports.TraceEventCounter = TraceEventCounter;