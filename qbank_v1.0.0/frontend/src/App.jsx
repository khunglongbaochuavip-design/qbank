// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';

// Lazy-load pages for performance
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'));
const QuestionListPage   = lazy(() => import('./pages/questions/QuestionListPage'));
const QuestionFormPage   = lazy(() => import('./pages/questions/QuestionFormPage'));
const QuestionDetailPage = lazy(() => import('./pages/questions/QuestionDetailPage'));
const ReviewQueuePage    = lazy(() => import('./pages/review/ReviewQueuePage'));
const ImportExportPage   = lazy(() => import('./pages/import-export/ImportExportPage'));
const MatrixListPage     = lazy(() => import('./pages/matrices/MatrixListPage'));
const MatrixFormPage     = lazy(() => import('./pages/matrices/MatrixFormPage'));
const ExamListPage       = lazy(() => import('./pages/exams/ExamListPage'));
const ExamDetailPage     = lazy(() => import('./pages/exams/ExamDetailPage'));
const SessionListPage    = lazy(() => import('./pages/sessions/SessionListPage'));
const MyExamsPage        = lazy(() => import('./pages/sessions/MyExamsPage'));
const TakeExamPage       = lazy(() => import('./pages/take-exam/TakeExamPage'));
const ResultsPage        = lazy(() => import('./pages/results/ResultsPage'));
const MyResultsPage      = lazy(() => import('./pages/results/MyResultsPage'));
const AttemptDetailPage  = lazy(() => import('./pages/results/AttemptDetailPage'));
const UserManagementPage = lazy(() => import('./pages/users/UserManagementPage'));
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" tip="Đang tải..." />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/take/:sessionId" element={<TakeExamPage />} />

            {/* Protected routes — inside AppLayout */}
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Question bank */}
              <Route path="/questions" element={<QuestionListPage />} />
              <Route path="/questions/new" element={<QuestionFormPage />} />
              <Route path="/questions/:id" element={<QuestionDetailPage />} />
              <Route path="/questions/:id/edit" element={<QuestionFormPage />} />

              {/* Review */}
              <Route path="/review" element={<ReviewQueuePage />} />

              {/* Import / Export */}
              <Route path="/import-export" element={<ImportExportPage />} />

              {/* Exam matrices */}
              <Route path="/matrices" element={<MatrixListPage />} />
              <Route path="/matrices/new" element={<MatrixFormPage />} />
              <Route path="/matrices/:id" element={<MatrixFormPage />} />

              {/* Exams */}
              <Route path="/exams" element={<ExamListPage />} />
              <Route path="/exams/:id" element={<ExamDetailPage />} />

              {/* Sessions */}
              <Route path="/sessions" element={<SessionListPage />} />
              <Route path="/my-exams" element={<MyExamsPage />} />

              {/* Results */}
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/results/attempts/:id" element={<AttemptDetailPage />} />
              <Route path="/my-results" element={<MyResultsPage />} />

              {/* Admin */}
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
