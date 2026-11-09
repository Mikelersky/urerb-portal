// ============================================================================
// MMSU URERB Portal — Session & Authentication Utilities
// Powered by Live MariaDB / MySQL Backend via PHP Session Cookies
// ============================================================================

import { authApi, profileApi } from '../services/api';

const USER_SESSION_KEY = 'urerb_user_session';

let cachedUser = null;
let isInitialized = false;

// Initialize cache from sessionStorage on bundle load
try {
  const stored = sessionStorage.getItem(USER_SESSION_KEY);
  if (stored) {
    cachedUser = JSON.parse(stored);
  }
} catch {
  cachedUser = null;
}

/**
 * Get the currently logged-in user from in-memory cache or sessionStorage.
 */
export function getCurrentUser() {
  if (cachedUser) return cachedUser;
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY);
    if (raw) {
      cachedUser = JSON.parse(raw);
      return cachedUser;
    }
  } catch {
    // ignore parsing errors
  }
  return null;
}

/**
 * Set the currently logged-in user in cache and sessionStorage.
 */
export function setCurrentUser(user) {
  cachedUser = user || null;
  try {
    if (user) {
      sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_SESSION_KEY);
    }
  } catch (err) {
    console.error('Error writing session cache:', err);
  }
  window.dispatchEvent(new Event('urerb_auth_sync'));
}

/**
 * Probe server session with backend cookie.
 * Call this on app bootstrap or route protection.
 */
export async function initAuthSession() {
  try {
    const res = await authApi.me();
    if (res && res.success && res.user) {
      setCurrentUser(res.user);
      isInitialized = true;
      return res.user;
    }
  } catch {
    // 401 or network error - session not authenticated
  }
  setCurrentUser(null);
  isInitialized = true;
  return null;
}

export function isAuthInitialized() {
  return isInitialized;
}

export async function refreshCurrentUser() {
  return initAuthSession();
}

/**
 * Authenticate credentials against backend MySQL users table.
 */
export async function login(identifier, password) {
  const cleanId = (identifier || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return {
      success: false,
      message: 'Please provide both institutional email/username and password.',
    };
  }

  try {
    const res = await authApi.login({ identifier: cleanId, password: cleanPass });
    if (res && res.success && res.user) {
      setCurrentUser(res.user);
      return { success: true, user: res.user };
    }
    return {
      success: false,
      message: res?.message || 'Login failed. Please check your credentials.',
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Login failed. Please check your credentials.',
    };
  }
}

/**
 * Register a new researcher account in backend MySQL.
 */
export async function register(userData) {
  try {
    const res = await authApi.register(userData);
    if (res && res.success && res.user) {
      setCurrentUser(res.user);
      return { success: true, user: res.user };
    }
    return {
      success: false,
      message: res?.message || 'Registration failed.',
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Registration failed.',
    };
  }
}

/**
 * Log out active user and destroy server session.
 */
export async function logout() {
  try {
    await authApi.logout();
  } catch (err) {
    console.warn('Backend logout response:', err);
  } finally {
    setCurrentUser(null);
  }
}

/**
 * Update active user contact details or password.
 */
export async function updateUserProfile(updatedFields) {
  const current = getCurrentUser();
  if (!current) return null;

  try {
    // If updating contact details
    if ('contactNumber' in updatedFields || 'office' in updatedFields) {
      const res = await profileApi.updateContact({
        contactNumber: updatedFields.contactNumber ?? current.contactNumber,
        office: updatedFields.office ?? current.office,
      });
      if (res && res.success && res.user) {
        setCurrentUser(res.user);
        return res.user;
      }
    }

    // Local fallback update for UI responsiveness
    const merged = { ...current, ...updatedFields };
    setCurrentUser(merged);
    return merged;
  } catch (err) {
    console.error('Failed to update profile on backend:', err);
    throw err;
  }
}

/**
 * Change account password on backend.
 */
export async function changePassword(oldPassword, newPassword, confirmPassword) {
  return profileApi.changePassword({ oldPassword, newPassword, confirmPassword });
}

// Deprecated stubs to maintain backwards compatibility
export function getRegisteredUsers() {
  return [];
}
export function saveRegisteredUser(u) {
  return u;
}
