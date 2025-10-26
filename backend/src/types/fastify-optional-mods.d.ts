// Minimal module shims to allow compiling when optional plugins aren't installed locally.
declare module '@fastify/websocket' {
  export type SocketStream = {
    socket: {
      send: (data: string) => void;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
    };
  };
  const _default: unknown;
  export default _default;
}

declare module '@fastify/compress' {
  const _default: unknown;
  export default _default;
}

declare module '@fastify/jwt' {
  const _default: unknown;
  export default _default;
}
