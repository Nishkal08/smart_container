import { useState } from 'react';
import { Ship, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call for forgot password
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-primary/30">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Ship className="w-5 h-5 text-primary" />
        </div>
        <span className="font-bold text-foreground tracking-tight text-xl">CognifyPort</span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="bg-card border border-border shadow-xl rounded-3xl py-10 px-8 sm:px-12 animate-in fade-in slide-in-from-bottom-8 duration-700 fade-in-0">
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Reset password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSent 
                ? "We've sent a password reset link to your email."
                : "Enter your email and we'll send you a reset link."
              }
            </p>
          </div>

          {!isSent ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-secondary/30 py-3 pl-11 pr-4 text-foreground shadow-sm placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-all outline-none"
                    placeholder="admin@cognify.com"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-secondary/50 rounded-xl p-4 border border-border text-center">
              <p className="text-sm font-medium text-foreground">{email}</p>
              <p className="text-xs text-muted-foreground mt-1">Please check your inbox and verify your spam folder.</p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link
              to="/login"
              className="group flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}