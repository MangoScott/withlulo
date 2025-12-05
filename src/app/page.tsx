"use client";

import { useState } from "react";
import Concierge from "@/components/Concierge/Concierge";
import Dashboard from "@/components/Dashboard/Dashboard";

export default function Home() {
  const [view, setView] = useState<'concierge' | 'dashboard'>('concierge');
  const [projectData, setProjectData] = useState<{ prompt: string } | null>(null);

  const handleProjectStart = (data: { prompt: string }) => {
    setProjectData(data);
    setView('dashboard');
  };

  return (
    <main>
      {view === 'concierge' ? (
        <Concierge onComplete={handleProjectStart} />
      ) : (
        <Dashboard prompt={projectData!.prompt} />
      )}
    </main>
  );
}
