

//create a pair of source/sink
//with api for calling and being called.
var Sink = require('./sink')
var Source = require('./source')

module.exports = Mux

function Mux (opts) {
  this.onRequest = opts && opts.onRequest
  //should on stream handle source, sink, duplex separately?
  this.onStream = opts && opts.onStream
  this.source = new Source()

  this._nextCb = 0
  this._cbs = {}

  this.sink = new Sink()

  var self = this
  //closure: memory problems.
  this.sink.onRequest = function (data) {
    console.log('on Req', data)
    if(data.req < 0) {
      var cb = self._cbs[data.req*-1]
      delete self._cbs[data.req*-1]
      if(!cb) return
      if(data.end) cb(data.value)
      else cb(null, data.value)
    }
    else if(data.req > 0) { //a request from remote
      self.onRequest(data.value, function (err, value) {
        //this will hold a reference to `data` which isn't
        //necessary. rewrite to only reference the number!
        self.source._write({
          req: -data.req,
          value: err ? flatten(err) : value,
          stream: false
        })
      })
    }
  }
}

Mux.prototype.request = function (value, cb) {
  var req = ++this._nextCb
  this._cbs[req] = cb
  this.source._write({
    req: req, value: value, stream: false
  })
}

Mux.prototype.pipe = function (sink) {
  return this.source.pipe(sink.sink), sink
}


