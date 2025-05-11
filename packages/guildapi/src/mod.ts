import { SocketManager } from './socket.ts';
import { createRequest, type request } from '@jersey/guilded-api-types';

/** a client for the Guilded API */
export interface Client {
	/** access to events */
	socket: SocketManager;
	/** make a request against the api */
	request: request;
}

/** Options for Client */
export interface ClientOptions {
	/** The token to authenticate with */
	token: string;
	/** The proxy url to use, defaults to normal v1 */
	socketURL?: string;
	/** Additional headers to use */
	headers?: Record<string, string>;
	/** Whether to replay missing events or not */
	replayMissedEvents?: boolean;
	/** Maximum reconnection attempts */
	reconnectLimit?: number;
}

/**
 * create a client to interact with the revolt api
 * @param opts the options to use for the client
 */
export function createClient(opts: string | ClientOptions): Client {
	return {
		socket: new SocketManager(typeof opts === "string" ? { token: opts } : opts),
		request: createRequest('https://www.guilded.gg/api/v1', {
			Authorization: `Bearer ${typeof opts === "string" ? opts : opts.token}`,
			'Content-Type': 'application/json',
			'User-Agent': `guildapi/0.0.5 ${navigator.userAgent}`,
			'x-guilded-bot-api-use-official-markdown': 'true',
		}),
	};
}

export * from './socket.ts';
