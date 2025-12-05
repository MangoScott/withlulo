"use client";

import { useState } from 'react';
import TaskWizard from "@/components/Onboarding/TaskWizard";
import AgentGrid from "@/components/Dashboard/AgentGrid";

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');

  const handleStart = (prompt: string) => {
    setInitialPrompt(prompt);
    setHasStarted(true);
  };

  return (
    <main style={{ height: '100vh', overflow: 'hidden' }}>
      {!hasStarted ? (
        <TaskWizard onSubmit={handleStart} />
      ) : (
        <AgentGrid initialPrompt={initialPrompt} />
      )}
    </main>
  );
}
