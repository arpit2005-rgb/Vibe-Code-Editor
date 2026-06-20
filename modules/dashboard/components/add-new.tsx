"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group px-6 py-6 flex flex-row justify-between items-center border rounded-lg bg-muted cursor-pointer
        transition-all duration-300 ease-in-out
        hover:bg-background hover:border-purple-500 hover:scale-[1.02]
        shadow-[0_2px_10px_rgba(0,0,0,0.08)]
        hover:shadow-[0_10px_30px_rgba(168,85,247,0.25)]"
      >
        <div className="flex flex-row justify-center items-start gap-4">
          <Button
            variant={"outline"}
            size={"icon"}
            className="flex justify-center items-center bg-white dark:bg-zinc-900
            group-hover:bg-purple-50 dark:group-hover:bg-purple-950/20
            group-hover:border-purple-500
            group-hover:text-purple-600
            transition-colors duration-300"
          >
            <Plus
              size={30}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </Button>

          <div className="flex flex-col">
            <h1
              className="text-xl font-bold text-violet-500
            transition-all duration-300
            group-hover:bg-linear-to-r
            group-hover:from-violet-500
            group-hover:via-purple-500
            group-hover:to-fuchsia-500
            group-hover:bg-clip-text
            group-hover:text-transparent"
            >
              Add New
            </h1>

            <p className="text-sm text-muted-foreground max-w-55">
              Create a new playground
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <Image
            src={"/add-new.svg"}
            alt="Create new playground"
            width={150}
            height={150}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>
    </>
  );
};

export default AddNewButton;
