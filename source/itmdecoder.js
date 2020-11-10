const EventEmitter = require("events");
const events = require("./itmevents");

class ITMDecoder extends EventEmitter {

    constructor(merge_events = true) {
        super();
        this._merge_events = merge_events;
        this.reset();
    }

    reset() {
        this._bytes_parsed = 0;
        this._itm_page = 0;
        // merging events
        this._pending_events = [];
        this._pending_data_trace;

        this._processByteFunc = this._parse();
        // prime decoder, other way it starts from 2nd byte in data stream
        this._processByteFunc.next(0);
    }

    decode(data) {
        data.forEach(
            (byte) => {
                // console.log("0x" + byte.toString(16), this._bytes_parsed);
                this._processByteFunc.next(byte);
                this._bytes_parsed += 1;
            });
    }

    * _parse() {
        let timestamp = 0;
        let invalid = true;

        while (true) {
            let byte = yield;
            let hdr = byte;

            // D4.1.2
            // The first byte of a packet is the packet header, and indicates the packet type. For some packet types, the packet can
            // include one or more bytes of payload.    

            // Sync packet.
            // 0b00000000 At least 6 Synchronization See Synchronization packet on page D4-782
            if (hdr === 0) {
                let packets = 0;
                while (true) {
                    // Check for final 1 bit after at least 5 all-zero sync packets
                    if ((packets >= 5) && (byte === 0x80)) {
                        invalid = false;
                        break;
                    }
                    else if (byte === 0) {
                        packets += 1;
                    }
                    else {
                        // Get early non-zero packet, (reset sync packet counter.- PH why?)
                        // PH non orthodox exit ...
                        // PH why somme synchro packets are ending like this?
                        invalid = false;
                        // PH
                        if (packets >= 5) {
                            hdr = byte;
                        }
                        break;
                    }
                    byte = yield;
                }
                this._itm_page = 0;
            }
            // Overflow packet.
            // PH was (else if)
            if (hdr === 0x70) {
                this._send_event(events.TraceOverflow());
            }
            // Protocol See Protocol packets on page D4-782
            // 0bxxxxxx00 , not 0b00000000, payload 0-4 
            else if ((hdr & 0x3) === 0) {
                let c = (hdr >> 7) & 0x1;
                let d = (hdr >> 4) & 0b111;
                // Local timestamp.
                if (((hdr & 0xf) === 0) && ((d === 0x0) || (d === 0x3)) === false) {
                    let ts = 0;
                    let tc = 0;
                    // Local timestamp packet format 1.
                    if (c === 1) {
                        tc = (hdr >> 4) & 0x3;
                        while (c === 1) {
                            byte = yield;
                            ts = (ts << 7) | (byte & 0x7f);
                            c = (byte >> 7) & 0x1;
                        }
                    }
                    // Local timestamp packet format 2.
                    else {
                        ts = (hdr >> 4) & 0x7;
                    }
                    timestamp += ts;
                    this._send_event(new events.TraceTimestamp(tc, timestamp));
                }
                // Global timestamp.
                else if ((hdr === 0b10010100) || (hdr === 0b10110100)) {
                    let t = (hdr >> 5) & 0x1;
                    // TODO handle global timestamp
                }
                // Extension.
                else if ((hdr & 0x8) === 0x8) {
                    let sh = (hdr >> 2) & 0x1;
                    let ex;
                    if (c === 0) {
                        ex = (hdr >> 4) & 0x7;
                    }
                    else {
                        ex = 0;
                        while (c === 1) {
                            byte = yield;
                            ex = (ex << 7) | (byte & 0x7f);
                            c = (byte >> 7) & 0x1;
                        }
                    }
                    if (sh === 0) {
                        // Extension packet with sh==0 sets ITM stimulus page.
                        this._itm_page = ex;
                    }
                    else {
                        // self._send_event(events.TraceEvent("Extension: SH={:d} EX={:#x}\n".format(sh, ex), timestamp))
                        invalid = true;
                    }
                }
                // Reserved packet.
                else {
                    invalid = true;
                }
            }
            // See Source packets on page D4-787
            // 0bxxxxxxSS ,SS not 0b00, payload 1, 2, or 4
            else {
                let ss = hdr & 0x3;
                let l = 1 << (ss - 1);
                let a = (hdr >> 3) & 0x1f;
                let payload;
                if (l === 1) {
                    payload = yield;
                }
                else if (l === 2) {
                    let byte1 = yield;
                    let byte2 = yield;
                    payload = (byte1 | (byte2 << 8));
                }
                else {
                    let byte1 = yield;
                    let byte2 = yield;
                    let byte3 = yield;
                    let byte4 = yield;
                    payload = (byte1 | (byte2 << 8) | (byte3 << 16) | (byte4 << 24));
                }

                // Instrumentation packet.
                if ((hdr & 0x4) === 0) {
                    let port = (this._itm_page * 32) + a;
                    this._send_event(new events.TraceITMEvent(port, payload, l));
                }
                // Hardware source packets...
                // Event counter
                else if (a === 0) {
                    this._send_event(new events.TraceEventCounter(payload));
                }
                // Exception trace
                else if (a === 1) {
                    let exceptionNumber = payload & 0x1ff;
                    let exceptionName = this.exception_number_to_name(exceptionNumber, true);
                    let fn = (payload >> 12) & 0x3;
                    if ((1 <= fn) && (fn <= 3)) {
                        this._send_event(new events.TraceExceptionEvent(exceptionNumber, exceptionName, fn));
                    }
                    else {
                        invalid = true;
                    }
                }
                // PC sampling
                else if (a === 2) {
                    // A payload of 0 indicates a period PC sleep event.
                    this._send_event(new events.TracePeriodicPC(payload));
                }
                // Data trace
                else if ((8 <= a) && (a <= 23)) {
                    let type = (hdr >> 6) & 0x3;
                    let cmpn = (hdr >> 4) & 0x3;
                    let bit3 = (hdr >> 3) & 0x1;
                    // Data trace PC value packet, see Data trace PC value packet format on page D4-794.
                    if ((type === 0b01) && (bit3 === 0)) {
                        // cmpn = cmpn, pc = payload, ts = timestamp
                        this._send_event(new events.TraceDataTraceEvent(cmpn, payload, undefined, undefined, undefined, undefined));
                    }
                    // Data trace address packet, see Data trace address packet format on page D4-794.
                    else if ((type === 0b01) && (bit3 === 1)) {
                        // cmpn = cmpn, addr = payload, ts = timestamp)
                        this._send_event(new events.TraceDataTraceEvent(cmpn, undefined, payload, undefined, undefined, undefined));
                    }
                    // Data value, see Data trace data value packet format on page D4-794.
                    else if (type === 0b10) {
                        // cmpn = cmpn, value = payload, rnw = (bit3 === 0), sz = l, ts = timestamp
                        this._send_event(new events.TraceDataTraceEvent(cmpn, undefined, undefined, payload, (bit3 === 0), 1));
                    }
                    else {
                        invalid = true;
                    }
                }
                // Invalid DWT 'a' value.
                else {
                    invalid = true;
                }
            }
        }
    }

    _send_event(event) {
        // @brief Process event objects and decide when to send to event sink.        
        // This method handles the logic to associate a timestamp event with the prior other
        // event. A list of pending events is built up until either a timestamp or overflow event
        // is generated, at which point all pending events are flushed to the event sink. If a
        // timestamp is seen, the timestamp of all pending events is set prior to flushing.

        if (!this._merge_events) {
            this.emit("ev", event);
            return;
        }

        let flush = false;

        //  Handle merging data trace events.
        if (this._merge_data_trace_events(event)) {
            return;
        }

        if (event instanceof events.TraceTimestamp) {
            this._pending_events.forEach((ev) =>
                ev._timestamp = event._timestamp);
            flush = true;
        }
        else {
            if (this._pending_events.length > 0) {
                // before add remove previous events, searching backword
                let index = this._pending_events.length;
                for (; index > 0; index--) {
                    // found the same class as we try to add
                    if (event.constructor.name === this._pending_events[index - 1].constructor.name)
                        break;
                }

                if (index > 0) {
                    // remove old elements
                    this._pending_events = this._pending_events.slice(index);
                }
            }

            this._pending_events.push(event);
            if (event instanceof events.TraceOverflow) {
                flush = true;
            }
        }

        if (flush) {
            this._flush_events();
        }
    }

    _merge_data_trace_events(event) {
        // @brief Look for pairs of data trace events and merge.
        if (event instanceof events.TraceDataTraceEvent) {
            // Record the first data trace event.
            if (this._pending_data_trace == undefined) {
                this._pending_data_trace = event;
            }
            else {
                // We've got the second in a pair. If the comparator numbers are the same, then
                // we can merge the two events. Otherwise we just add them to the pending event
                // queue separately.
                let ev;
                if (event.comparator == this._pending_data_trace.comparator) {
                    // Merge the two data trace events.
                    ev = new events.TraceDataTraceEvent(event.comparator,
                        event._pc || this._pending_data_trace._pc,
                        event._address || this._pending_data_trace._address,
                        event._value || this._pending_data_trace._value,
                        event._is_read || this._pending_data_trace._is_read,
                        event._transfer_size || this._pending_data_trace._transfer_size,
                        this._pending_data_trace._timestamp);
                }
                else {
                    ev = this._pending_data_trace;
                }
                this._pending_events.push(ev);
                this._pending_data_trace = undefined;
            }
            return true;
        }
        // If we get a non-data-trace event while waiting for a second data trace event, then
        // just place the pending data trace event in the pending event queue.
        else if (this._pending_data_trace !== undefined) {
            this._pending_events.push(this._pending_data_trace);
            this._pending_data_trace = undefined;
        }
        return false;
    }

    _flush_events() {
        // @brief Send all pending events to event sink.
        this._pending_events.forEach((ev) => this.emit("ev", ev));
        this._pending_events.length = 0;
    }

    exception_number_to_name(exc_num, name_thread = false) {
        // @brief Names for built -in Exception numbers found in IPSR
        let CORE_EXCEPTION = [
            "Thread",
            "Reset",
            "NMI",
            "HardFault",
            "MemManage",
            "BusFault",
            "UsageFault",
            "SecureFault",
            "Exception 8",
            "Exception 9",
            "Exception 10",
            "SVCall",
            "DebugMonitor",
            "Exception 13",
            "PendSV",
            "SysTick",
        ];


        if (exc_num < CORE_EXCEPTION.length)
            if (exc_num == 0 && !name_thread) {
                return "";
            }
            else {
                return CORE_EXCEPTION[exc_num];
            }
        else {
            let irq_num = exc_num - CORE_EXCEPTION.length;
            let name = "";
            if (this.session_irq_table) {
                name = this.session_irq_table.get(irq_num);
            }
            if (name !== "")
                return "Interrupt[%s]" % name;
            else
                return "Interrupt %d" % irq_num;
        }
    }
}

module.exports = ITMDecoder;
