"use client";
import { useParams } from "next/navigation";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import React from "react";

const MainPlaygroundPage = () => {
  const { id } = useParams<{ id: string }>();

  const {
    templateData,
    playgroundData,
    isLoading,
    error,
    saveTemplateData,
    loadPlayground,
  } = usePlayground(id);

  console.log(templateData);
  console.log(playgroundData);

  return <div>Params : {id}</div>;
};

export default MainPlaygroundPage;
