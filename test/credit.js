var test = require('tape')

var Mux = require('../')
var Values = require('push-stream/values')
var Async = require('push-stream/async')
var Collect = require('push-stream/collect')

  var array = []
  for(var i = 0; i < 100; i++) array.push(i)

function Pauser (N, onEnd) {
  return {
    output: [],
    paused: false,
    write: function (data) {
      if(this.paused) throw new Error('written while paused, output:'+output.length)
      this.output.push(data)
      if(!(this.output.length % N))
        this.paused = true
    },
    end: function (end) {
      this.ended = end || true
      console.log('PAUSER END')
      if(end === true) onEnd()
      else onEnd(end)
    },
    resume: function () {
      this.paused = false
      if(this.ended) throw new Error('already ended')
      this.source.resume()
    }
  }
}

function Log (name) {
  return {
    paused: true,
    write: function (data) {
      console.log(name, data)
      this.sink.write(data)
      this.paused = data.paused
    },
    end: function (err) {
      this.sink.end(err)
    },
    pipe: function (sink) {
      if(!sink) throw new Error('pipe needs sink')
      this.sink = sink; sink.source = this
      this.paused = sink.paused
      this.resume()
      return sink
    },
    resume: function () {
      this.source.resume()
    }
  }
}

function assert_lt(t, actual, expected) {
  t.ok(actual <= expected, actual + ' must be less than '+expected)
}

function Taker () {
  var n = 0, m = 0
  return {
    paused: false,
    buffer: [],
    write: function (data) {
      this.buffer.push(data)
    },
    end: function () {
    },
  }

}

test('test back pressure on client side', function (t) {
  var _stream
  var a = new Mux({credit: 10})
  var b = new Mux({
    credit: 10,
    onStream: function (stream, data) {
      _stream = stream
      stream.name = 'server'
    }
  })

  a.pipe(Log('a->b')).pipe(b).pipe(a)

  var values = new Values(array.slice())

  var as = a.stream('test')
  as.name = 'client'

  var pauser = Pauser(20, function () {
    console.log('END TEST')
    t.end()
  })

  values.pipe(_stream)
  as.pipe(pauser)

  assert_lt(t, values._i, 45)
  t.equal(pauser.output.length, 20)
  pauser.resume()
  assert_lt(t, values._i, 65)
  t.equal(pauser.output.length, 40)
  pauser.resume()
  assert_lt(t, values._i, 85)
  t.equal(pauser.output.length, 60)
  pauser.resume()
  assert_lt(t, values._i, 105)
  t.equal(pauser.output.length, 80)
  console.log("RESUME")
  pauser.resume()

})

test('test back pressure on server side', function (t) {
  var _stream
  var a = new Mux({credit: 10})
  var b = new Mux({
    credit: 10,
    onStream: function (stream, data) {
      _stream = stream
      stream.name = 'server'
    }
  })

  a.pipe(b).pipe(a)

  var pauser = Pauser(20, t.end)
  var values = new Values(array.slice())

  var as = a.stream('test')
  as.name = 'client'

  values.pipe(as)
  _stream.pipe(pauser)


  assert_lt(t, values._i, 40)
  t.deepEqual(pauser.output.length, 20)
  pauser.resume()
  assert_lt(t, values._i, 60)
  t.deepEqual(pauser.output.length, 40)
  pauser.resume()
  assert_lt(t, values._i, 80)
  t.deepEqual(pauser.output.length, 60)
  pauser.resume()
  assert_lt(t, values._i, 100)
  t.deepEqual(pauser.output.length, 80)
  pauser.resume()
})

test('test back pressure through echo server', function (t) {
  var _stream
  var a = new Mux({credit: 10})
  var b = new Mux({
    credit: 10,
    onStream: function (stream, data) {
      _stream = stream
      stream.name = 'server'
    }
  })

  a.pipe(b).pipe(a)

  var pauser = Pauser(20, t.end)
  var values = new Values(array.slice())

  var as = a.stream('test')
  as.name = 'client'

  _stream.pipe(_stream)
  values.pipe(as).pipe(pauser)

  assert_lt(t, as.credit, 45)
  assert_lt(t, _stream.writes, 45)
  assert_lt(t, _stream.reads, 35)
  t.deepEqual(pauser.output.length, 20)

  console.log('CREDIT as', as.credit, as.debit)
  console.log('CREDIT _stream', _stream.credit, _stream.debit)
  pauser.resume()

  assert_lt(t, values._i, 65)
  t.equal(pauser.output.length, 40)
  pauser.resume()
  assert_lt(t, values._i, 85)
  t.equal(pauser.output.length, 60)
  pauser.resume()
  assert_lt(t, values._i, 105)
  t.equal(pauser.output.length, 80)
  pauser.resume()

})








