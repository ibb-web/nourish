import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost, setToken } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export const Route = createFileRoute("/signup")({ component: Signup });

type Form = { name: string; email: string; password: string };

function Signup() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>();
  const navigate = useNavigate();
  const { setUser } = useApp();
  const onSubmit = async (values: Form) => {
    try {
      const result = await apiPost<{ user: { name: string; email: string; avatar?: string; _id?: string }; token: string }>("/auth/register", {
        ...values,
        email: values.email.trim().toLowerCase(),
      });
      setToken(result.token);
      setUser(result.user);
      toast.success("Account created! Let's get to know you.");
      navigate({ to: "/onboarding" });
    } catch (err: any) {
      toast.error(err?.message || "Signup failed.");
    }
  };
  return (
    <AuthShell title="Create your account" subtitle="Free forever. No card required."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" className="mt-1.5" {...register("name", { required: "Required" })} />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="mt-1.5" {...register("email", { required: "Required" })} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" className="mt-1.5" {...register("password", { required: "Required", minLength: { value: 6, message: "Min 6 chars" } })} />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">By signing up you agree to our Terms and Privacy Policy.</p>
      </form>
    </AuthShell>
  );
}
