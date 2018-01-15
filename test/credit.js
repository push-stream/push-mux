
var test = require('tape')

var Mux = require('../')
var Values = require('push-stream/values')
var Async = require('push-stream/async')
var Collect = require('push-stream/collect')

test('take 10 out of 100 items, then pause', function (t) {

  var array = [], _stream
  for(var i = 0; i < 100; i++) array.push(i)

  var a = new Mux({})
  var b = new Mux({
    onStream: function (stream, data) {
      _stream = stream
      stream.name = 'server'
    }
  })

  a.pipe(b).pipe(a)

  var output = []

  var as = a.stream('test')
  as.name = 'client'
  as
    .pipe(new Async(function (data, cb) {
      setTimeout(function () {
        t.ok(as.buffer.length <= 10, 'buffer length should be under 10, was:'+as.buffer.length)
        cb(null, data)
      }, 50)
    }))
//    .pipe(new Collect(function (err, ary) {
//      t.equal(ary.length, 100)
//      t.end()
//    }))

  .pipe({
    paused: false,
    write: function (data) {
      output.push(data)
      console.log('received', data, output.length)
    },
    end: function () {
      console.log(output)
      t.end()
    }
  })

  new Values(array.slice()).pipe(_stream)

  console.log(output, as.buffer)

})


