import React from "react";
import Image from "next/image";
import SignInFormClient from "@/modules/auth/components/sign-in-form-client";

const Page = () => {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-5xl font-bold text-violet-500">VibeCode</h1>
        <p className="text-zinc-400 mt-2">AI-Powered Vibe Code Editor</p>
      </div>

      <Image
        src="/login.png"
        alt="Login Image"
        priority
        width={280}
        height={280}
        className="mb-6 h-auto"
      />

      <SignInFormClient />
    </>
  );
};

export default Page;
