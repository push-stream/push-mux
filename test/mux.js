
var test = require('tape')

var Mux = require('../')

test('simple', function (t) {

  var value = Math.random()

  var a = new Mux ()
  var b = new Mux ({
    onRequest: function (_value, cb) {
      t.equal(_value, value)
      cb(null, _value)
    }
  })

  a.pipe(b).pipe(a)

  a.request(value, function (err, _value) {
    t.equal(_value, value)
    t.end()
  })

})

