import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { PlaygroundPage } from "@/features/playground/pages/PlaygroundPage";
import { PlaygroundResultsPage } from "@/features/playground/pages/PlaygroundResultsPage";
import { HistoryPage } from "@/features/history/pages/HistoryPage";
import { PostDetailsPage } from "@/features/history/pages/PostDetailsPage";
import { TopicsPage } from "@/features/topics/pages/TopicsPage";
import { TopicsResultsPage } from "@/features/topics/pages/TopicsResultsPage";
import { CodeImagePage } from "@/features/code-image/pages/CodeImagePage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { EditorPage } from "@/features/editor/pages/EditorPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/playground" replace />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/playground/results" element={<PlaygroundResultsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/post/:id" element={<PostDetailsPage />} />
        <Route path="/posts/:id" element={<PostDetailsPage />} />
        <Route path="/topics" element={<TopicsPage />} />
        <Route path="/topics/results" element={<TopicsResultsPage />} />
        <Route path="/code-image" element={<CodeImagePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/playground" replace />} />
      </Route>
    </Routes>
  );
}
