import { Socket } from "net";
import { getLogger } from "./logger.js";

export class Peer {

    private peerId: Buffer;
    private client: Socket;

    constructor(private host: string, private port: number){
        const logger = getLogger();
        this.peerId = Buffer.from("-BTTEST-123456789ABC");
        this.client = new Socket();

        this.client.on('error', (e) => {
            logger.error(`Error on socket: ${e}`);
        });
    }

    async handshake(infohash: Buffer){
        const logger = getLogger();
        logger.info(`Connecting to ${this.host}:${this.port},,,`);

        const connectPromise = new Promise((resolve, reject) => {
            this.client.once('error', (e) => {
                reject(e);
            });

            this.client.connect(this.port, this.host, () => {
                logger.info(`Connected to ${this.host}:${this.port}! (TCP Connection success)`);
                resolve(undefined);
            });
        })

        try {
            await connectPromise;
        } catch (e){
            logger.error(`Failed to connect: ${e}`);
        }
    }
}