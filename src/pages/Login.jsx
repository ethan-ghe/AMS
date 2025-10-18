// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "@/contextproviders/AuthContext";
import { LoginForm } from "@/components/login-form";
import { OTPForm } from "../components/otp-form";
import { toast } from "sonner"
import gheLogo from '../assets/ghe-logo-blue.png';

function Login() {
  const { login, forgotPassword, verifyOTP } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [email, setEmail] = useState("");

  const handleLogin = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password);
      if (!result.success) {
        toast.error("Login failed", {
          description: result.error || "Please check your credentials and try again."
        });
      } else {
        // Store email for OTP verification
        setEmail(data.email);
        // Show OTP form
        setAwaitingOTP(true);
        /*toast.success("OTP sent", {
          description: "A verification code has been sent to your email."
        });*/
      }
    } catch (error) {
      toast.error("Login failed", {
        description: "An unexpected error occurred."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (otpCode) => {
    setIsVerifying(true);
    try {
      const result = await verifyOTP(email, otpCode);
      if (result.success) {
        toast.success("Verification successful", {
          description: "You are now logged in."
        });
      } else {
        toast.error("Verification failed", {
          description: result.error || "Invalid verification code."
        });
      }
    } catch (error) {
      toast.error("Verification failed", {
        description: "An unexpected error occurred."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        toast.success("Password reset link sent", {
          description: "Please check your email for instructions."
        });
        setForgotPasswordOpen(false);
      } else {
        toast.error("Failed to send reset link", {
          description: result.error
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "An unexpected error occurred."
      });
    }
  };

  return (
<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
  <div className="w-full max-w-sm space-y-6"> {/* Single container with vertical spacing */}
    {/* Logo */}
    <div className="flex justify-center">
      <img src={gheLogo} alt="GHE Logo" className="h-12 w-auto" /> {/* Adjust h-12 to your preferred size */}
    </div>
    
    {/* Login/OTP Form */}
    <div>
      {!awaitingOTP ? (
        <LoginForm
          onSubmit={handleLogin}
          isSubmitting={isSubmitting}
          onForgotPasswordClick={() => setForgotPasswordOpen(true)}
          forgotPasswordOpen={forgotPasswordOpen}
          setForgotPasswordOpen={setForgotPasswordOpen}
          onForgotPasswordSubmit={handleForgotPassword}
        />
      ) : (
        <OTPForm
          onVerify={handleVerifyOTP}
          isVerifying={isVerifying}
        />
      )}
    </div>
  </div>
</div>
  );
}

export default Login;