// src/components/otp-form.jsx
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export function OTPForm({
  className,
  onVerify,
  isVerifying,
  ...props
}) {
  const [otpValue, setOtpValue] = useState("");
  
  const handleComplete = (value) => {
    // This function will be called when all 6 digits are entered
    setOtpValue(value);
    
    // Automatically submit the form when all 6 digits are entered
    if (value.length === 6) {
      onVerify(value);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 text-center", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Enter Your One-Time Code</CardTitle>
          <CardDescription>
            Your six digit code was sent to the email provided.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <InputOTP 
            maxLength={6} 
            value={otpValue}
            onChange={setOtpValue}
            onComplete={handleComplete}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          
          <Button 
            type="button" 
            className="w-full mt-4"
            disabled={isVerifying || otpValue.length !== 6}
            onClick={() => onVerify(otpValue)}
          >
            {isVerifying ? "Verifying..." : "Verify Code"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}