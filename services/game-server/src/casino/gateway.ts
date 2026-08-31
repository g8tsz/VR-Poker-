import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { cmdsForActor, roomDetails } from "./map.ts";
import { handleRpc, unauthPrompt, type RpcReq, type Session } from "./rpc.ts";
import type { CasinoRuntime } from "./runtime.ts";

const HELLO = {
  msg: "welcome to VR Poker (casino-server protocol)",
  version: 20260829,
  client_req: 20141130,
};

export function attachCasinoGateway(httpServer: HttpServer, runtime: CasinoRuntime): Server {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    socket.emit("hello", { sid: socket.id, ...HELLO });

    socket.on("hello", () => {
      socket.emit("notify", { uid: null, e: "prompt", args: unauthPrompt() });
    });

    socket.on("rpc", (req: RpcReq) => {
      void (async () => {
        if (!req || typeof req !== "object" || typeof req.f !== "string") {
          socket.emit("rpc_ret", { seq: req?.seq ?? 0, err: 400, ret: "invalid rpc req" });
          return;
        }
        const session = (socket.data.session as Session | undefined) ?? null;
        const reply = await handleRpc(runtime, req, session);
        if (req.f === "login" && reply.err === 0 && reply.ret && typeof reply.ret === "object") {
          const ret = reply.ret as { token?: { uid: string; pin: string } };
          if (ret.token) socket.data.session = { uid: ret.token.uid, pin: ret.token.pin };
        }
        if (req.f === "logout" && reply.err === 0) socket.data.session = undefined;
        socket.emit("rpc_ret", reply);
        if (session?.uid || socket.data.session) {
          const uid = (socket.data.session as Session | undefined)?.uid ?? session?.uid;
          if (uid) {
            const tableId = runtime.rooms.get(uid);
            if (tableId) {
              const snap = runtime.tableOrThrow(tableId).snapshot(uid);
              socket.emit("notify", { uid, e: "look", args: roomDetails(snap, uid) });
              socket.emit("notify", { uid, e: "prompt", args: cmdsForActor(snap) });
            }
          }
        }
      })();
    });
  });

  return io;
}
