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
      if(end === true) onEnd()
      else onEnd(end)
    },
    resume: function () {
      this.paused = false
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
  t.ok(actual < expected, actual + ' must be less than '+expected)
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

test('test credit signals on writes', function (t) {

  var a = new Mux({credit: 10})

  var taker = Taker()

  a.pipe(taker) //.pipe(a)

  //setup control stream
  a.write({req: 1, value: 'control', stream: true, end: false})

  var as = a.stream()

  t.notOk(as.paused)
  for(var i = 0; i < 5; i++) {
    t.notOk(as.paused)
    as.write('a'+i)
  }
  console.log(as)
  t.ok(as.paused)

  //give 10 credits
  a.write({req: 1, value: [-2, 10], stream: true, end: false})

  console.log(taker.buffer)

  //this should unpause AS.
  t.equal(as.paused, false)

  for(var i = 0; i < 10; i++) {
    t.equal(as.paused, false)
    as.write('b'+i)
  }
  t.equal(as.paused, true)
  t.equal(as.writes, 15)
  t.equal(as.credit, 10)
  t.equal(as.reads, 0)

  console.log(taker.buffer)

  t.end()
})

test('test credit signals on reads', function (t) {

  var a = new Mux({credit: 10})

  var pauser = Pauser(5, function (){})
  var taker = Taker()

  a.pipe(taker) //.pipe(a)

  //setup control stream
  a.write({req: 1, value: 'control', stream: true, end: false})

  var as = a.stream()
  pauser.paused = true
  as.pipe(pauser)

  t.equal(pauser.paused, true)
  pauser.resume()

  for(var i = 0; i < 5; i++) {
    t.equal(taker.buffer.length, 2)
    a.write({req: -2, value: i+1, stream: true, end: false})
  }

  t.equal(as.reads, 5)

  t.equal(taker.buffer.length, 3)
  t.equal(taker.buffer[2].value[0], 2)
  t.equal(taker.buffer[2].value[1], 15)

  console.log(taker.buffer)

  t.end()

})

test('test credit signals on echo server', function (t) {
  var _stream
  var a = new Mux({
    credit: 10,
    onStream: function (stream, name) {
      _stream = stream
      stream.name = name
      t.equal(name, 'stream')
      stream.pipe(stream)
    }
  })

  var pauser = Pauser(5, function (){})
  var taker = Taker()

  a.pipe(taker)

  a.write({
    req: 1, stream: true, end: false, value: 'control'
  })

  a.write({
    req: 2, stream: true, end: false, value: 'stream'
  })

  for(var i = 0; i < 5; i++)
    a.write({
      req: 2, stream: true, end: false, value: 'a'+i
    })

  t.equal(_stream.paused, true)

  console.log(taker.buffer)

  a.write({
    req: 1, stream: true, end: false, value: [2, 10]
  })


  t.equal(_stream.paused, false)

  for(var i = 0; i < 5; i++)
    a.write({
      req: 2, stream: true, end: false, value: 'b'+i
    })

  console.log(taker.buffer)

  t.end()

})

test('credit signals on peer that does not support flow control', function (t) {

  var a = new Mux({credit: 10})

//  var pauser = Pauser(5, function (){})
  var taker = Taker()

  a.pipe(taker) //.pipe(a)

  var as = a.stream()

  //before A knows wether it's remote supports flow control,
  //it assumes that it does.
  for(var i = 0; i < 5;i++) {
    t.equal(a.paused, false)
    as.write('a'+i)
  }
  t.equal(as.paused, true)

  a.write({
    req: -1, stream: true, end: true, value: {}
  })

  t.equal(as.credit, -1)

  t.equal(as.paused, false)

  for(var i = 0; i < 100; i++) {
    t.equal(as.paused, false)
    as.write('b'+i)
  }

  taker.paused = true
  //console.log(a)
  as.write('c')
  t.equal(as.paused, true)

  //-1 credit should also apply on newly created streams

  var as2 = a.stream()

  t.equal(as2.credit, -1)
  t.equal(as2.paused, false)

  t.end()
})


test('control stream sends end acknowledgement to peer that does not support cbfc', function (t) {
  var a = new Mux({credit: 10})

  var taker = Taker()

  a.pipe(taker) //.pipe(a)
  
  t.deepEqual(taker.buffer, [{req: 1, stream: true, end: false, value: 'control'}])
  a.write({req:-1, stream: true, end: true, value: {}})
  t.deepEqual(taker.buffer[1], {req: 1, stream: true, end: true, value: true})
  t.end()
})



