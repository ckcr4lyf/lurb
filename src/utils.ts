export const hexdump = (data: Buffer): string => {
    const hexString = data.toString('hex');
    const len = hexString.length;

    let output = `[`;
    for (let i = 0; i < len-2; i+= 2){
        output += `0x${hexString.substring(i, i+2).toLocaleUpperCase()}` + `, `;
    }

    output += `0x${hexString.substring(len-2, len).toLocaleUpperCase()}]`;
    return output;
}

// number of bits set in a particular nibble
// e.g. 0x3 = 0b0101 = two bits set
// thanks https://stackoverflow.com/a/25808559
export const NIBBLE_LOOKUP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]

/**
 * Checks how many pieces you have out of the total
 * 
 * Since we don't know how many pieces there are in total, we assume
 * it is bitfield.length * 8
 * But of course, if there is only one piece, it would still need a whole byte to carry the bitfield
 * for 0b1000_0000 (aka 0x80)
 * 
 * so the variance in length is a max of 7 pieces
 * but of course, if any of those bits are non-zero,
 * then it must actually be there.
 */
export const completedPieceCount = (bitfield: Buffer): number => {
    let completed = 0

    for (let i = 0; i < bitfield.length; i++){
        completed += NIBBLE_LOOKUP[bitfield[i] & 0x0F] // lower 4 bits
        completed += NIBBLE_LOOKUP[bitfield[i] >> 4]; // upper 4 bits
    }
    
    return completed;
}
