

module.exports = SubSource

function SubSource (parent, id) {
  this.paused = true
  this.buffer = []
  this.ended = false
  this.parent = parent
  this.sink = null
  this.id = id
}

//called by the super stream only!
SubSource.prototype.write = function (data) {
  if(this.paused || !this.sink)
    this.buffer.push(data)
  else {
    this.sink.write(data)
  }
}

SubSource.prototype.end = function (err) {
  if(this.paused || !this.sink)
    this.ended = err || true
  else {
    this.sink.end(data)
    //remove this stream
    delete this.parent.subs[this.id]
  }
}

SubSource.prototype.resume = function () {
  //handle if stream errored, and wasn't piped at the time.
  if(this.ended && this.ended !== true)
    return this.sink.end(this.ended)

  while(!this.sink.paused && this.buffer.length)
    this.sink.write(this.buffer.shift())

  if(!this.sink.paused && this.ended)
    this.sink.end(this.ended)

  if(!this.sink.paused) {
    //if we are still paused, unpause and decrement counter.
    if(this.paused) {
      this.paused = false
      //note: we don't pause the super stream, because we need to receive if new streams come in!
    }
  }
}

SubSource.prototype.pipe = require('push-stream/pipe')

