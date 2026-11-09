import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Researcher Pages
import ResearcherDashboard from '../pages/researcher/Dashboard';
import MyApplications from '../pages/researcher/MyApplications';
import NewApplication from '../pages/researcher/NewApplication';
import ApplicationTracking from '../pages/researcher/ApplicationTracking';
import HelpCenter from '../pages/researcher/HelpCenter';
import Notifications from '../pages/researcher/Notifications';
import Profile from '../pages/researcher/Profile';
import ReviewSubmit from '../pages/researcher/ReviewSubmit';

// Secretariat Pages
import SecretariatDashboard from '../pages/secretariat/Dashboard';
import ApplicationsManagement from '../pages/secretariat/ApplicationsManagement';
import ApplicationChecking from '../pages/secretariat/ApplicationChecking';
import ApplicationProcessing from '../pages/secretariat/ApplicationProcessing';
import RecordsAndArchives from '../pages/secretariat/RecordsAndArchives';
import SecretariatNotifications from '../pages/secretariat/Notifications';
import SecretariatProfile from '../pages/secretariat/Profile';

// Reviewer Pages
import ReviewerDashboard from '../pages/reviewer/Dashboard';
import AssignedApplications from '../pages/reviewer/AssignedApplications';
import ReviewWorkspace from '../pages/reviewer/ReviewWorkspace';
import ReviewHistory from '../pages/reviewer/ReviewHistory';
import ReviewerNotifications from '../pages/reviewer/Notifications';
import ReviewerProfile from '../pages/reviewer/Profile';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect to login */}
      <Route path="/" element={<Navigate to={ROUTES.AUTH.LOGIN} replace />} />

      {/* Authentication */}
      <Route path={ROUTES.AUTH.LOGIN} element={<Login />} />
      <Route path={ROUTES.AUTH.REGISTER} element={<Register />} />

      {/* Researcher Protected Routes */}
      <Route
        path={ROUTES.RESEARCHER.DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <ResearcherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESEARCHER.MY_APPLICATIONS}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <MyApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESEARCHER.NEW_APPLICATION}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <NewApplication />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESEARCHER.APPLICATION_TRACKING}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <ApplicationTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/researcher/tracking"
        element={<Navigate to={ROUTES.RESEARCHER.APPLICATION_TRACKING} replace />}
      />
      <Route
        path={ROUTES.RESEARCHER.REVIEW_SUBMIT}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <ReviewSubmit />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESEARCHER.HELP_CENTER}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <HelpCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESEARCHER.NOTIFICATIONS}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.RESEARCHER.PROFILE}
        element={
          <ProtectedRoute allowedRoles={['researcher', 'admin']}>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Secretariat Protected Routes */}
      <Route
        path="/secretariat"
        element={<Navigate to={ROUTES.SECRETARIAT.DASHBOARD} replace />}
      />
      <Route
        path={ROUTES.SECRETARIAT.DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <SecretariatDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <ApplicationsManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SECRETARIAT.APPLICATION_CHECKING}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <ApplicationChecking />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SECRETARIAT.APPLICATION_PROCESSING}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <ApplicationProcessing />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SECRETARIAT.RECORDS_AND_ARCHIVES}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <RecordsAndArchives />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SECRETARIAT.NOTIFICATIONS}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <SecretariatNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.SECRETARIAT.PROFILE}
        element={
          <ProtectedRoute allowedRoles={['secretariat', 'admin']}>
            <SecretariatProfile />
          </ProtectedRoute>
        }
      />

      {/* Reviewer Protected Routes */}
      <Route
        path="/reviewer"
        element={<Navigate to={ROUTES.REVIEWER.DASHBOARD} replace />}
      />
      <Route
        path={ROUTES.REVIEWER.DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
            <ReviewerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.REVIEWER.ASSIGNED_APPLICATIONS}
        element={
          <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
            <AssignedApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.REVIEWER.REVIEW_WORKSPACE}
        element={
          <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
            <ReviewWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.REVIEWER.REVIEW_HISTORY}
        element={
          <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
            <ReviewHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.REVIEWER.NOTIFICATIONS}
        element={
          <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
            <ReviewerNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.REVIEWER.PROFILE}
        element={
          <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
            <ReviewerProfile />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
