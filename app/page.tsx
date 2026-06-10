import { Button } from "@/components/ui/button";
import Image from "next/image";
import { db } from "@/lib/db";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Button>Get started</Button>
    </div>
  );
}
