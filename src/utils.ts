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