// @ts-ignore we should get types in here eventually...
import bencode from 'bencode';
import { Socket } from "net";
import { getLogger } from "./logger.js";
import { completedPieceCount, getPieceCount, hexdump } from "./utils.js";
import { METADATA_PIECE_SIZE } from './constants.js';

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

    /**
     * Here we will store the message_type number for 
     * the extensions supported, e.g. ut_metadata
     */
    private extendedMessageIdStringMap: Record<number, string>;
    /**
     * And in this we will store the reverse, i.e. to lookup
     * the extensionId for a certain extension 
     */
    private extendedMessageStringIdMap: Record<string, number>;

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

        this.extendedMessageIdStringMap = {};
        this.extendedMessageStringIdMap = {};
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
            // i.e. try and parse it.
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
            // consume the rest
            this.consumeMessage();
        } else {
            // console.log(`Recv Buffer: `, this.recvBuffer);
            this.consumeMessage();
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
            Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00]), // Support extensions
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

    /**
     * Technically, after the first 68 bytes of the handshake, the peer would
     * send a few more BitTorrent messages, such as:
     * 
     * 0x00 Choke
     * 0x01 Unchoke
     * 0x05 bitfield
     * 0x14 LTEP Handshake (Extensions)
     * 
     * TODO: More
     * 
     * This function will try and consume bittorrent messages from the recvBuffer
     * It will return if there is no complete message
     */
    async consumeMessage(){
        const logger = getLogger();
        logger.debug(`starting consumeMessage`);

        if (this.recvBuffer.length < 4) {
            logger.debug(`recvBuffer too small, need more data. (Len: ${this.recvBuffer.length})`);
            return;
        }

        const messageLen = this.recvBuffer.subarray(0, 4).readUInt32BE(0);
        logger.debug(`Message len is ${messageLen}`);

        // Check if we have at least messageLen more bytes in the recvBuffer
        if (this.recvBuffer.length < 4 + messageLen){
            logger.debug(`entire message not in recvBuffer!`);
            return;
        }

        // We have all of it
        const message = this.recvBuffer.subarray(4, 4 + messageLen);
        logger.trace(`Got message: ${hexdump(message)}`);

        const messageType: number = message[0];
        logger.debug(`Got message type: ${messageType}`);

        if (messageType === MessageTypes.Bitfield){
            const bitfield = new Bitifeld(message.subarray(1));
            logger.trace(`Raw bitfield: ${bitfield}`);
        } else if (messageType === MessageTypes.Extended){
            const extended = new Extended(message.subarray(1), this.extendedMessageStringIdMap, this.extendedMessageIdStringMap);
            // console.log(`Got extended: ${extended}`);

            if (extended.extensionType === ExtendedMessageTypes.Handshake){
                logger.info(extended.toString());
                logger.debug(`Received extended handshake, need to complete it...`);

                // update our extension maps
                this.extendedMessageIdStringMap = extended.supportedExtensionsReverse;
                this.extendedMessageStringIdMap = extended.supportedExtensions;
                
                // complete extended handshake
                const extensionHandshake = extended.extendedHandshakeMessage();

                // request metadata
                const msg = extended.requestMetadataMessage();

                const dump = Buffer.concat([extensionHandshake, msg]);
                this.client.write(dump);
            } else {
                logger.debug(`Recevied some other extension message.`);
            }

            
        } else if (messageType === MessageTypes.Unchoke){
            logger.info(`Unchoked by peer!`);
        } else {
            // Check in case it is one of the extended guys
            // TODO: Fix, all the extensions come under ID 0x14...
            const extendedMessageType = this.extendedMessageIdStringMap[messageType];

            if (extendedMessageType !== undefined){
                logger.warn(`Got an extended message: ${extendedMessageType}`);
            } else {
                logger.error(`Not handling message: ${messageType}`);
            }
        }

        // Remove the parsed message from the recvBuffer
        this.recvBuffer = this.recvBuffer.subarray(4 + messageLen);

        // Call again in case more stuff left
        this.consumeMessage();
    }

    async end(){
        await new Promise(r => setTimeout(r, 10000));
        this.client.end();
    }
}

enum MessageTypes {
    Choke = 0x00,
    Unchoke = 0x01,
    Bitfield = 0x05,
    Extended = 0x14,
};

type Message = {
    type: MessageTypes,
    raw: Buffer
}

class Bitifeld implements Message {
    type = MessageTypes.Bitfield;
    completed: number;

    constructor(public raw: Buffer){
        const logger = getLogger();
        this.completed = completedPieceCount(raw);
        let perc = (this.completed / (raw.length * 8)) * 100;
        logger.info(`Received bitfield. Approx ~${perc.toFixed(3)}% complete`);

    }

    toString(){
        return hexdump(this.raw);
    }
}

// TBD if we need this
// for now we just use it to store the enums
// but the value DOES NOT relate to the message id.
enum ExtendedMessageTypes {
    Handshake = 0x00,
    UtMetadata = 0x01, 
}

class Extended implements Message {
    type = MessageTypes.Extended;
    extensionType: ExtendedMessageTypes;
    data: any;
    metadataSize: number;
    clientName?: string;
    
    supportedExtensions: Record<string, number>
    supportedExtensionsReverse: Record<number, string>

    constructor(public raw: Buffer, supportedExtensions: Record<string, number>, supportedExtensionsReverse: Record<number, string>){
        const logger = getLogger();
        this.extensionType = raw[0];
        this.supportedExtensions = { ...supportedExtensions };
        this.supportedExtensionsReverse =  {...supportedExtensionsReverse };
        this.metadataSize = -1;

        const parsed = bencode.decode(raw.subarray(1));

        if (this.extensionType === ExtendedMessageTypes.Handshake){
            for (const key of Object.keys(parsed.m)){
                const value = parsed.m[key];
                logger.debug(`Got key=${key} with value=${value}`);
                this.supportedExtensions[key] = value;
            }
    
            if (parsed.v !== undefined){
                this.clientName = Buffer.from(parsed.v).toString();
                logger.info(`Client: ${this.clientName}`);
            }
    
            if (parsed.metadata_size !== undefined){
                this.metadataSize = parsed.metadata_size;
                logger.info(`Metadata size: ${this,this.metadataSize}`);
    
                /**
                 * TODO: Based on size, determine number of metadata pieces
                 * each piece must be 16KiB (except last one is smaller)
                 * 
                 * Allocate buffer, send requests, and wait for metadata to roll in.
                 */
    
                const pieceCount = getPieceCount(this.metadataSize, METADATA_PIECE_SIZE);
                logger.debug(`Metadata has ${pieceCount.pieceCount} pieces (Last piece size: ${pieceCount.lastPieceSize})`);
            }
            
            this.data = parsed;
        } else if (this.extensionType === this.supportedExtensions['ut_metadata']){
            logger.debug(`got ut_metadata message!`);
            console.log(`parsed data`, parsed);

            const bencodeLength = bencode.decode.position;
            const pieceData = raw.subarray(1 + bencodeLength);
            logger.debug(`Got ${pieceData.length} bytes of piece data.`);
        } else {
            logger.error(`Got some other extension type: ${this.extensionType}`)
            console.log(this.supportedExtensions);
        }
    }

    extendedHandshakeMessage(): Buffer {
        const payload = {
            m: {
                ut_metadata: this.supportedExtensions['ut_metadata']
            }
        };

        const bencoded = bencode.encode(payload);


        const extendedHandshake = Buffer.concat([
            Buffer.from([0x14, 0x00]), // Message ID=20 (extended), extension ID=0 (handshake)
            Buffer.from(bencoded),
        ]);

        const finalMessage = Buffer.concat([
            Buffer.from([0x00, 0x00, 0x00, 0x00]), // length prefix, we'll fill it later
            extendedHandshake,
        ]);

        finalMessage.writeUInt32BE(extendedHandshake.length, 0);

        return finalMessage;
    }

    requestMetadataMessage(): Buffer {
        const requestMetadataMessage = {
            msg_type: 0,
            piece: 0
        };

        const bencoded = bencode.encode(requestMetadataMessage);
        // console.log(`bencoded`, Buffer.from(bencoded).toString());

        // TODO: less hacky
        const bitTorrentMessage = Buffer.concat([
            Buffer.from([0x14, this.supportedExtensions['ut_metadata']]),
            Buffer.from(bencoded),
        ]);

        const messageLen = bitTorrentMessage.length;

        const finalMessage = Buffer.concat([
            Buffer.from([0x00, 0x00, 0x00, 0x00]), // length prefix, we'll fill it later
            bitTorrentMessage,
        ]);

        finalMessage.writeUInt32BE(messageLen, 0);

        return finalMessage;
    }

    toString(){
        return `Supported extensions: ${Object.keys(this.supportedExtensions).join(',')}`;
    }
}
