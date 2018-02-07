## draft spec for credit-based-flow-control extention of MUXRPC protocol

the current muxrpc implementation multiplexes streams, but
does not provide back pressure of any kind. This proposal
adds an extention to muxrpc, which adds "credit based" flow control.
A control stream (a sink stream created from each peer) sends
"credit" to the other side, on a per stream basis.

When muxrpc peers write to a stream it uses up "credit",
and when that credit is runs out they may not
write more until more credit is given, enabling back pressure.

This proposal does not require any breaking changes to the wire
protocol, and clients that implement CBFC will fallback
to uncontroled flows with non-implementing peers.

### initializing the control stream

After initializing the muxrpc stream, but before any other messages
are sent, a substream for the purposes of controlling the flow
of streams heading towards this side is sent.

the raw packet, represented as js object would look like this:

``` js
{
  req: 1, stream: true, end: false,
  value: 'control'
}
```

since it is the first message sent, the `req` will be 1.
the body of this packet is the string `"control"`.

If the remote peer does not support credit-based-flow-control
then it will respond with an error (defacto behavior in current
implementations)

``` js
{
  req: -1, stream: true, end: true,
  value: ...
}
```

The value of the error should be non-null but should not be enforced
by CBFC implementors.

If the remote peer does support CBFC then it will send the same
packet to initialize it's control stream. (it's also `req:1` because
request numbers are relative to the sender)

``` js
{
  req: 1, stream: true, end: false,
  value: 'control'
}
```

### sending credit

Each protocol instance is initialized with a `credit` configuration.
This controls the amount of data that may be written to a muxrpc
stream at a time, until the remote peer gives more credit.

To credit the remote peer, a message is sent in the control stream.
in js object:
``` js
{
  req: 1, stream: true, end: false,
  value: [-2, 20, ...]
}
```

The credit is expressed as a javascript array of integers,
each even index starting from zero is a stream id, and each odd
index is a credit amount allocated to that stream id.
Thus the above credit message allocates 20 units of credit
to the stream `id=2`. (which is the first next stream created
after the control stream)
If we have already sent say, 7 messages, then that means you are credited to send 13 more.

> The current implementation only sends a single pair, but it can
receive many pairs at once. A json array is used because that
will enable easy translation to a binary representation.

Instead of waiting a round trip to receive initial credit,
peers may assume they have an overdraft of `credit/2`, and
start sending immediately. When the current credit is used up,
writes to that substream should stop until more credit is received.

> note that this proposal does not limit the rate that new streams
are created, or async requests.

In the messages mode (used for testing and dev) each packet
uses one unit of credit. In encoded mode, the unit of credit
is the byte, and writing a packet uses as many credits as it's
byte length _including muxrpc framing_ (which adds 9 bytes, using
[packet-stream-codec](https://github.com/dominictarr/packet-stream-codec))

CBFC control streams do not use credit themselves. Nor do they
expect to receive packets (except an error/end packet in the case
the remote peer does not support CBFC). Any response packets
should be ignored (this enables them to be used in some future extention)


