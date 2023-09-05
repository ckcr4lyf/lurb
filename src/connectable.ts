import { LOGLEVEL, Logger } from "@ckcr4lyf/logger"
import { Peer } from "./peer.js";

export const connectable = async(host: string, port: string, hash: string) => {
    const logger = new Logger({loglevel: LOGLEVEL.DEBUG});
    const peer = new Peer(host, parseInt(port));
    
    // This won't work, if the infohash isn't a valid torrent
    // Then most implementations will send FIN. Upto the user
    // to make sure the hash exists in BT
    await peer.handshake(Buffer.from(hash, "hex"));
    await peer.end();
}