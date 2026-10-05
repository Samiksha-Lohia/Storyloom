import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import SidebarLayout from './layouts/SidebarLayout';

// Common
import RoleRoute from './components/common/RoleRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { PendingApprovalPage } from './pages/publisher/PendingApprovalPage';
import { CataloguePage } from './pages/CataloguePage';
import { BookPage } from './pages/book/BookPage';
import { TermsPage } from './pages/legal/TermsPage';
import { PrivacyPage } from './pages/legal/PrivacyPage';
import { CopyrightPage } from './pages/legal/CopyrightPage';
import { HelpPage } from './pages/help/HelpPage';
import { ContactPage } from './pages/help/ContactPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { PlaceholderPage, NotFoundPage } from './pages/PlaceholderPage';
import { DevWorkspacePage } from './pages/dev/DevWorkspacePage';
import { NewBookPage } from './pages/writer/NewBookPage';
import { MyBooksPage } from './pages/writer/MyBooksPage';
import { WriterBookInsightsPage } from './pages/writer/WriterBookInsightsPage';
import { ReaderPage } from './pages/reader/ReaderPage';
import { LibraryPage } from './pages/library/LibraryPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminPublishersPage from './pages/admin/AdminPublishersPage';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminBooksPage from './pages/admin/AdminBooksPage';
import { WriterDashboardPage } from './pages/writer/WriterDashboardPage';
import { WriterReviewsPage } from './pages/writer/WriterReviewsPage';
import { EditBookPage } from './pages/writer/EditBookPage';
import { WriterProfilePage } from './pages/writer/WriterProfilePage';
import { PublicWriterProfilePage } from './pages/writer/PublicWriterProfilePage';
import { PublisherDiscoverPage } from './pages/publisher/PublisherDiscoverPage';
import { PublisherWishlistPage } from './pages/publisher/PublisherWishlistPage';
import { PublisherBookPitchPage } from './pages/publisher/PublisherBookPitchPage';
import { PublisherRequestsPage } from './pages/publisher/PublisherRequestsPage';
import { WriterRequestsPage } from './pages/writer/WriterRequestsPage';
import { ConversationsPage } from './pages/chat/ConversationsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Dedicated Reader Route (Immersive full screen with custom top bar & scrubber) */}
          <Route path="/read/:bookId" element={<ReaderPage />} />

          {/* Public Routes with Top Bar & Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/browse" element={<CataloguePage />} />
            <Route path="/browse/:genre" element={<CataloguePage />} />
            <Route path="/search" element={<CataloguePage />} />
            <Route path="/book/:id" element={<BookPage />} />
            <Route path="/writer/:username" element={<PublicWriterProfilePage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/copyright" element={<CopyrightPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/library"
              element={
                <RoleRoute>
                  <LibraryPage />
                </RoleRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleRoute>
                  <SettingsPage />
                </RoleRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Dedicated Auth Pages (Split collage layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/p/apply" element={<PendingApprovalPage />} />
          <Route path="/p/apply-status" element={<PendingApprovalPage />} />

          {/* Writer Protected Area */}
          <Route
            path="/w"
            element={
              <RoleRoute allowedRoles={['writer', 'admin']}>
                <SidebarLayout roleTitle="Writer Studio" />
              </RoleRoute>
            }
          >
            <Route path="dashboard" element={<WriterDashboardPage />} />
            <Route path="books" element={<MyBooksPage />} />
            <Route path="books/new" element={<NewBookPage />} />
            <Route path="books/:id/edit" element={<EditBookPage />} />
            <Route path="books/:id/insights" element={<WriterBookInsightsPage />} />
            <Route path="reviews" element={<WriterReviewsPage />} />
            <Route path="requests" element={<WriterRequestsPage />} />
            <Route path="chat" element={<ConversationsPage />} />
            <Route path="profile" element={<WriterProfilePage />} />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Writer Studio"
                  phase="Phase 3 Feature"
                />
              }
            />
          </Route>

          {/* Publisher Protected Area */}
          <Route
            path="/p"
            element={
              <RoleRoute allowedRoles={['publisher', 'admin']}>
                <SidebarLayout roleTitle="Publisher Portal" />
              </RoleRoute>
            }
          >
            <Route path="discover" element={<PublisherDiscoverPage />} />
            <Route path="wishlist" element={<PublisherWishlistPage />} />
            <Route path="requests" element={<PublisherRequestsPage />} />
            <Route path="chat" element={<ConversationsPage />} />
            <Route path="book/:id" element={<PublisherBookPitchPage />} />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Publisher Portal"
                  phase="Phase 5 Feature"
                />
              }
            />
          </Route>

          {/* Admin Protected Area */}
          <Route
            path="/a"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <SidebarLayout roleTitle="Admin Overview" />
              </RoleRoute>
            }
          >
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="publishers" element={<AdminPublishersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="books" element={<AdminBooksPage />} />
            <Route
              path="*"
              element={
                <PlaceholderPage
                  title="Admin Oversight"
                  phase="Phase 6 Feature"
                />
              }
            />
          </Route>

          {/* Dev Workspace (Preserves Legacy Story Analysis UI) */}
          <Route
            path="/dev/workspace/:documentId"
            element={
              <RoleRoute allowedRoles={['writer', 'admin']}>
                <DevWorkspacePage />
              </RoleRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
