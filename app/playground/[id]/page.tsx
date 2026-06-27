"use client";
import { useParams } from "next/navigation";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import React, { use, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { TemplateFile } from "@/modules/playground/lib/path-to-json";

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
  const {
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
    activeFileId,
    closeAllFiles,
    closeFile,
    openFile,
    openFiles,
  } = useFileExplorer();

  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  useEffect(() => {
    if (templateData && openFiles.length === 0) {
      setTemplateData(templateData);
    }
  }, [templateData, setTemplateData, openFiles.length]);

  const activeFile = openFiles.find((f) => f.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((f) => f.hasUnsavedChanges);

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData!}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
          onAddFile={() => {}}
          onAddFolder={() => {}}
          onDeleteFile={() => {}}
          onDeleteFolder={() => {}}
          onRenameFile={() => {}}
          onRenameFolder={() => {}}
        />
      </>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <div className="flex flex-1 items-center gap-2">
          <div className="flex flex-col flex-1">
            <h1 className="text-sm font-medium">
              {playgroundData?.title || "Code Playground"}
            </h1>
          </div>
        </div>
      </SidebarInset>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
