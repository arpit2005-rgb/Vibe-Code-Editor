import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { signIn } from "@/auth";

/**
 * Initiates sign-in via Google OAuth.
 */
async function handleGoogleSignIn() {
  "use server";
  await signIn("google");
}

/**
 * Initiates GitHub sign-in.
 *
 * @beta
 */
async function handleGithubSignIn() {
  "use server";
  await signIn("github");
}

const SignInFormClient = () => {
  return (
    <Card className="w-full max-w-md bg-zinc-900/80 backdrop-blur border-zinc-800 text-white shadow-2xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-4xl font-bold text-center text-violet-500">
          Sign In
        </CardTitle>

        <CardDescription className="text-center text-zinc-400">
          Choose your preferred sign-in method
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <form action={handleGoogleSignIn}>
          <Button
            type="submit"
            variant="outline"
            className="w-full bg-white text-black border-zinc-300 hover:bg-violet-50 hover:border-violet-500 transition-all"
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            <span>Sign in with Google</span>
          </Button>
        </form>

        <form action={handleGithubSignIn}>
          <Button
            type="submit"
            variant="outline"
            className="w-full bg-white text-black border-zinc-300 hover:bg-violet-50 hover:border-violet-500 transition-all"
          >
            <FaGithub className="mr-2 h-5 w-5" />
            <span>Sign in with GitHub</span>
          </Button>
        </form>
      </CardContent>

      <CardFooter>
        <p className="text-sm text-center text-zinc-400 w-full">
          By signing in, you agree to our{" "}
          <a href="#" className="underline hover:text-violet-400">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-violet-400">
            Privacy Policy
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignInFormClient;
