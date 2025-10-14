// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { CognitoAuthServiceV3 as CognitoAuthService } from "../services/cognitoAuth";
import { toast } from "sonner";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initError, setInitError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginStep, setLoginStep] = useState('initial');
  const [mfaSession, setMfaSession] = useState(null); // Store MFA session data

  useEffect(() => {
    checkCurrentUser();
  }, []);


  const checkCurrentUser = async () => {
    try {
      console.log('📋 Checking for current user...');
      const result = await CognitoAuthService.getCurrentUser();
      
      if (result.success) {
        console.log('✅ Current user found:', result);
        setUser(result.user);
      } else {
        console.log('ℹ️ No authenticated user found');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error checking current user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('🚀 Attempting login for:', username);
      
      const result = await CognitoAuthService.signIn(username, password);
      console.log('📝 Login result:', result);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      if (result.requiresMFA) {
        // Store the session data for MFA completion
        setMfaSession({
          session: result.session,
          challengeName: result.challengeName,
          username: result.username
        });
        setLoginStep('mfa');
        return {
          success: true,
          requiresMFA: true,
          challengeName: result.challengeName
        };
      } else if (result.requiresNewPassword) {
        // Handle new password requirement
        setMfaSession({
          session: result.session,
          username: result.username
        });
        setLoginStep('new-password');
        return {
          success: true,
          requiresNewPassword: true,
          userAttributes: result.userAttributes
        };
      } else {
        // Successful login
        setUser(result.user);
        setLoginStep('initial');
        return { success: true, complete: true };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (code) => {
    try {
      setLoading(true);
      console.log('🔐 Verifying MFA code...');
      
      if (!mfaSession) {
        return { success: false, error: 'MFA session expired' };
      }

      const result = await CognitoAuthService.completeMFA(
        mfaSession.session,
        code,
        mfaSession.challengeName
      );
      
      if (result.success) {
        setUser(result.user);
        setMfaSession(null);
        setLoginStep('initial');
        console.log('✅ MFA verification successful');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ MFA verification error:', error);
      return {
        success: false,
        error: error.message || 'Verification failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      await CognitoAuthService.signOut();
      setUser(null);
      setMfaSession(null);
      setLoginStep('initial');
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear state even if logout fails
      setUser(null);
      setMfaSession(null);
      setLoginStep('initial');
    }
  };

  const forgotPassword = async (username) => {
    try {
      console.log('📧 Sending password reset for:', username);
      const result = await CognitoAuthService.forgotPassword(username);
      
      if (result.success) {
        console.log('✅ Password reset code sent');
        return {
          success: true,
          message: result.message || 'Password reset code sent to your email'
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reset code'
      };
    }
  };

  const confirmForgotPassword = async (username, code, newPassword) => {
    try {
      console.log('🔑 Confirming password reset for:', username);
      const result = await CognitoAuthService.confirmForgotPassword(username, code, newPassword);
      
      if (result.success) {
        console.log('✅ Password reset successful');
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Confirm password reset error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset password'
      };
    }
  };

  const getBearerToken = async () => {
    try {
      if (user && user.idToken) {
        return user.idToken;
      }
      
      // Try to refresh the session
      const result = await CognitoAuthService.refreshSession();
      if (result.success) {
        setUser(result.user); // Update user with new tokens
        return result.idToken;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting bearer token:', error);
      return null;
    }
  };

  const refreshSession = async () => {
    try {
      console.log('🔄 Refreshing session...');
      const result = await CognitoAuthService.refreshSession();
      
      if (result.success) {
        // Update the user object with new tokens
        setUser(prevUser => ({
          ...prevUser,
          accessToken: result.accessToken,
          idToken: result.idToken
        }));
        return { success: true };
      } else {
        // Session refresh failed, user needs to login again
        setUser(null);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Session refresh error:', error);
      setUser(null);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    initError,
    loginStep,
    setLoginStep,
    login,
    verifyOTP,
    logout,
    forgotPassword,
    confirmForgotPassword,
    getBearerToken,
    refreshSession,
    checkCurrentUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};