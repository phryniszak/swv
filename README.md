# swv

Nodejs library that can parse SWV trace output.

## How to install `SWV`

Prerequisite is nodejs.

```shell
$ git clone https://github.com/phryniszak/swv.git
$ cd swv
$ npm install
```
It installs only one additional library `minimist`, needed to parse app arguments.

## Parse file
Create trace file using openocd:
```
tpiu config internal itm.fifo uart off 170000000
```
and trace output:
```shell
$ node index.js --path itm.fifo
```

## Connect to pipe
Reading via a named pipe works well on POSIX machines; e.g. Linux or macOS, but not Windows.
```shell
$ mkfifo /tmp/itm.fifo
$ node index.js --path /tmp/itm.fifo --type pipe
```
This will create a named pipe: /tmp/itm.fifo. Then start openocd directing output to pipe:
```
tpiu config internal /tmp/itm.fifo uart off 170000000
```

## Connect to socket
Start openocd with redirecting trace output to TCP server
```
tpiu config internal :3344 uart off 170000000
```
And start app passing port number:
```shell
node index.js --port 3344 --type socket
```

## Connect to serial port
TODO:

## Merging traces 
Library attempts to merge trace packet in logical chunks, but in some cases, like trace without timestamp this functionality may fail. Passing  `--nomerge` forces library to disable merging.

## Example app output
```
{
  _: [],
  port: 3344,
  type: 'socket',
  path: 'itm.fifo',
  host: 'localhost'
}
connected
TraceITMEvent {
  _desc: 'itm',
  _timestamp: 1480586,
  _port: 1,
  _data: 15,
  _width: 1
}
TraceITMEvent {
  _desc: 'itm',
  _timestamp: 1480638,
  _port: 2,
  _data: 15,
  _width: 1
}

```

## ACKNOWLEDGMENTS

ITM decoder is taken from [pyocd](https://github.com/pyocd/pyOCD) and converted from python to js with few modification.
Some inspiration also from [Cortex Debug](https://github.com/Marus/cortex-debug)