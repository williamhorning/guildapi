export default class WebSocketStream {
	readonly url: string;
	readonly opened: Promise<{
		readable: ReadableStream<string | Uint8Array<ArrayBuffer>>;
		writable: WritableStream<string | Uint8Array<ArrayBufferLike>>;
		extensions: string;
		protocol: string;
	}>;
	readonly closed: Promise<{
		code?: number;
		reason?: string;
	}>;
	readonly close: (info?: {
		code?: number;
		reason?: string;
	}) => void;

	constructor(url: string, options?: { headers?: Record<string, string> }) {
		const socket = new WebSocket(
			url,
			'Bun' in globalThis
				// @ts-expect-error: this is a bun-only feature
				? { headers: options?.headers }
				: undefined,
		);

		this.url = url;
		this.close = ({ code, reason } = {}) => socket.close(code, reason);

		this.opened = new Promise((resolve, reject) => {
			socket.onopen = () => {
				resolve({
					readable: new ReadableStream({
						cancel: socket.close,
						start(str) {
							socket.onmessage = ({ data }) => str.enqueue(data);
							socket.onerror = (e) => str.error(e);
						},
					}),
					writable: new WritableStream({
						abort: socket.close,
						close: socket.close,
						write: socket.send,
					}),
					protocol: socket.protocol,
					extensions: socket.extensions,
				});
				socket.removeEventListener('error', reject);
			};

			socket.addEventListener('error', reject);
		});

		this.closed = new Promise((resolve, reject) => {
			socket.onclose = ({ code, reason }) => {
				resolve({ code, reason });
				socket.removeEventListener('error', reject);
			};

			socket.addEventListener('error', reject);
		});
	}
}
