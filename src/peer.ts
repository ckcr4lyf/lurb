import { Socket } from "net";
import { getLogger } from "./logger.js";

type Resolver = {
    resolve: (v: unknown) => void,
    reject: (e?: any) => void,
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
        const logger = getLogger();

        this.recvBuffer = Buffer.concat([this.recvBuffer, data]);
        // console.log(this.recvBuffer);

        if (this.status === PeerStatus.HANDSHAKING){
            // A handshake reply should be at least 68 bytes(?)
            if (this.recvBuffer.length < 68){
                return;
            }

            // Make sure it is a legit handshake
            const potentialHandshake = this.recvBuffer.subarray(0, 68);
            if (potentialHandshake[0] !== 0x13){
                logger.error(`First byte not 0x13, dodgy!`);
                this.resolver.reject(new Error("INVALID_HANDSHAKE"));
            }

            if (Buffer.compare(potentialHandshake.subarray(1, 20), Buffer.from("BitTorrent protocol")) !== 0){
                logger.error(`Did not receive "BitTorrent protocol" in Handshake message, dodgy!`);
                this.resolver.reject(new Error("INVALID_HANDSHAKE"));
            }

            const extensions = potentialHandshake.subarray(20, 28);
            const infohash = potentialHandshake.subarray(28, 48);
            const peerId = potentialHandshake.subarray(48, 68);

            if (Buffer.compare(infohash, this.infohash) !== 0){
                logger.error(`Did not receive expected infohash!`);
                this.resolver.reject(new Error("INVALID_HANDSHAKE"));
            }

            logger.debug(`Received peerId: ${peerId.toString()}`);
            this.recvBuffer = this.recvBuffer.subarray(68);
            this.status = PeerStatus.IDLE;
            this.resolver.resolve(undefined);
        } else {
            console.log(`Recv Buffer: `, this.recvBuffer);
        }
    }

    async handshake(infohash: Buffer){
        const logger = getLogger();
        this.status = PeerStatus.HANDSHAKING;
        this.infohash = infohash;
        logger.debug(`Connecting to ${this.host}:${this.port},,,`);

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

        const handshakePromise = new Promise((resolve, reject) => {
            this.resolver = { resolve , reject };
        });

        logger.debug(`Going to send handshake`);
        this.client.write(handshakeMessage);

        logger.debug(`Going to wait for reply`);

        try {
            await handshakePromise;
            logger.info(`Recevied handshake! (Success)`);
        } catch (e){
            logger.error(`Failed to handshake: ${e}`);
        }
    }

    async end(){
        this.client.end();
    }
}