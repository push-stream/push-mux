var inherits = require('inherits')
var DuplexStream = require('./stream')

function isError (end) {
  return end && end !== true
}

module.exports = Sub

inherits(Sub, DuplexStream)

function Sub (parent, id) {
  this.parent = parent
  this.id = id
  DuplexStream.call(this)
  this.paused = false
}

Sub.prototype.write = function (data) {
  this.parent._write({req: this.id, value: data, stream: true, end: false})
  this.paused = !this.parent.sink || this.parent.sink.paused
}

Sub.prototype.end = function (err) {
  this.parent._write({req: this.id, value: err, stream: true, end: true})
  delete this.parent.subs[this.id]
  //if we errored this stream, kill it immediately.
  if(isError(this.ended)) this._end(err)
  //else, if it was and end. wait for the remote to confirm with their error.
}




