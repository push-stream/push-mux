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
  if(!Number.isInteger(id)) throw new Error('id must be integer')
  DuplexStream.call(this)
  this.paused = false
  this.credit = 0
  this.debit = 0
}

Sub.prototype.write = function (data) {
  data = this.parent._codec.encode({
    req: this.id, value: data, stream: true, end: false
  })
  this.debit += (data.length || 1)
  this.parent._write(data)
  this.paused = !this.parent.sink || this.parent.sink.paused
  if(!this.paused && this.debit > this.credit + this.parent.options.credit)
    this.paused = true
}

Sub.prototype.end = function (err) {
  this.parent._write(this.parent._codec.encode({req: this.id, value: err, stream: true, end: true}))

  if(this.ended)
    delete this.parent.subs[this.id]

  //if we errored this stream, kill it immediately.
  if(isError(this.ended)) this._end(err)
  //else, if it was and end. wait for the remote to confirm with their error.
}

Sub.prototype._preread = function (data) {
  this.credit += data.length || 1
  this.parent._credit(this.id)
}

