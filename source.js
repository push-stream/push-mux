var SubSink = require('./sub-sink')
module.exports = Source

//NOTE: Source creates subsinks.
//because this is the source for the network.
//this is about SENDING. see Sink for receiving.

function Source () {
  this.id = 'src'
  this.paused = true
  this.subs = []
}

Source.prototype.onRequest = function () {
  console.error('user must overwrite onRequest method')
}

//Source.prototype.createRequest = function (cb) {
//  
//}

Source.prototype.createStream = function () {
  return this.subs[this.subs.length] = new SubSink(this, this.subs.length+1)
}

//only called by sub streams!
Source.prototype._write = function (data) {
  console.log('source:write', data)
  this.sink.write(data)
  this.paused = this.sink.paused
}

Source.prototype.end = function (err) {
  this.sink.end(err)
  for(var k in this.subs)
    if(!this.subs[k].ended)
      this.subs[k].abort(err)
}

Source.prototype.resume = function () {
  if(this.paused) {
    this.paused = false
    for(var k in this.subs)
      if(this.subs[k].paused)
        this.subs[k].resume()
  }
}

Source.prototype.pipe = require('push-stream/pipe')

