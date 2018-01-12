var Mux = require('../')
var Async = require('push-stream/async')
var test = require('tape')

function log (name) {
  return new Async(function (data, cb) {
    console.log(name, data)
    cb(null, data)
  })
}

test('request', function (t) {

  var value = Math.random()
  var a = new Mux()
  var b = new Mux({
    onRequest: function (_value, cb) {
      console.log('onRequest', _value, cb)
      t.equal(_value, value)
      cb(null, value*value)
    }
  })

  a
    //.pipe(log('ab'))
    .pipe(b)
    //.pipe(log('ba'))
    .pipe(a)
//    .resume()

  a.request(value, function (err, _value) {
    t.equal(_value, value*value)
    t.end()
  })

  console.log(a)
})



