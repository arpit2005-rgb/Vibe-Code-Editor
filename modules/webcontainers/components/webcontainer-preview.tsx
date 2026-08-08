"use client";

import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import TerminalComponent from "./terminal";

export interface WebContainerPreviewHandle {
  reload: () => void;
}

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean;
}

const WebContainerPreview = forwardRef<
  WebContainerPreviewHandle,
  WebContainerPreviewProps
>(
  (
    {
      templateData,
      serverUrl,
      isLoading,
      error,
      instance,
      writeFileSync,
      forceResetup,
    },
    ref,
  ) => {
    const [previewUrl, setPreviewUrl] = useState<string>(serverUrl || "");
    const [previewKey, setPreviewKey] = useState(0);

    const [loadingState, setLoadingState] = useState({
      transforming: false,
      mounting: false,
      installing: false,
      starting: false,
      ready: false,
    });

    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = 4;

    const [setupError, setSetupError] = useState<string | null>(null);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [isSetupInProgress, setIsSetupInProgress] = useState(false);

    const terminalRef = useRef<any>(null);

    // Keep preview URL synchronized with the WebContainer hook.
    useEffect(() => {
      if (serverUrl) {
        console.log("Using WebContainer server URL:", serverUrl);

        setPreviewUrl(serverUrl);

        setLoadingState((prev) => ({
          ...prev,
          starting: false,
          ready: true,
        }));

        setCurrentStep(4);
        setIsSetupComplete(true);
        setIsSetupInProgress(false);
      }
    }, [serverUrl]);

    // Reload only the preview iframe.
    // WebContainer and development server remain running.
    useImperativeHandle(
      ref,
      () => ({
        reload: () => {
          setPreviewKey((prev) => prev + 1);
        },
      }),
      [],
    );

    // Force complete setup again when requested.
    useEffect(() => {
      if (forceResetup) {
        setIsSetupComplete(false);
        setIsSetupInProgress(false);
        setPreviewUrl("");
        setPreviewKey((prev) => prev + 1);

        setLoadingState({
          transforming: false,
          mounting: false,
          installing: false,
          starting: false,
          ready: false,
        });
      }
    }, [forceResetup]);

    useEffect(() => {
      async function setupContainer() {
        if (!instance || isSetupComplete || isSetupInProgress) return;

        try {
          setIsSetupInProgress(true);
          setSetupError(null);

          // ---------------------------------------------------------
          // Check whether this WebContainer already has a project.
          // ---------------------------------------------------------
          try {
            const packageJsonExists = await instance.fs.readFile(
              "package.json",
              "utf8",
            );

            if (packageJsonExists) {
              if (terminalRef.current?.writeToTerminal) {
                terminalRef.current.writeToTerminal(
                  "🔄 Reconnecting to existing WebContainer session...\r\n",
                );
              }

              // IMPORTANT:
              // If the WebContainer hook already knows the server URL,
              // use it immediately instead of waiting for server-ready.
              if (serverUrl) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(
                    `🌐 Reconnected to server at ${serverUrl}\r\n`,
                  );
                }

                setPreviewUrl(serverUrl);

                setLoadingState((prev) => ({
                  ...prev,
                  starting: false,
                  ready: true,
                }));

                setCurrentStep(4);
                setIsSetupComplete(true);
                setIsSetupInProgress(false);

                return;
              }

              // If serverUrl is not available yet, listen for server-ready.
              const handleServerReady = (port: number, url: string) => {
                console.log(`WebContainer server ready on port ${port}:`, url);

                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(
                    `🌐 Reconnected to server at ${url}\r\n`,
                  );
                }

                setPreviewUrl(url);

                setLoadingState((prev) => ({
                  ...prev,
                  starting: false,
                  ready: true,
                }));

                setCurrentStep(4);
                setIsSetupComplete(true);
                setIsSetupInProgress(false);
              };

              instance.on("server-ready", handleServerReady);

              setCurrentStep(4);

              setLoadingState((prev) => ({
                ...prev,
                starting: true,
              }));

              return;
            }
          } catch (err) {
            // package.json does not exist,
            // so this is a fresh WebContainer.
            console.log("No existing package.json. Starting fresh setup.");
          }

          // ---------------------------------------------------------
          // Step 1: Transform template data
          // ---------------------------------------------------------
          setLoadingState((prev) => ({
            ...prev,
            transforming: true,
          }));

          setCurrentStep(1);

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              "🔄 Transforming template data to WebContainer format...\r\n",
            );
          }

          // @ts-ignore
          const files = transformToWebContainerFormat(templateData);

          setLoadingState((prev) => ({
            ...prev,
            transforming: false,
            mounting: true,
          }));

          setCurrentStep(2);

          // ---------------------------------------------------------
          // Step 2: Mount files
          // ---------------------------------------------------------
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              "📂 Mounting files to WebContainer...\r\n",
            );
          }

          await instance.mount(files);

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              "✅ Files mounted successfully\r\n",
            );
          }

          setLoadingState((prev) => ({
            ...prev,
            mounting: false,
            installing: true,
          }));

          setCurrentStep(3);

          // ---------------------------------------------------------
          // Step 3: Install dependencies
          // ---------------------------------------------------------
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              "📦 Installing dependencies...\r\n",
            );
          }

          const installProcess = await instance.spawn("npm", ["install"]);

          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            }),
          );

          const installExitCode = await installProcess.exit;

          if (installExitCode !== 0) {
            throw new Error(
              `Installation failed with exit code ${installExitCode}`,
            );
          }

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              "✅ Dependencies installed successfully\r\n",
            );
          }

          setLoadingState((prev) => ({
            ...prev,
            installing: false,
            starting: true,
          }));

          setCurrentStep(4);

          // ---------------------------------------------------------
          // Step 4: Start server
          // ---------------------------------------------------------
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              "🚀 Starting the development server...\r\n",
            );
          }

          const startProcess = await instance.spawn("npm", ["run", "start"]);

          instance.on("server-ready", (port: number, url: string) => {
            console.log(`WebContainer server ready on port ${port}:`, url);

            if (terminalRef.current?.writeToTerminal) {
              terminalRef.current.writeToTerminal(
                `🌐 Server ready at ${url}\r\n`,
              );
            }

            setPreviewUrl(url);

            setLoadingState((prev) => ({
              ...prev,
              starting: false,
              ready: true,
            }));

            setIsSetupComplete(true);
            setIsSetupInProgress(false);
          });

          startProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            }),
          );
        } catch (err) {
          console.error("Error setting up WebContainer:", err);

          const errorMessage =
            err instanceof Error ? err.message : "Unknown error occurred";

          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              `❌ Error setting up WebContainer: ${errorMessage}\r\n`,
            );
          }

          setSetupError(errorMessage);
          setIsSetupInProgress(false);

          setLoadingState({
            transforming: false,
            mounting: false,
            installing: false,
            starting: false,
            ready: false,
          });
        }
      }

      setupContainer();
    }, [instance, templateData, isSetupComplete, isSetupInProgress, serverUrl]);

    // ---------------------------------------------------------
    // Loading state
    // ---------------------------------------------------------
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />

            <h3 className="text-lg font-medium">Initializing WebContainer</h3>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Setting up the environment for your project...
            </p>
          </div>
        </div>
      );
    }

    // ---------------------------------------------------------
    // Error state
    // ---------------------------------------------------------
    if (error || setupError) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5" />

              <h3 className="font-semibold">Error</h3>
            </div>

            <p className="text-sm">{error || setupError}</p>
          </div>
        </div>
      );
    }

    // ---------------------------------------------------------
    // Progress helpers
    // ---------------------------------------------------------
    const getStepIcon = (stepIndex: number) => {
      if (stepIndex < currentStep) {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      }

      if (stepIndex === currentStep) {
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      }

      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    };

    const getStepText = (stepIndex: number, label: string) => {
      const isActive = stepIndex === currentStep;
      const isComplete = stepIndex < currentStep;

      return (
        <span
          className={`text-sm font-medium ${
            isComplete
              ? "text-green-600"
              : isActive
                ? "text-blue-600"
                : "text-gray-500"
          }`}
        >
          {label}
        </span>
      );
    };

    // ---------------------------------------------------------
    // UI
    // ---------------------------------------------------------
    return (
      <div className="h-full w-full flex flex-col">
        {!previewUrl ? (
          <div className="h-full flex flex-col">
            <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
              <Progress
                value={(currentStep / totalSteps) * 100}
                className="h-2 mb-6"
              />

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  {getStepIcon(1)}
                  {getStepText(1, "Transforming template data")}
                </div>

                <div className="flex items-center gap-3">
                  {getStepIcon(2)}
                  {getStepText(2, "Mounting files")}
                </div>

                <div className="flex items-center gap-3">
                  {getStepIcon(3)}
                  {getStepText(3, "Installing dependencies")}
                </div>

                <div className="flex items-center gap-3">
                  {getStepIcon(4)}
                  {getStepText(4, "Starting development server")}
                </div>
              </div>
            </div>

            <div className="flex-1 p-4">
              <TerminalComponent
                ref={terminalRef}
                webContainerInstance={instance}
                theme="dark"
                className="h-full"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <iframe
                key={previewKey}
                src={previewUrl}
                className="w-full h-full border-none"
                title="WebContainer Preview"
              />
            </div>

            <div className="h-64 border-t">
              <TerminalComponent
                ref={terminalRef}
                webContainerInstance={instance}
                theme="dark"
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);

WebContainerPreview.displayName = "WebContainerPreview";

export default WebContainerPreview;
