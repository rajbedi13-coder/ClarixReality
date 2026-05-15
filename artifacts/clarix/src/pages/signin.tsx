import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignIn, useGetCurrentUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const signIn = useSignIn();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    signIn.mutate({
      data: { email, password }
    }, {
      onSuccess: (data) => {
        localStorage.setItem("token", data.token);
        queryClient.invalidateQueries(); // invalidates useGetCurrentUser
        toast({ title: "Signed in successfully" });
        setLocation("/");
      },
      onError: () => {
        toast({ 
          title: "Sign in failed", 
          description: "Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-medium tracking-tight">Access Briefings</h2>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            Enter your credentials to continue
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 font-mono uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-border bg-surface2 rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 font-mono uppercase tracking-wider text-muted-foreground">Password</label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 border border-border bg-surface2 rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={signIn.isPending}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
          >
            {signIn.isPending ? "Authenticating..." : "Sign In"}
          </button>
          
          <div className="text-center mt-4">
            <Link href="/signup" className="font-mono text-sm text-accent hover:text-accent/80">
              Don't have an account? Apply for access
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
