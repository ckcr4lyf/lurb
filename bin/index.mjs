#!/usr/bin/env node

import { Command } from 'commander';
import { Logger, LOGLEVEL } from '@ckcr4lyf/logger';
import { connectable } from '../build/src/connectable.js';

const logger = new Logger({ loglevel: LOGLEVEL.DEBUG });

const program = new Command();

program.command('handshake').description('Check if your client is connectable, and perform a handshake for a given infohash')
.requiredOption('-h, --host <host>', 'Host / IP address of the client')
.requiredOption('-p, --port <port>', 'Port the client is listening on')
.requiredOption('-i, --infohash <infohash>', 'Infohash of a torrent on the client (as 40 character hex string)')
.action(async (options) => {
    logger.debug(`Called with host=${options.host}, port=${options.port}`);
    await connectable(options.host, options.port, options.infohash);
});

program.parse();
