var test = require('tape')
var Values = require('push-stream/values')
var Collect = require('push-stream/collect')

var Mux = require('../')

function step () {
  return {
    paused: true,
    write: function (data) {
      this.sink.write(data)
      this.paused = true
    },
    end: function (err) {
      this.sink.end(err)
    },
    resume: function () {
      this.paused = false
      this.source.resume()
    },
    pipe: function (sink) {
      this.sink = sink
      sink.source = this
      return sink
    }
  }
}

test('backpressure', function (t) {
  var source = new Values([1,2,3])
  var sink = new Collect(function () {})
  var streams = 0
  var types = {
    source: function (stream) {
      source.pipe(stream)
    },
    sink: function (stream) {
      stream.pipe(sink)
    },
    duplex: function (stream) {
      stream.pipe(stream)
    }
  }

  var a = new Mux ({})
  var b = new Mux ({
    onStream: function (stream, type) {
      streams ++
      console.log('onStream', type, streams)
      return types[type](stream)
    }
  })


  var src = a.stream('source')
  var snk = a.stream('sink')
  var dpx = a.stream('duplex')


  var s = step()
  a.pipe(s).pipe(b).pipe(a)

  t.deepEqual(src.buffer, [])

  t.equal(streams, 0)

  s.resume() //let one data item through...
  t.equal(streams, 1)
  s.resume() //let one data item through...
  t.equal(streams, 2)
  s.resume() //let one data item through...
  t.equal(streams, 3)

  t.equal(s.paused, true)
  dpx.write('echo?')
  t.equal(dpx.paused, true)
  t.deepEqual(dpx.buffer, [])
  s.resume() //let one data item through...
  t.deepEqual(dpx.buffer, ['echo?'])

  t.end()
})

