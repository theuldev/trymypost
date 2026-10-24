import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { PlaygroundPage } from "@/features/playground/pages/PlaygroundPage";
import { PlaygroundResultsPage } from "@/features/playground/pages/PlaygroundResultsPage";
import { HistoryPage } from "@/features/history/pages/HistoryPage";
import { PostDetailsPage } from "@/features/history/pages/PostDetailsPage";
import { TopicsPage } from "@/features/topics/pages/TopicsPage";
import { TopicsResultsPage } from "@/features/topics/pages/TopicsResultsPage";
import { CodeImagePage } from "@/features/code-image/pages/CodeImagePage";
import { EditorPage } from "@/features/editor/pages/EditorPage";
import { CalendarPage } from "@/features/calendar/pages/CalendarPage";
import { StoragePage } from "@/features/storage/pages/StoragePage";
import { EmailGenerationPage } from "@/features/email-generation/pages/EmailGenerationPage";
import { EmailGenerationResultsPage } from "@/features/email-generation/pages/EmailGenerationResultsPage";
import { EmailGenerationDetailPage } from "@/features/email-generation/pages/EmailGenerationDetailPage";
import { EmailHistoryPage } from "@/features/email-generation/pages/EmailHistoryPage";
import { AuditPage } from "@/features/audit/pages/AuditPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";

// Redireciona rotas antigas (com :id) para a nova estrutura
function LegacyEmailDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/emails/history/${id}`} replace />;
}

function LegacyPostRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/history/posts/${id}`} replace />;
}

function LegacyEditorRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/tools/editor/${id}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Dashboard */}
        <Route path="/" element={<PlaygroundPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/playground/results" element={<PlaygroundResultsPage />} />

        {/* Topics */}
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/topics/results" element={<TopicsResultsPage />} />

        {/* History */}
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/posts/:id" element={<PostDetailsPage />} />

        {/* Calendar */}
        <Route path="/calendar" element={<CalendarPage />} />

        {/* Emails */}
        <Route path="/emails" element={<EmailGenerationPage />} />
        <Route path="/emails/results" element={<EmailGenerationResultsPage />} />
        <Route path="/emails/history" element={<EmailHistoryPage />} />
        <Route path="/emails/history/:id" element={<EmailGenerationDetailPage />} />

        {/* Tools */}
        <Route path="/tools/code-image" element={<CodeImagePage />} />
        <Route path="/tools/editor" element={<EditorPage />} />
        <Route path="/tools/editor/:id" element={<EditorPage />} />

        {/* Storage */}
        <Route path="/storage" element={<StoragePage />} />

        {/* Administration */}
        <Route path="/audit" element={<AuditPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Legacy redirects: URLs antigas → nova estrutura */}
        <Route path="/email-generation" element={<Navigate to="/emails" replace />} />
        <Route path="/email-generation/results" element={<Navigate to="/emails/results" replace />} />
        <Route path="/email-generation/history" element={<Navigate to="/emails/history" replace />} />
        <Route path="/email-generation/history/:id" element={<LegacyEmailDetailRedirect />} />
        <Route path="/post/:id" element={<LegacyPostRedirect />} />
        <Route path="/posts/:id" element={<LegacyPostRedirect />} />
        <Route path="/editor/:id" element={<LegacyEditorRedirect />} />
        <Route path="/code-image" element={<Navigate to="/tools/code-image" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
