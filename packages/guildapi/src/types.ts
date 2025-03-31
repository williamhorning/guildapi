import type {
	components,
	ResponseWelcomeMessage,
	SocketEventEnvelope,
	User,
} from '@jersey/guilded-api-types/ws';

/** Options for SocketManager */
export interface SocketOptions {
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

/** opcodes returned by Guilded */
export const SocketOPs = {
	SUCCESS: 0,
	WELCOME: 1,
	RESUME: 2,
	ERROR: 8,
	PING: 9,
	PONG: 10,
} as const;

/** Events supported by Guilded */
export type SocketEventNames = Exclude<
	keyof components['responses'],
	'_WelcomeMessage'
>;

/** Welcome payload */
export type SocketWelcome = ResponseWelcomeMessage['content']['application/json']

/** Socket base payload */
export type SocketBaseEvent = SocketEventEnvelope;

/** Events from Guilded */
export type SocketEvents =
	& {
		ready: [user: User];
		reconnect: [];
		close: [info: WebSocketCloseInfo];
		debug: [data: string];
		error: [data: Error, reason: SocketEventEnvelope];
	}
	& {
		[E in SocketEventNames]: [
			data: SocketEventEnvelope & {
				d: components['responses'][E]['content']['application/json'];
			},
		];
	};
