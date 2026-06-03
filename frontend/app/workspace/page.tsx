"use client";

import { useEffect, useRef } from "react";
import LeftPanel from "@/components/shell/LeftPanel";
import WorkspaceCenter from "@/components/workspace/WorkspaceCenter";
import RightPanel from "@/components/shell/RightPanel";
import BottomBar from "@/components/shell/BottomBar";
import { usePlayback } from "@/store/playback";
import { useSession } from "@/store/session";

export default function WorkspacePage() {
  const { t, setPlaying } = usePlayback();
  const { loadSession } = useSession();
  const autoRef = useRef(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("ars_load_session_id");
    if (pending) {
      sessionStorage.removeItem("ars_load_session_id");
      loadSession(pending);
    }
  }, []);

  useEffect(() => {
    if (!autoRef.current && t < 0.15) {
      autoRef.current = true;
      const id = setTimeout(() => setPlaying(true), 450);
      return () => clearTimeout(id);
    }
  }, []);

  return (
    <div className="ws-grid">
      <LeftPanel />
      <WorkspaceCenter />
      <RightPanel />
      <BottomBar />
    </div>
  );
}
