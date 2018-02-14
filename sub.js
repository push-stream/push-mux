var inherits = require('inherits')
var DuplexStream = require('./stream')

function isError (end) {
  return end && end !== true
}

function flatten (err) {
  return err === true ? true : { error: true, message: err.message }
}

module.exports = Sub

inherits(Sub, DuplexStream)

function Sub (parent, id) {
  this.parent = parent
  this.id = id
  if(!Number.isInteger(id)) throw new Error('id must be integer')
  DuplexStream.call(this)
  this.paused = false
  this.credit = parent.controlStream ? 0 : -1
  this.debit = 0
  this.writes = this.reads = 0
}

Sub.prototype.write = function (data) {
  data = this.parent._codec.encode({
    req: this.id, value: data, stream: true, end: false
  })
  this.writes += (data.length || 1)
  this.parent._write(data)
  this.paused = !this.parent.sink || this.parent.sink.paused
  if(
    !this.paused && ~this.credit &&
    this.writes >= this.credit + (this.parent.options.credit/2)
  )
    this.paused = true
}

Sub.prototype.end = function (err) {
  this.parent._write(this.parent._codec.encode({req: this.id, value: flatten(err||true), stream: true, end: true}))

  if(this.ended)
    delete this.parent.subs[this.id]

  //if we errored this stream, kill it immediately.
  if(isError(this.ended)) this._end(err)
  //else, if it was and end. wait for the remote to confirm with their error.
}

Sub.prototype._preread = function (data) {
  this.reads += data.length || 1
  this.parent._credit(this.id)
}
Sub.prototype.abort = function (err) {
  if(this.source) this.source.abort(err)

  if(!this.ended) {
    this.end(this.ended = err)
  }
  else
    this._end(this.ended)
}




