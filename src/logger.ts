import { LOGLEVEL, Logger } from "@ckcr4lyf/logger"

export const getLogger = () => {
    return new Logger({loglevel: LOGLEVEL.DEBUG});
}