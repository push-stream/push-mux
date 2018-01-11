var Source = require('../source')
var Sink = require('../sink')

var test = require('tape')

test('simple source->sub-sinks', function (t) {

  var source = new Source()
  var sink = {
    output: [],
    paused: false,
    write: function (d) {
      this.output.push(d)
    },
    end: function () {
      this.ended = err || true
    }
  }
  source.pipe(sink)

  var sub1 = source.createStream()

  sub1.write('hello')

  t.deepEqual(sink.output, [{req: 1, stream: true, value: 'hello'}])

  sub1.end()

  t.deepEqual(sink.output, [{req: 1, stream: true, value: 'hello'}, {req: 1, stream: true, end: true}])


  t.end()

})

test('simple sub-sources->sink', function (t) {

  var sink = new Sink()
  var source1 = sink.createStream()

  sink.write({req:1, stream: true, value: 'hello'})

  t.deepEqual(source1.buffer, ['hello'])
  t.end()

})

test('new stream sub-sources->sink', function (t) {

  var sink = new Sink()
//  var source1 = sink.createStream()

  var source1
  sink.onStream = function (_source1) {
    console.log('received', _source1)
    source1 = _source1
  }

  sink.write({req:-1, stream: true, value: 'hello'})
  t.deepEqual(source1.buffer, ['hello'])
  t.end()

})

