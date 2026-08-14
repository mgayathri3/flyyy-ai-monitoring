import { useEffect, useState } from "react";
import { Layout, type PageKey } from "@/components/Layout";
import { api } from "@/services/api";
import type { AppConfig } from "@/types";
import { DashboardPage } from "@/pages/DashboardPage";
import { ChatPage } from "@/pages/ChatPage";
import { AssetsPage } from "@/pages/AssetsPage";
import { ActivityPage } from "@/pages/ActivityPage";
import { PiiPage } from "@/pages/PiiPage";
import { AgentPage } from "@/pages/AgentPage";
import { AlertsPage } from "@/pages/AlertsPage";
import { ObservabilityPage } from "@/pages/ObservabilityPage";
import { SettingsPage } from "@/pages/SettingsPage";

function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    api.config().then(setConfig).catch(() => {});
  }, [page]);

  return (
    <Layout current={page} onNavigate={setPage} monitoringEnabled={config?.prompt_monitoring_enabled ?? true}>
      {page === "dashboard" && <DashboardPage onNavigate={setPage} />}
      {page === "chat" && <ChatPage />}
      {page === "assets" && <AssetsPage />}
      {page === "activity" && <ActivityPage />}
      {page === "pii" && <PiiPage />}
      {page === "agent" && <AgentPage />}
      {page === "alerts" && <AlertsPage />}
      {page === "observability" && <ObservabilityPage />}
      {page === "settings" && <SettingsPage config={config} onConfigChange={setConfig} />}
    </Layout>
  );
}

export default App;
