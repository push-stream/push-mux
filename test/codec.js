var Mux = require('../')

var json = {
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

test('write encoded data to a stream and check that the output length matches the input', function (t) {

  var CREDIT = 5*1024
  var b = Mux({codec: json, credit: CREDIT, onStream: function (_stream) { stream = _stream }})
  var a = Mux({codec: json, credit: CREDIT})

  a.pipe(b).pipe(a)
  var as = a.stream({})
  var bs = stream

  while(!as.paused)
    as.write({random: Math.random(), time: Date.now() })
  t.ok(as.writes > CREDIT/2)
  t.ok(as.writes < CREDIT)
  console.log(bs.buffer)
  t.equal(bs.reads, 0)
  bs.pipe(Null())
  t.notEqual(as.writes, 0)
  t.equal(bs.reads, as.writes)

  while(as.writes < CREDIT*2)
    as.write({random: Math.random(), time: Date.now() })
  t.equal(bs.reads, as.writes)

  t.end()
})

test('write encoded data to a stream and check that the output length matches the input', function (t) {

  var CREDIT = 5*1024
  var b = Mux({codec: json, credit: CREDIT, onStream: function (_stream) { stream = _stream }})
  var a = Mux({codec: json, credit: CREDIT})

  a.pipe(b).pipe(a)
  var bs = a.stream({})
  var as = stream

  while(!as.paused)
    as.write({random: Math.random(), time: Date.now() })

  t.ok(as.writes > CREDIT/2)
  t.ok(as.writes < CREDIT)
  console.log(bs.buffer)
  t.equal(bs.reads, 0)
  bs.pipe(Null())
  t.notEqual(as.writes, 0)
  t.equal(bs.reads, as.writes)

  while(as.writes < CREDIT*2)
    as.write({random: Math.random(), time: Date.now() })
  t.equal(bs.reads, as.writes)

  t.end()
})


