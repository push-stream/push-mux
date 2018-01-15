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
  this.debit ++
  console.log('debit', this.credit, this.debit, data, this.name)
  this.parent._write({
    req: this.id, value: data, stream: true, end: false
  })
//  if(this.debit > this.credit + 10)
  this.paused = !this.parent.sink || this.parent.sink.paused
  //|| this.debit > this.credit + 10
  if(!this.paused && this.debit > this.credit + 10) {
    this.paused = true
    console.log('out of credit', this.id, this.debit, this.credit + 10)
  }

}

Sub.prototype.end = function (err) {
  this.parent._write({req: this.id, value: err, stream: true, end: true})
  delete this.parent.subs[this.id]
  //if we errored this stream, kill it immediately.
  if(isError(this.ended)) this._end(err)
  //else, if it was and end. wait for the remote to confirm with their error.
}

Sub.prototype._preread = function (data) {
  console.log('credit', this.credit, this.debit, data, this.name || this.id)
  this.credit ++
  this.parent._credit(this.id, this.credit)
}

