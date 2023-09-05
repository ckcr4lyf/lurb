import { Socket } from "net";
import { getLogger } from "./logger.js";

type Resolver = {
    resolve: () => undefined,
    reject: () => undefined,
};

enum PeerStatus {
    IDLE = 0,
    HANDSHAKING = 1,
}

export class Peer {
    private peerId: Buffer;
    private client: Socket;
    private resolver: Resolver;
    private status: PeerStatus;

    private infohash: Buffer;

    /**
     * Whether there is a request in progress - other stuff should not be called
     */
    private busy: boolean;

    /**
     * recvBuffer for the current request
     */
    private recvBuffer: Buffer;

    constructor(private host: string, private port: number){
        const logger = getLogger();
        // this.status = PeerStatus.IDLE;
        this.status = PeerStatus.HANDSHAKING;
        this.peerId = Buffer.from("-BTTEST-123456789ABC");
        this.client = new Socket();
        this.infohash = Buffer.alloc(0, 0x00);

        this.client.on('error', (e) => {
            logger.error(`Error on socket: ${e}`);
        });

        this.resolver = {
            resolve: () => undefined,
            reject: () => undefined,
        };

        this.client.on('data', (data) => {
            this.handleRecv(data);
        });

        this.busy = false;

        this.recvBuffer = Buffer.alloc(0, 0x00);
    }

    handleRecv(data: Buffer){
        this.recvBuffer = Buffer.concat([this.recvBuffer, data]);
        console.log(this.recvBuffer);
        if (this.status === PeerStatus.HANDSHAKING){
            // A handshake reply should be at least 68 bytes(?)
            // TODO: Parse/ handle.
        }
    }

    async handshake(infohash: Buffer){
        const logger = getLogger();
        this.status = PeerStatus.HANDSHAKING;
        this.infohash = infohash;
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

        const handshakeMessage = Buffer.concat([
            Buffer.alloc(1, 0x13),
            Buffer.from("BitTorrent protocol"),
            Buffer.alloc(8, 0x00),
            infohash,
            this.peerId,
        ]);

        this.client.write(handshakeMessage);
    }
}