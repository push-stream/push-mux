var inherits = require('inherits')
var Stream = require('./stream')

module.exports = Sub

inherits(Sub, Stream)

function Sub (parent, id) {
  this.parent = parent
  this.id = id
  Stream.call(this)
}

Sub.prototype.write = function (data) {
  this.parent._write({req: this.id, value: data, stream: true, end: false})
}

Sub.prototype.end = function (err) {
  this.parent._write({req: this.id, value: data, stream: true, end: true})
  delete this.parent.subs[this.id]
  //if we errored this stream, kill it immediately.
  if(isError(this.ended)) this._end(err)
  //else, if it was and end. wait for the remote to confirm with their error.
}






