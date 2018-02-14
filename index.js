var inherits = require('inherits')
var Sub = require('./sub')
var DuplexStream = require('./stream')

function isError (end) {
  return end && end !== true
}

function isFunction (f) {
  return 'function' == typeof f
}

function flatten (err) {
  return {
    error: true, message: err.message
  }
}

//default codec is just nothing

function id (v) {
  return v
}
var codec = {
  encode: id, decode: id, type: 'id'
}

module.exports = Mux

inherits(Mux, DuplexStream)

var i = 0

function Mux (opts) {
  if(!(this instanceof Mux)) return new Mux(opts)
  this.id = ++i
  this.cbs = {}
  this.subs = {}
  this.nextId = 0
  this.options = opts || {}
  this._codec = this.options.codec || codec
  DuplexStream.call(this)
  this.paused = false

  this.options.credit = this.options.credit

  //TODO: ensure this is something that current muxrpc would ignore
  this.control = {}
  if(this.options.credit)
    this.controlStream = this.stream('control')
}

Mux.prototype.stream = function (opts) {
  var id = ++this.nextId
  var sub = new Sub(this, id)
  this.subs[id] = sub
  this._write(this._codec.encode({req: id, value: opts, stream: true, end: false}))
  return sub
}

Mux.prototype.request = function (opts, cb) {
  if(this.ended)
    return cb(new Error('push-mux stream has ended'))

  var id = ++this.nextId
  if(!isFunction(cb)) throw new Error('push-mux: request must be provided cb')
  this.cbs[id] = cb
  this._write(this._codec.encode({req: id, value: opts, stream: false}))
  return id
}

Mux.prototype.message = function (value) {
  this._write({req: 0, stream: false, end: false, value: value})
}

function writeDataToStream(data, sub) {
  if(data.end) {
    if(sub.ended) //if it's already ended we can clear this out.
      delete sub.parent.subs[sub.id]
    sub._end(data.value)
  }
  else
    sub._write(data.value)
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
  var length = data.length || 1
  data = this._codec.decode(data)
  data.length = length
  if(data.req == 0)
    this.options.onMessage && this.options.onMessage(data)
  else if(!data.stream) {
    if(data.req > 0 && this.options.onRequest)
      this.options.onRequest(data.value, this._createCb(data.req))
    else if(data.req < 0 && this.cbs[-data.req]) {
      var cb = this.cbs[-data.req]
      delete this.cbs[-data.req]
      cb(data.end ? data.value : null, data.end ? null : data.value)
    }
  }
  else if(data.stream) {
    if(data.req === 1 && data.value === 'control') {
      //this.hasFlowControl = true
      if(!this.options.credit) {
        this._write(this._codec.encode({
          req: -1, stream: true, end: true, value: {
            error: true, message: 'flow-control not supported'
          }
        }))
      }
      else {
        var sub = this.subs[-data.req] = new Sub(this, -data.req)
        sub._write = function (data) {
          if(Array.isArray(data)) {
            for(var i = 0; i < data.length; i+=2) {
              var sub = this.parent.subs[-data[i]]
              //note, sub stream may have ended already, in that case ignore
              if(sub) {
                sub.credit = data[i+1]
                if(sub.paused) {
                  if(sub.credit + this.parent.options.credit >= sub.writes) {
                    sub.paused = false //resume()
                    if(sub.source) sub.source.resume()
                  }
                }
              }
            }
          }
        }
      }
    }
    //if we are running credit-based-control-flow, but the other
    //end isn't then disable it from here on.
    else if(data.req === -1 && data.end && this.controlStream) {
      this.controlStream = null
      for(var i in this.subs) {
        var sub = this.subs[i]
        sub.credit = -1
        if(sub.paused) {
          sub.paused = false
          if(sub.source) sub.source.resume()
        }
      }
      this._write(this._codec.encode({
        req: 1, stream: true, end: true, value: true
      }))
    }
    else {
      var sub = this.subs[-data.req] //TODO: handle +/- subs
      if(sub) writeDataToStream(data, sub)
      //we received a new stream!
      else if (data.req > 0 && this.options.onStream) {
        var sub = this.subs[-data.req] = new Sub(this, -data.req)
        this.options.onStream(sub, data.value)
      }
      else
        console.error('ignore:', data)
      //else, we received a reply to a stream we didn't make,
      //which should never happen!
    }
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
  if(this.options.onClose) this.options.onClose(err)
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
  for(var i in this.subs) {
    if(this.sink.paused) return
    var sub = this.subs[i]
    if(sub.paused) sub.resume()
  }
}

Mux.prototype._credit = function (id) {
  var sub = this.subs[id]
  if(sub && (this.control[id]|0) + (this.options.credit/2) <= (sub.reads)) {
    var credit = this.control[id] = sub.reads + this.options.credit
    //skip actually writing this through
    //inject credit directly into the main stream
    //(because the control stream doesn't need back pressure)
    this._write(this._codec.encode({
      req: this.controlStream.id, stream: true, end: false,
      value: [id, credit]
    }))
  }
}

Mux.prototype.abort = function (err) {
  if(this.ended) return
  this.ended = err || true
  if(this.source)
    this.source.abort(err)
  this.end(err)
}


