import { LOGLEVEL, Logger } from "@ckcr4lyf/logger"

let defaultLogLevel: LOGLEVEL = LOGLEVEL.INFO;

export const updateLogLevel = (loglevel: LOGLEVEL) => {
    defaultLogLevel = loglevel;
}

export const getLogger = () => {
    // return new Logger({loglevel: LOGLEVEL.DEBUG});
    return new Logger({loglevel: defaultLogLevel});
}


