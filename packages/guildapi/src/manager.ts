import { EventEmitter } from '@denosaurs/event';
import type {
	SocketBaseEvent,
	SocketEventNames,
	SocketEvents,
	SocketOptions,
	SocketWelcome,
} from './types.ts';
import { SocketOPs } from './types.ts';

/** class which handles websocket connections to the guilded api */
export class SocketManager extends EventEmitter<SocketEvents> {
	/** the websocket connection */
	socket?: WebSocketStream;
	/** whether the connection is connected and pinging */
	alive = false;
	/** the last message ID recieved for resuming connections */
	lastMessageID?: string;
	/** attempts at a reconnection */
	reconnectCount = 0;
	/** the websocket writer */
	private writer?: WritableStreamDefaultWriter<string>;
	/** close info */
	private closeInfo?: WebSocketCloseInfo;

	/** create a socket manager */
	constructor(public readonly options: SocketOptions) {
		super();
	}

	/** connect to Guilded */
	async connect(): Promise<void> {
		const headers: Record<string, string> = {
			...this.options.headers,
			Authorization: `Bearer ${this.options.token}`,
			'User-Agent': `jerseyguildapi/0.0.1 ${navigator.userAgent}`,
			'x-guilded-bot-api-use-official-markdown': 'true',
		};

		if (this.options.replayMissedEvents && this.lastMessageID) {
			headers['guilded-last-message-id'] = this.lastMessageID;
		}

		this.socket = new WebSocketStream(
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
			
			this.emit("debug", `recieved packet: ${value}`)

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
							(data.d as SocketWelcome).user,
						);
						break;
					case SocketOPs.RESUME:
						this.emit('debug', 'recieved resume packet');
						this.lastMessageID = undefined;
						break;
					case SocketOPs.ERROR:
						this.emit('debug', 'recieved error packet');
						this.emit(
							'error',
							new Error((data.d as { message: string }).message),
							data,
						);
						this.lastMessageID = undefined;
						this.socket?.close();
						break;
					case SocketOPs.PING:
						this.emit('debug', 'recieved ping packet, sending pong');
						this.writer?.write(JSON.stringify({
							op: SocketOPs.PONG,
						}));
						break;
					default:
						this.emit('debug', 'recieved unknown opcode');
				}
			} catch {
				this.emit('debug', 'recieved invalid packet');
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
