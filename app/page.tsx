import { Button } from "@/components/ui/button";
import Image from "next/image";
import { db } from "@/lib/db";
import UserButton from "@/modules/auth/components/user-button";
export default function Home() {
  const user = db.user;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Button>Get started</Button>
      <UserButton />
    </div>
  );
}
