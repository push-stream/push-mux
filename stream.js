
function Stream () {
  this.paused = true
  this.buffer = []
}

//the following functions look really generic,
//bet they could be shifted into push-stream module

// subclasses should overwrite this method
Stream.prototype.write = function (data) {
  this._write(data)
}

// subclasses should overwrite this method
Stream.prototype.end = function (err) {
  this._end(err)
}

Stream.prototype._write = function (data) {
  if(this.sink && !this.sink.paused) {
    this.sink.write(data)
    this.paused = this.sink.paused
  }
  else {
    this.buffer.push(data)
  }
}

function isError (end) {
  return end && end !== true
}

Stream.prototype._end = function (end) {
  this.ended = end || true
  if(this.sink) {
    //if err is an Error, push the err,
    if(isError(end))
      this.sink.end(end)
    //otherwise, respect pause
    else if(!this.sink.paused) {
      this.sink.end(end)
      this.paused = this.sink.paused
    }
  }
}

Stream.prototype.resume = function () {
  if(isError(this.ended))
    this.sink.end(this.ended)

  while(this.buffer.length && !this.sink.paused)
    this.sink.write(this.buffer.shift())

  if(this.ended && this.buffer.length == 0 && !this.sink.paused)
    this.sink.end(this.ended)
}

Stream.prototype.pipe = require('push-stream/pipe')

