// @ts-ignore
import bencode from 'bencode';

export const getMetadataRequestMessage = (extendedMessageId: number, piece: number): Buffer => {
    const request = {
        msg_type: 0, // 0 = request for metadata
        piece: piece,
    }

    const bencodedRequest = Buffer.from(bencode.encode(request));

    const message = Buffer.concat([
        // 4 byte length prefix (to fill), 0x14 for extended, and then client-specific messageId for metadata
        Buffer.from([0x00, 0x00, 0x00, 0x00, 0x14, extendedMessageId]),
        bencodedRequest,
    ]);

    // add two for the two messageIds.
    message.writeUInt32BE(bencodedRequest.length + 2, 0);
    
    return message;
}