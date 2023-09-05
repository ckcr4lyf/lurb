#!/usr/bin/env node

import { Command } from 'commander';
import { Logger, LOGLEVEL } from '@ckcr4lyf/logger';
import { connectable } from '../build/src/connectable.js';

const logger = new Logger({ loglevel: LOGLEVEL.DEBUG });

const program = new Command();

program.command('connectable').description('Check if your client is connectable')
.requiredOption('-h, --host <host>', 'Host / IP address of the client')
.requiredOption('-p, --port <port>', 'Port the client is listening on')
.action(async (options) => {
    logger.debug(`Called with host=${options.host}, port=${options.port}`);
    await connectable(options.host, options.port);
});

program.parse();
