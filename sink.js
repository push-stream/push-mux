
module.exports = Sink

var SubSource = require('./sub-source')

function Sink () {
  this.subs = []
  //this.unpauseCount = 0
}


Sink.prototype.onStream = function () {
  throw new Error('user must overwrite: Source.onStream')
}

Sink.prototype.write = function (op) {
  if(op.stream) {
    //message in already existing stream...
    var substream = this.subs[op.req]
    if(substream) {
      if(op.end) substream.end(op.end)
      else substream.write(op.value)
    }
    else {
      console.log('createStream', op.req)
      substream = this.subs[op.req] = new SubSource(this, op.req)
      this.onStream(substream)
      substream.write(op.value)
    }
  }
  else {
    console.log('sink:write', op)
    this.onRequest(op)
  }
}

Sink.prototype.end = function (err) {
  //ends all sub streams
  for(var k in this.subs)
    this.subs.end(err)
}

Sink.prototype.createStream = function () {
  return this.subs[this.subs.length+1] = new SubSource(this, this.subs.length+1)
  //this.unpauseCount -- //since the stream starts off paused.
}

