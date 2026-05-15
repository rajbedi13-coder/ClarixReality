import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignUp } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [, setLocation] = useLocation();
  const signUp = useSignUp();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    signUp.mutate({
      data: { email, password, name }
    }, {
      onSuccess: (data) => {
        localStorage.setItem("token", data.token);
        queryClient.invalidateQueries();
        toast({ title: "Account created", description: "Your 1-month trial has started." });
        setLocation("/");
      },
      onError: () => {
        toast({ 
          title: "Sign up failed", 
          description: "Please check your information and try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-xl relative overflow-hidden">
        {/* Trial Badge */}
        <div className="absolute top-0 right-0 bg-accent text-accent-foreground font-mono text-[10px] uppercase tracking-wider py-1 px-3 rounded-bl-lg font-bold">
          1 Month Free Trial
        </div>

        <div className="text-center pt-4">
          <h2 className="font-serif text-3xl font-medium tracking-tight">Apply for Access</h2>
          <p className="mt-2 text-sm text-muted-foreground font-mono">
            Join the intelligence network
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 font-mono uppercase tracking-wider text-muted-foreground">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-border bg-surface2 rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
              <label className="block text-sm font-medium mb-1 font-mono uppercase tracking-wider text-muted-foreground">Password <span className="text-[10px] normal-case tracking-normal">(min 8 chars)</span></label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-3 py-2 border border-border bg-surface2 rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={signUp.isPending}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
          >
            {signUp.isPending ? "Processing..." : "Start Free Trial"}
          </button>
          
          <div className="text-center mt-4">
            <Link href="/signin" className="font-mono text-sm text-accent hover:text-accent/80">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
