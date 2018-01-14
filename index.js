var inherits = require('inherits')
var Sub = require('./sub')
var DuplexStream = require('./stream')

function isError (end) {
  return end && end !== true
}

module.exports = Mux

inherits(Mux, DuplexStream)

function Mux (opts) {
  this.cbs = {}
  this.subs = {}
  this.nextId = 0
  this.options = opts || {}
  DuplexStream.call(this)
  this.paused = false
}

Mux.prototype.stream = function (opts) {
  var id = ++this.nextId
  var sub = new Sub(this, id)
  this.subs[id] = sub
  this._write({req: id, value: opts, stream: true, end: false})
  return sub
}

Mux.prototype.request = function (opts, cb) {
  var id = ++this.nextId
  this.cbs[id] = cb
  this._write({req: id, value: opts, stream: false})
  return id
}

Mux.prototype.message = function (value) {
  this._write({req: 0, stream: false, end: false, value: value})
}

function writeDataToStream(data, sub) {
  if(data.end === true) sub._end(data.value)
  else         sub._write(data.value)
}

Mux.prototype._createCb = function (id) {
  return this.cbs[-id] = function (err, value) {
    this._write({
      req: -id,
      stream: false,
      end: !!err,
      value: err ? flatten(err) : value
    })
  }.bind(this)
}

Mux.prototype.write = function (data) {
  if(data.req == 0)
    this.options.onMessage && this.options.onMessage(data)
  else if(!data.stream) {
    if(data.req > 0 && this.options.onRequest)
      this.options.onRequest(data.value, this._createCb(data.req))
    else if(data.req < 0 && this.cbs[-data.req]) {
      var cb = this.cbs[-data.req]
      this.cbs[-data.req] = null
      cb(data.end ? data.value : null, data.end ? null : data.value)
    }
  }
  else if(data.stream) {
    console.log('write', data, Object.keys(this.subs), this.nextId)
    var sub = this.subs[-data.req] //TODO: handle +/- subs
    if(sub) writeDataToStream(data, sub)
    //we received a new stream!
    else if (data.req > 0 && this.options.onStream) {
      var sub = this.subs[-data.req] = new Sub(this, -data.req)
      console.log('new-stream', -data.req)
      this.options.onStream(sub, data.value)
    }
    else
      console.error('ignore:', data)
    //else, we received a reply to a stream we didn't make,
    //which should never happen!
  }
}

Mux.prototype.end = function (err) {
  var _err = err || new Error('parent stream closed') 
  for(var i in this.cbs) {
    var cb = this.cbs[i]
    delete this.cbs[i]
    cb(_err)
  }
  for(var i in this.subs) {
    var sub = this.subs[i]
    delete this.subs[i]
    sub._end(_err)
  }
  //end the next piped to stream with the written error
  this._end(err)
}

Mux.prototype.resume = function () {
  //since this is a duplex
  //this code taken from ./stream#resume
  if(this.buffer.length || this.ended) {
    if(isError(this.ended))
      return this.sink.end(this.ended)

    while(this.buffer.length && !this.sink.paused)
      this.sink.write(this.buffer.shift())

    if(this.ended && this.buffer.length == 0 && !this.sink.paused)
      return this.sink.end(this.ended)

  }
  //in ./stream it called source.resume() here,
  //but this is not a transform stream.
  for(var i in this.subs) {
    if(this.sink.paused) return
    var sub = this.subs[i]
    if(sub.paused) sub.resume()
  }
}

