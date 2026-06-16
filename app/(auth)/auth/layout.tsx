import React from "react";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-zinc-950 via-zinc-900 to-black px-4">
      {children}
    </main>
  );
};

export default AuthLayout;
