#!/usr/bin/env node

import { Command } from 'commander';
import { Logger, LOGLEVEL } from '@ckcr4lyf/logger';
import { connectable } from '../build/src/connectable.js';

const logger = new Logger({ loglevel: LOGLEVEL.DEBUG });

const program = new Command();

program.command('handshake').description('Check if your client is connectable, and perform a handshake for a given infohash')
.requiredOption('-a, --address <address>', 'Host / IP address & port of the client (e.g. 127.0.0.1:1337)')
.requiredOption('-i, --infohash <infohash>', 'Infohash of a torrent on the client (as 40 character hex string)')
.option('-v', 'Verbose logging')
.option('-vv', 'Trace logging')
.action(async (options) => {
    let loglevel = LOGLEVEL.INFO

    if (options.v === true){
        loglevel = LOGLEVEL.DEBUG;
    }

    if (options.Vv === true){
        loglevel = LOGLEVEL.TRACE;
    }

    await connectable(options.address, options.infohash, loglevel);
});

program.parse();
