
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EyeIcon, EyeOffIcon, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      setLoading(false);
      
      // In a real app, we'd validate credentials here
      // For now, just redirect to dashboard
      if (email.includes('@') && password.length >= 6) {
        toast({
          title: "Success",
          description: "You have been logged in successfully",
        });
        window.location.href = '/';
      } else {
        toast({
          title: "Error",
          description: "Invalid email or password. Try using any email format and password with 6+ characters.",
          variant: "destructive"
        });
      }
    }, 1500);
  };
  
  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    // Simulate signup process
    setTimeout(() => {
      setLoading(false);
      
      if (email.includes('@') && password.length >= 6) {
        toast({
          title: "Account created",
          description: "Your account has been created successfully",
        });
        window.location.href = '/';
      } else {
        toast({
          title: "Error",
          description: "Please use a valid email and a password with at least 6 characters",
          variant: "destructive"
        });
      }
    }, 1500);
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-dashboard-purple" />
            <span className="text-2xl font-bold">SmartView</span>
          </div>
        </div>
        
        <Card>
          <Tabs defaultValue="login">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Welcome</CardTitle>
                <TabsList>
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Signup</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription>
                Access your automation dashboard
              </CardDescription>
            </CardHeader>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="password">Password</Label>
                      <a 
                        href="#" 
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          toast({
                            title: "Password Reset",
                            description: "Password reset functionality would be implemented here.",
                          });
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? 
                          <EyeOffIcon className="h-4 w-4" /> : 
                          <EyeIcon className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="signup-password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? 
                          <EyeOffIcon className="h-4 w-4" /> : 
                          <EyeIcon className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
