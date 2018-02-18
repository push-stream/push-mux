
function isError (end) {
  return end && end !== true
}

module.exports = DuplexStream

function DuplexStream () {
  this.paused = false
  this.ended = false
  this.buffer = []
}

//the following functions look really generic,
//bet they could be shifted into push-stream module

// subclasses should overwrite this method
DuplexStream.prototype.write = function (data) {
  throw new Error('subclasses should overwrite Stream.write')
}

// subclasses should overwrite this method
DuplexStream.prototype.end = function (err) {
  throw new Error('subclasses should overwrite Stream.end')
}

DuplexStream.prototype._preread = function () {}

DuplexStream.prototype._write = function (data) {
  if(this.sink && !this.sink.paused && !this.buffer.length) {
    this.reads += data.length || 1
    this.sink.write(this._map(data))
    //for duplex streams, should it pause like this?
    //i'm thinking no, because input does not necessarily
    //translate into output, so output can pause, without causing
    //input to pause.
    if(this.parent) this.parent._credit(this.id)
    // this.paused = this.sink.paused
  }
  else {
    this.buffer.push(data)
  }
}

DuplexStream.prototype._end = function (end) {
  this.ended = end || true
  if(this.sink) {
    //if err is an Error, push the err,
    if(isError(end))
      this.sink.end(end)
    //otherwise, respect pause
    else if(this.buffer.length === 0)
      this.sink.end(end)
  }
}

DuplexStream.prototype.resume = function () {
  if(isError(this.ended))
    return this.sink.end(this.ended)
  if(!this.buffer.length || !this.sink || this.sink.paused) return

  var ended = !!this.ended
  while(this.buffer.length && !this.sink.paused) {
    var data = this.buffer.shift()
    this.reads += data.length || 1
    this.sink.write(this._map(data))
  }

  if(this.ended && this.buffer.length == 0)
    this.sink.end(this.ended)
  else if(this.parent)
    this.parent._credit(this.id)
}

DuplexStream.prototype.pipe = require('push-stream/pipe')

DuplexStream.prototype._map = function (data) {
  return data
}
