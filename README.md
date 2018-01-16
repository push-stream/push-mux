# push-mux

multiplexed-rpc (compat with [muxrpc](https://github.com/ssbc/muxrpc)) with credit based flow control.

## background

I had originally wanted to have [muxrpc](https://github.com/ssbc/muxrpc) support back pressure,
but at the time it was _too hard_ and ended up moving forward
without it. This caused various problems (such as using way too
much resources which is what you'd expect from no backpressure!),
and was met with various work arounds. Instead of building in
pull-streams, I made a very simple stream primitive (that i called
"weird streams" so you knew it was a bad idea). With this we
implemented [packet-stream](https://github.com/ssbc/packet-stream),
which is wrapped by `muxrpc`.

Now it's 2018 and I'm trying to get [secure-scuttlebutt](https://github.com/ssbc/secure-scuttlebutt/)
replication working very efficiently, so need back pressure.
I revisited _weird-streams_ and thought about how they could
be made to have back pressure, resulting in [push-stream](https://github.com/dominictarr/push-stream)
which turned out _very good_. (push streams seem to take a little
more code to implement than pull-streams) but they also seem
easier to think about. (and less async, which tended to be the hard part!)

## back pressure

Inspiration for this thing more or less came from
martin sustrik's blog post [TCP and heartbeats](http://250bpm.com/blog:22),
which outlines a simple [flow control](https://en.wikipedia.org/wiki/Flow_control_(data)) scheme called "credit based flow control",
(not to be confused with [control flow](https://en.wikipedia.org/wiki/Control_flow))

In particular, he says that there has been a real low level protocol
that implements multiplexing with back pressure (SCTP), but the world is
stuck with TCP. so we end up reimplementing tcp on top of tcp.

> What happens is that developers are not aware of SCTP.
> That admins are not fond of having non-TCP packets on the network.
> That firewalls are often configured to discard anything other than
> TCP or UDP. That NAT solutions sold by various vendors are not
> designed to work with SCTP. And so on, and so on.

> In short, although designers of the Internet cleverly split the
> network layer (IP) from transport layer (TCP/UDP) to allow
> different transports for users with different QoS requirements,
> in reality — propelled by actions of multitude of a-bit-less-clever
> developers — the Internet stack have gradually fossilised, until,
> by now, there is no realistic chance of any new L4 protocol gaining
> considerable traction.

> So, while re-implementing TCP functionality on top of TCP may
> seem like a silly engineering solution when you look at it with
> narrow mindset, once you accept that Internet stack is formed by
> layers of gradually fossilising protocols, it may actually be the
> correct solution, one that takes political reality into consideration
> as well as technical details.

Indeed! and while [nanomsg](http://nanomsg.org/) is mainly concerned
with applications running in a data center, and where just using
lots of TCP connections directly is a reasonable option, and that
[multiplexing isn't usually actually worth it](http://250bpm.com/blog:18)

I am more interested in p2p protocols were we must take any
opportunity to connect two peers we can get - this means operating
over connections that have a lot more overhead: _websockets_,
_webrtc_, _tor_, and even if our connections are TCP they are
over the public internet and theirfore require encryption, which
adds several roundtrips to the handshake!

Also, all these other protocol layers we need to work with have
their own quirks - adding another multiplexing layer allows us
to work with one simple thing, as Martin Sustrik says:

> And hopefully, at some point, when everbody have already migrated
> to some future TCP-on-top-of-TCP-on-top-of-TCP-on-top-of-TCP-on-top-of-TCP
> protocol, we can create a shotcut and get rid of those
> good-for-nothing intermediate layers.

## License

MIT








