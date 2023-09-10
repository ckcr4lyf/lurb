# lurb

lurb is a utility for testing BitTorrent clients.

Useful if you want to check your port-forwarding or similar, or just to send arbitrary handshakes and see if a peer has a torrent.

## Installation

With npm:

```
npm i -g lurb
```

## Supported Features

### Connecting to a peer via TCP and performing a handshake

```
lurb -i ab6ad7ff24b5ed3a61352a1f1a7811a8c3cc6dde -a 127.0.0.1:6969
```

# Thanks

Thanks to [Bram Cohen](https://github.com/bramcohen) for the initial BitTorrent specification, and [Arvid Norberg](https://github.com/arvidn) for his amazing work on [libtorrent](https://github.com/arvidn/libtorrent).

Also thanks to gl0ryus for suggesting the name of this project.
