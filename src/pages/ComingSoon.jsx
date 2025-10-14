import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="max-w-2xl w-full">
            <div className="pt-12 pb-10 px-6 sm:px-12">
                             <div className="flex flex-col items-center text-center space-y-6">         
            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent py-2">
                Coming Soon
              </h1>
            </div>

            {/* Description */}
            <div className="max-w-md space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>This feature is currently in development</span>
              </div>
            </div>

            {/* Button */}
            <Button 
              onClick={() => navigate('/dashboard')}
              size="lg"
              className="mt-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>
            </div>
        </div>
    </div>
  );
}