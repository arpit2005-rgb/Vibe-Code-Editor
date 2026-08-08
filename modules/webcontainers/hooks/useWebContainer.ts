import { useState, useEffect, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContainerReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destroy: () => void;
}

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContainerReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);

  useEffect(() => {
    let mounted = true;
    let webcontainerInstance: WebContainer | null = null;

    async function initializeWebContainer() {
      try {
        webcontainerInstance = await WebContainer.boot();

        if (!mounted) {
          webcontainerInstance.teardown();
          return;
        }

        setInstance(webcontainerInstance);
        setIsLoading(false);

        // IMPORTANT:
        // Save the URL whenever WebContainer's server becomes ready.
        webcontainerInstance.on("server-ready", (_port, url) => {
          if (!mounted) return;

          console.log("WebContainer server ready:", url);
          setServerUrl(url);
        });
      } catch (error) {
        console.log("Failed to initialize webcontainer", error);

        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initialize webcontainer",
          );
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
    };
  }, []);

  const writeFileSync = useCallback(
    async (filePath: string, content: string): Promise<void> => {
      if (!instance) {
        throw new Error("WebContainer instance not available");
      }

      try {
        const pathParts = filePath.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");

        if (folderPath) {
          await instance.fs.mkdir(folderPath, {
            recursive: true,
          });
        }

        await instance.fs.writeFile(filePath, content);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to write file";

        console.error(`Failed to write file at path ${filePath}: `, error);

        throw new Error(
          `Failed to write file at path ${filePath}: ${errorMessage}`,
        );
      }
    },
    [instance],
  );

  const destroy = useCallback(() => {
    if (instance) {
      instance.teardown();
    }

    setInstance(null);
    setServerUrl(null);
  }, [instance]);

  return {
    serverUrl,
    isLoading,
    error,
    instance,
    writeFileSync,
    destroy,
  };
};
