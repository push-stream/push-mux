var Mux = require('../')
var Async = require('push-stream/async')
var Values = require('push-stream/values')
var Collect = require('push-stream/collect')
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
      t.equal(_value, value)
      cb(null, value*value)
    }
  })

  a.pipe(b).pipe(a)

  a.request(value, function (err, _value) {
    t.equal(_value, value*value)
    t.end()
  })

})


test('read source stream', function (t) {

  var a = new Mux()
  var b = new Mux({
    onStream: function (stream, opts) {
      new Values([1,2,3]).pipe(stream)
    }
  })

  a.pipe(b).pipe(a)

  var as = a.stream({})

  as.pipe(new Collect(function (err, ary) {
    t.notOk(err)
    t.deepEqual(ary, [1,2,3])
    t.end()
  }))

//  as.resume()
  console.log(as)
})

test('write sink stream', function (t) {

  var a = new Mux()
  var b = new Mux({
    onStream: function (stream, opts) {
      console.log(stream)

      stream.pipe(new Collect(function (err, ary) {
          t.notOk(err)
          t.deepEqual(ary, [1,2,3])
          t.end()
        }))
    }
  })

  a.pipe(b).pipe(a)

  new Values([1,2,3]).pipe(a.stream({}))
})

test('echo duplex stream', function (t) {

  var a = new Mux()
  var b = new Mux({
    onStream: function (stream, opts) {
      stream.pipe(stream)
    }
  })

  a.pipe(b).pipe(a)

  new Values([1,2,3])
    .pipe(a.stream({}))
    .pipe(new Collect(function (err, ary) {
        t.notOk(err)
        t.deepEqual(ary, [1,2,3])
        t.end()
      })
    )
})

test('abort source', function (t) {
  var _stream
  var a = new Mux()
  var b = new Mux({
    onStream: function (stream, opts) {
      _stream = stream
    }
  })

  a.pipe(b).pipe(a)

  var err = new Error('aborted')

  var as = a.stream({})
  as.pipe({
    end: function (_err) {
      t.ok(as.ended)
      t.equal(as.ended.message, err.message)
      t.equal(_err.message, err.message)
      t.end()
    }
  })

  _stream.abort(err)


})






