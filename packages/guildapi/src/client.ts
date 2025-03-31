import { SocketManager } from './manager.ts';
import { createRequest, type request } from '@jersey/guilded-api-types';

/** a client for the Guilded API */
export interface Client {
	/** access to events */
	socket: SocketManager;
	/** make a request against the api */
	request: request;
}

/**
 * create a client to interact with the revolt api
 * @param opts the options to use for the client
 */
export function createClient(token: string): Client {
	const client = {
		socket: new SocketManager({ token }),
		request: createRequest('https://www.guilded.gg/api/v1', {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'User-Agent': `jerseyguildapi/0.0.1 ${navigator.userAgent}`,
			'x-guilded-bot-api-use-official-markdown': 'true',
		}),
	};
	return client;
}
