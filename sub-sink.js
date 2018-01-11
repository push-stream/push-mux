
module.exports = SubSink

function SubSink (parent, id) {
  this.parent = parent
  this.paused = parent.paused
  this.id = id
}

SubSink.prototype.write = function (data) {
  this.parent.write({req: this.id, value: data, stream: true})
  this.paused = this.parent.paused
}

function flatten (err) {
  if(!err) return true
  return {
    err: true,
    message: err.message,
    //stack: err.stack
  }
}

SubSink.prototype.end = function (err) {
  this.parent.write({req: this.id, end: true, stream: true})
  this.ended = err || true
  delete this.parent.subs[this.id]
}


