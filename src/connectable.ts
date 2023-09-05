import { LOGLEVEL, Logger } from "@ckcr4lyf/logger"
import { Peer } from "./peer.js";

export const connectable = async(host: string, port: string) => {
    const logger = new Logger({loglevel: LOGLEVEL.DEBUG});
    const peer = new Peer(host, parseInt(port));
    
    await peer.handshake(Buffer.from(""));
}