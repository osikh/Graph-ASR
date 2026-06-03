import asyncio
from fastapi import WebSocket
import structlog

log = structlog.get_logger()


class ConnectionManager:
    def __init__(self):
        # session_id → list of active WebSocket connections
        self._conns: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._conns.setdefault(session_id, []).append(ws)
        log.info("ws.connected", session_id=session_id, total=len(self._conns[session_id]))

    def disconnect(self, session_id: str, ws: WebSocket) -> None:
        conns = self._conns.get(session_id, [])
        if ws in conns:
            conns.remove(ws)
        log.info("ws.disconnected", session_id=session_id)

    async def broadcast(self, session_id: str, payload: dict) -> None:
        conns = self._conns.get(session_id, [])
        if not conns:
            return
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)

    async def broadcast_all(self, payload: dict) -> None:
        tasks = [self.broadcast(sid, payload) for sid in list(self._conns)]
        await asyncio.gather(*tasks, return_exceptions=True)


# Singleton — imported everywhere
ws_manager = ConnectionManager()
