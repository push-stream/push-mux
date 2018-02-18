var Mux = require('../')

var json = {
  name: 'json',
  encode: function (e) {
    return JSON.stringify(e, null, 2) + '\n\n'
  },
  decode: function (e) {
    return JSON.parse(e)
  }
}

function noop () {}
function Null () {
  return {
    write: noop, end: noop, paused: false
  }
}

var test = require('tape')

module.exports = function (codec) {

  test(codec.name +': write encoded data to a stream and check that the output length matches the input', function (t) {

    var CREDIT = 5*1024
    var b = Mux({codec: codec, credit: CREDIT, onStream: function (_stream) { stream = _stream }})
    var a = Mux({codec: codec, credit: CREDIT})

    a.pipe(b).pipe(a)
    var as = a.stream({})
    var bs = stream

    while(!as.paused)
      as.write({random: Math.random(), time: Date.now() })
    t.ok(as.writes > CREDIT/2)
    t.ok(as.writes < CREDIT)
    t.equal(bs.reads, 0)
    bs.pipe(Null())
    t.notEqual(as.writes, 0)
    t.equal(bs.reads, as.writes)

    while(as.writes < CREDIT*2)
      as.write({random: Math.random(), time: Date.now() })
    t.equal(bs.reads, as.writes)

    t.end()
  })
}

module.exports(json)
module.exports(require('../../packet-stream-codec/codec'))


