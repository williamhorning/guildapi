import { EventEmitter } from '@denosaurs/event';
import type { User } from '@jersey/guilded-api-types';
import type {
	_SocketEventEnvelope,
	_WelcomeMessage,
	responses,
} from '@jersey/guilded-api-types/ws';
import type { ClientOptions } from './mod.ts';

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
export type SocketEventNames = Exclude<keyof responses, '_WelcomeMessage'>;

/** Welcome payload */
export type SocketWelcome = _WelcomeMessage;

/** Socket base payload */
export type SocketBaseEvent = _SocketEventEnvelope;

/** Events from Guilded */
export type SocketEvents =
	& {
		ready: [user: User];
		reconnect: [];
		close: [info: WebSocketCloseInfo];
		debug: [data: string];
		error: [data: Error, reason: _SocketEventEnvelope];
	}
	& {
		[E in SocketEventNames]: [
			data: _SocketEventEnvelope & {
				d: responses[E];
			},
		];
	};

/** class which handles websocket connections to the guilded api */
export class SocketManager extends EventEmitter<SocketEvents> {
	/** the websocket connection */
	socket?: import('./stream.ts').default;
	/** whether the connection is connected and pinging */
	alive = false;
	/** the last message ID received for resuming connections */
	lastMessageID?: string;
	/** attempts at a reconnection */
	reconnectCount = 0;
	/** the websocket writer */
	private writer?: WritableStreamDefaultWriter<string>;
	/** close info */
	private closeInfo?: {
		code?: number;
		reason?: string;
	};

	/** create a socket manager */
	constructor(public readonly options: ClientOptions) {
		super();
	}

	/** connect to Guilded */
	async connect(): Promise<void> {
		const headers: Record<string, string> = {
			...this.options.headers,
			Authorization: `Bearer ${this.options.token}`,
			'User-Agent': `guildapi/0.0.5 ${navigator.userAgent}`,
			'x-guilded-bot-api-use-official-markdown': 'true',
		};

		if (this.options.replayMissedEvents && this.lastMessageID) {
			headers['guilded-last-message-id'] = this.lastMessageID;
		}

		this.socket =
			new ('WebSocketStream' in globalThis
				? WebSocketStream
				: (await import('./stream.ts')).default)(
				this.options.socketURL ?? 'wss://www.guilded.gg/websocket/v1',
				{ headers },
			);

		const { readable, writable } = await this.socket.opened;

		this.alive = true;
		this.closeInfo = undefined;
		this.writer = writable.getWriter();

		this.read(readable.getReader());
		this.closed();
	}

	private async read(
		reader: ReadableStreamDefaultReader<string | Uint8Array<ArrayBuffer>>,
	) {
		while (true) {
			const { value, done } = await reader.read();

			if (done) break;

			this.emit('debug', `received packet: ${value}`);

			try {
				const data = JSON.parse(value as string) as SocketBaseEvent;

				if (data.s) this.lastMessageID = data.s;

				switch (data.op) {
					case SocketOPs.SUCCESS:
						this.emit(
							data.t as SocketEventNames,
							// deno-lint-ignore no-explicit-any
							data as (SocketBaseEvent & { d: any }),
						);
						break;
					case SocketOPs.WELCOME:
						this.emit(
							'ready',
							(data.d as unknown as SocketWelcome).user,
						);
						break;
					case SocketOPs.RESUME:
						this.emit('debug', 'received resume packet');
						this.lastMessageID = undefined;
						break;
					case SocketOPs.ERROR:
						this.emit('debug', 'received error packet');
						this.emit(
							'error',
							new Error((data.d as { message: string }).message),
							data,
						);
						this.lastMessageID = undefined;
						this.socket?.close();
						break;
					case SocketOPs.PING:
						this.emit('debug', 'received ping packet, sending pong');
						this.writer?.write(JSON.stringify({
							op: SocketOPs.PONG,
						}));
						break;
					default:
						this.emit('debug', 'received unknown opcode');
				}
			} catch {
				this.emit('debug', 'received invalid packet');
			}
		}
	}

	private async closed() {
		if (!this.socket) return;

		this.closeInfo = await this.socket.closed;

		this.emit('close', this.closeInfo);
		this.emit('debug', 'disconnecting due to close');

		this.socket = undefined;
		this.writer = undefined;
		this.alive = false;

		if (
			(this.options.reconnectLimit ?? Number.POSITIVE_INFINITY) >=
				this.reconnectCount
		) {
			this.emit('debug', 'reconnecting to Guilded');
			this.emit('reconnect');
			this.reconnectCount++;
			this.connect();
		}
	}
}
