import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { TemplateFolder } from "@/modules/playground/lib/path-to-json";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.mock factories are hoisted above imports, so any values
// referenced inside them must be created via vi.hoisted).
// ---------------------------------------------------------------------------
const {
  mockUsePlayground,
  mockUseWebContainer,
  mockUseFileExplorer,
  mockGetState,
  mockToast,
} = vi.hoisted(() => {
  const mockUsePlayground = vi.fn();
  const mockUseWebContainer = vi.fn();
  const mockGetState = vi.fn();
  const mockUseFileExplorer: any = vi.fn();
  mockUseFileExplorer.getState = (...args: unknown[]) => mockGetState(...args);
  const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
  return {
    mockUsePlayground,
    mockUseWebContainer,
    mockUseFileExplorer,
    mockGetState,
    mockToast,
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "playground-1" }),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

vi.mock("@/modules/playground/hooks/usePlayground", () => ({
  usePlayground: mockUsePlayground,
}));

vi.mock("@/modules/webcontainers/hooks/useWebContainer", () => ({
  useWebContainer: mockUseWebContainer,
}));

vi.mock("@/modules/playground/hooks/useFileExplorer", () => ({
  useFileExplorer: mockUseFileExplorer,
}));

// UI primitives are mocked out to keep the tests focused on the page's own
// logic instead of the underlying radix-ui / react-resizable-panels behavior.
// TooltipContent is wrapped in a real <span> (rather than a Fragment) so
// that tests can reliably locate the adjacent trigger button via
// `previousElementSibling`.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarInset: ({ children }: any) => <div>{children}</div>,
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Trigger</button>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizableHandle: () => <div data-testid="resizable-handle" />,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/modules/playground/components/playground-explorer", () => ({
  TemplateFileTree: (props: any) => (
    <div data-testid="template-file-tree">
      <button onClick={() => props.onFileSelect(props.data.items[0])}>
        SelectFile
      </button>
      <button
        onClick={() =>
          props.onAddFile(
            { filename: "new-file", fileExtension: "ts", content: "" },
            "src",
          )
        }
      >
        AddFile
      </button>
      <button
        onClick={() =>
          props.onAddFolder({ folderName: "new-folder", items: [] }, "src")
        }
      >
        AddFolder
      </button>
      <button
        onClick={() =>
          props.onDeleteFile(
            { filename: "index", fileExtension: "ts", content: "" },
            "src",
          )
        }
      >
        DeleteFile
      </button>
      <button
        onClick={() =>
          props.onDeleteFolder({ folderName: "src", items: [] }, "")
        }
      >
        DeleteFolder
      </button>
      <button
        onClick={() =>
          props.onRenameFile(
            { filename: "index", fileExtension: "ts", content: "" },
            "renamed",
            "ts",
            "src",
          )
        }
      >
        RenameFile
      </button>
      <button
        onClick={() =>
          props.onRenameFolder({ folderName: "src", items: [] }, "lib", "")
        }
      >
        RenameFolder
      </button>
    </div>
  ),
}));

vi.mock("@/modules/playground/components/playground-editor", () => ({
  default: (props: any) => (
    <div data-testid="playground-editor">
      <span data-testid="editor-content">{props.content}</span>
      <button onClick={() => props.onContentChange("updated-content")}>
        ChangeContent
      </button>
    </div>
  ),
}));

vi.mock("@/modules/webcontainers/components/webcontainer-preview", () => ({
  default: () => <div data-testid="webcontainer-preview">Preview</div>,
}));

// eslint-disable-next-line import/first
import MainPlaygroundPage from "./page";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const sampleTemplateData: TemplateFolder = {
  folderName: "root",
  items: [
    { filename: "index", fileExtension: "ts", content: "console.log(1)" },
    {
      folderName: "src",
      items: [
        {
          filename: "app",
          fileExtension: "tsx",
          content: "export default App",
        },
      ],
    },
  ],
};

function defaultPlayground(overrides: Record<string, any> = {}) {
  return {
    templateData: sampleTemplateData,
    playgroundData: { title: "My Playground" },
    isLoading: false,
    error: null as string | null,
    saveTemplateData: vi.fn().mockResolvedValue(undefined),
    loadPlayground: vi.fn(),
    ...overrides,
  };
}

function defaultFileExplorerState(overrides: Record<string, any> = {}) {
  return {
    templateData: sampleTemplateData,
    setTemplateData: vi.fn(),
    setActiveFileId: vi.fn(),
    setPlaygroundId: vi.fn(),
    setOpenFiles: vi.fn(),
    activeFileId: null as string | null,
    closeAllFiles: vi.fn(),
    closeFile: vi.fn(),
    openFile: vi.fn(),
    openFiles: [] as any[],
    handleAddFile: vi.fn().mockResolvedValue(undefined),
    handleAddFolder: vi.fn().mockResolvedValue(undefined),
    handleDeleteFile: vi.fn().mockResolvedValue(undefined),
    handleDeleteFolder: vi.fn().mockResolvedValue(undefined),
    handleRenameFile: vi.fn().mockResolvedValue(undefined),
    handleRenameFolder: vi.fn().mockResolvedValue(undefined),
    updateFileContent: vi.fn(),
    ...overrides,
  };
}

function defaultWebContainer(overrides: Record<string, any> = {}) {
  return {
    serverUrl: "http://localhost:3000",
    isLoading: false,
    error: null as string | null,
    instance: {
      fs: {
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined),
      },
    },
    writeFileSync: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setup({
  playground = {},
  fileExplorer = {},
  webContainer = {},
}: {
  playground?: Record<string, any>;
  fileExplorer?: Record<string, any>;
  webContainer?: Record<string, any>;
} = {}) {
  const playgroundState = defaultPlayground(playground);
  const fileExplorerState = defaultFileExplorerState(fileExplorer);
  const webContainerState = defaultWebContainer(webContainer);

  mockUsePlayground.mockReturnValue(playgroundState);
  mockUseWebContainer.mockReturnValue(webContainerState);
  mockUseFileExplorer.mockReturnValue(fileExplorerState);
  mockGetState.mockReturnValue(fileExplorerState);

  return { playgroundState, fileExplorerState, webContainerState };
}

function makeOpenFile(overrides: Record<string, any> = {}) {
  return {
    id: "open-index",
    filename: "index",
    fileExtension: "ts",
    content: "console.log(1)",
    originalContent: "console.log(1)",
    hasUnsavedChanges: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { reload: vi.fn() },
    writable: true,
  });
});

describe("MainPlaygroundPage", () => {
  describe("top level states", () => {
    it("renders an error state with a retry button that reloads the page", () => {
      setup({ playground: { error: "Something failed" } });

      render(<MainPlaygroundPage />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Something failed")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Try Again"));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it("renders the loading state with all three loading steps", () => {
      setup({ playground: { isLoading: true } });

      render(<MainPlaygroundPage />);

      expect(screen.getByText("Loading Playground")).toBeInTheDocument();
      expect(screen.getByText("Loading playground data")).toBeInTheDocument();
      expect(screen.getByText("Setting up environment")).toBeInTheDocument();
      expect(screen.getByText("Ready to code")).toBeInTheDocument();
    });

    it("renders a message when no template data is available and reloads on click", () => {
      setup({ playground: { templateData: null } });

      render(<MainPlaygroundPage />);

      expect(
        screen.getByText("No template data available"),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText("Reload Template"));
      expect(window.location.reload).toHaveBeenCalled();
    });

    it("renders the main editor UI once data is loaded", () => {
      setup();

      render(<MainPlaygroundPage />);

      expect(screen.getByText("My Playground")).toBeInTheDocument();
      expect(screen.getByText("0 File(s) Open")).toBeInTheDocument();
      expect(screen.getByText("No files open")).toBeInTheDocument();
    });
  });

  describe("wrapped file-explorer handlers", () => {
    it("forwards writeFileSync, instance and saveTemplateData to handleAddFile", () => {
      const { fileExplorerState, playgroundState, webContainerState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("AddFile"));

      expect(fileExplorerState.handleAddFile).toHaveBeenCalledWith(
        { filename: "new-file", fileExtension: "ts", content: "" },
        "src",
        webContainerState.writeFileSync,
        webContainerState.instance,
        playgroundState.saveTemplateData,
      );
    });

    it("forwards instance and saveTemplateData to handleAddFolder", () => {
      const { fileExplorerState, playgroundState, webContainerState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("AddFolder"));

      expect(fileExplorerState.handleAddFolder).toHaveBeenCalledWith(
        { folderName: "new-folder", items: [] },
        "src",
        webContainerState.instance,
        playgroundState.saveTemplateData,
      );
    });

    it("forwards saveTemplateData to handleDeleteFile", () => {
      const { fileExplorerState, playgroundState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("DeleteFile"));

      expect(fileExplorerState.handleDeleteFile).toHaveBeenCalledWith(
        { filename: "index", fileExtension: "ts", content: "" },
        "src",
        playgroundState.saveTemplateData,
      );
    });

    it("forwards saveTemplateData to handleDeleteFolder", () => {
      const { fileExplorerState, playgroundState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("DeleteFolder"));

      expect(fileExplorerState.handleDeleteFolder).toHaveBeenCalledWith(
        { folderName: "src", items: [] },
        "",
        playgroundState.saveTemplateData,
      );
    });

    it("forwards saveTemplateData to handleRenameFile", () => {
      const { fileExplorerState, playgroundState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("RenameFile"));

      expect(fileExplorerState.handleRenameFile).toHaveBeenCalledWith(
        { filename: "index", fileExtension: "ts", content: "" },
        "renamed",
        "ts",
        "src",
        playgroundState.saveTemplateData,
      );
    });

    it("forwards saveTemplateData to handleRenameFolder", () => {
      const { fileExplorerState, playgroundState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("RenameFolder"));

      expect(fileExplorerState.handleRenameFolder).toHaveBeenCalledWith(
        { folderName: "src", items: [] },
        "lib",
        "",
        playgroundState.saveTemplateData,
      );
    });

    it("opens the selected file via openFile", () => {
      const { fileExplorerState } = setup();

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("SelectFile"));

      expect(fileExplorerState.openFile).toHaveBeenCalledWith(
        sampleTemplateData.items[0],
      );
    });
  });

  describe("saving files", () => {
    it("disables the Save button when the active file has no unsaved changes", () => {
      const savedFile = makeOpenFile({ hasUnsavedChanges: false });
      setup({
        fileExplorer: { openFiles: [savedFile], activeFileId: savedFile.id },
      });

      render(<MainPlaygroundPage />);

      const saveButton = screen.getByText("Save (Ctrl+S)")
        .previousElementSibling as HTMLButtonElement;
      expect(saveButton).toBeDisabled();
    });

    it("enables the Save button when the active file has unsaved changes and saves it on click", async () => {
      const unsavedFile = makeOpenFile({
        content: "console.log(2)",
        hasUnsavedChanges: true,
      });
      const { fileExplorerState, playgroundState, webContainerState } = setup({
        fileExplorer: {
          openFiles: [unsavedFile],
          activeFileId: unsavedFile.id,
        },
      });

      render(<MainPlaygroundPage />);

      const saveButton = screen.getByText("Save (Ctrl+S)")
        .previousElementSibling as HTMLButtonElement;
      expect(saveButton).not.toBeDisabled();

      fireEvent.click(saveButton);

      await waitFor(() =>
        expect(webContainerState.writeFileSync).toHaveBeenCalledWith(
          "index.ts",
          "console.log(2)",
        ),
      );
      expect(webContainerState.instance.fs.writeFile).toHaveBeenCalledWith(
        "index.ts",
        "console.log(2)",
      );
      expect(playgroundState.saveTemplateData).toHaveBeenCalled();
      expect(fileExplorerState.setOpenFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: unsavedFile.id,
          hasUnsavedChanges: false,
          content: "console.log(2)",
        }),
      ]);
      expect(mockToast.success).toHaveBeenCalledWith("Saved index.ts");
    });

    it("saves the active file when Ctrl+S is pressed", async () => {
      const unsavedFile = makeOpenFile({
        content: "console.log(2)",
        hasUnsavedChanges: true,
      });
      const { playgroundState } = setup({
        fileExplorer: {
          openFiles: [unsavedFile],
          activeFileId: unsavedFile.id,
        },
      });

      render(<MainPlaygroundPage />);

      fireEvent.keyDown(window, { key: "s", ctrlKey: true });

      await waitFor(() =>
        expect(playgroundState.saveTemplateData).toHaveBeenCalled(),
      );
    });

    it("shows an error toast and skips saving when the file path cannot be found", async () => {
      const unsavedFile = makeOpenFile({
        filename: "missing",
        fileExtension: "ts",
        hasUnsavedChanges: true,
      });
      const { playgroundState, webContainerState } = setup({
        fileExplorer: {
          openFiles: [unsavedFile],
          activeFileId: unsavedFile.id,
        },
      });

      render(<MainPlaygroundPage />);

      const saveButton = screen.getByText("Save (Ctrl+S)")
        .previousElementSibling as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not find path for file: missing.ts",
        ),
      );
      expect(webContainerState.writeFileSync).not.toHaveBeenCalled();
      expect(playgroundState.saveTemplateData).not.toHaveBeenCalled();
    });

    it("disables the Save All button when there are no unsaved changes", () => {
      const savedFile = makeOpenFile({ hasUnsavedChanges: false });
      setup({ fileExplorer: { openFiles: [savedFile] } });

      render(<MainPlaygroundPage />);

      const saveAllButton = screen.getByText("Save All (Ctrl+Shift+S)")
        .previousElementSibling as HTMLButtonElement;
      expect(saveAllButton).toBeDisabled();
    });

    it("saves all unsaved files when Save All is clicked", async () => {
      const unsavedIndex = makeOpenFile({
        id: "open-index",
        filename: "index",
        fileExtension: "ts",
        content: "console.log(2)",
        hasUnsavedChanges: true,
      });
      const unsavedApp = makeOpenFile({
        id: "open-app",
        filename: "app",
        fileExtension: "tsx",
        content: "export default AppV2",
        hasUnsavedChanges: true,
      });
      const { playgroundState, webContainerState } = setup({
        fileExplorer: { openFiles: [unsavedIndex, unsavedApp] },
      });

      render(<MainPlaygroundPage />);

      const saveAllButton = screen.getByText("Save All (Ctrl+Shift+S)")
        .previousElementSibling as HTMLButtonElement;
      expect(saveAllButton).not.toBeDisabled();

      fireEvent.click(saveAllButton);

      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith("Saved 2 file(s)"),
      );
      expect(webContainerState.writeFileSync).toHaveBeenCalledWith(
        "index.ts",
        "console.log(2)",
      );
      expect(webContainerState.writeFileSync).toHaveBeenCalledWith(
        "src/app.tsx",
        "export default AppV2",
      );
      expect(playgroundState.saveTemplateData).toHaveBeenCalledTimes(2);
    });

    it("shows a failure toast when one of the files fails to save during Save All", async () => {
      const unsavedIndex = makeOpenFile({
        id: "open-index",
        filename: "index",
        fileExtension: "ts",
        content: "console.log(2)",
        hasUnsavedChanges: true,
      });
      const saveTemplateData = vi
        .fn()
        .mockRejectedValueOnce(new Error("network error"));
      setup({
        fileExplorer: { openFiles: [unsavedIndex] },
        playground: { saveTemplateData },
      });

      render(<MainPlaygroundPage />);

      const saveAllButton = screen.getByText("Save All (Ctrl+Shift+S)")
        .previousElementSibling as HTMLButtonElement;
      fireEvent.click(saveAllButton);

      await waitFor(() =>
        expect(mockToast.error).toHaveBeenCalledWith(
          "Failed to save some files",
        ),
      );
      expect(mockToast.error).toHaveBeenCalledWith("Failed to save index.ts");
    });
  });

  describe("editor content updates", () => {
    it("calls updateFileContent for the active file when the editor content changes", () => {
      const openFile = makeOpenFile();
      const { fileExplorerState } = setup({
        fileExplorer: { openFiles: [openFile], activeFileId: openFile.id },
      });

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("ChangeContent"));

      expect(fileExplorerState.updateFileContent).toHaveBeenCalledWith(
        openFile.id,
        "updated-content",
      );
    });

    it("does not call updateFileContent when there is no matching active file", () => {
      const openFile = makeOpenFile();
      const { fileExplorerState } = setup({
        fileExplorer: {
          openFiles: [openFile],
          activeFileId: "some-other-id",
        },
      });

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("ChangeContent"));

      expect(fileExplorerState.updateFileContent).not.toHaveBeenCalled();
    });
  });

  describe("header actions", () => {
    it("shows the preview panel after toggling 'Show Preview' from the settings menu", () => {
      const openFile = makeOpenFile();
      setup({ fileExplorer: { openFiles: [openFile], activeFileId: openFile.id } });

      render(<MainPlaygroundPage />);

      expect(
        screen.queryByTestId("webcontainer-preview"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Show Preview"));

      expect(screen.getByTestId("webcontainer-preview")).toBeInTheDocument();
    });

    it("closes all files when 'Close All Files' is clicked", () => {
      const openFile = makeOpenFile();
      const { fileExplorerState } = setup({
        fileExplorer: { openFiles: [openFile], activeFileId: openFile.id },
      });

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("Close All Files"));

      expect(fileExplorerState.closeAllFiles).toHaveBeenCalled();
    });

    it("shows a 'Close All' button next to the tabs when more than one file is open and closes them all on click", () => {
      const openFileA = makeOpenFile({ id: "a", filename: "index" });
      const openFileB = makeOpenFile({ id: "b", filename: "app" });
      const { fileExplorerState } = setup({
        fileExplorer: {
          openFiles: [openFileA, openFileB],
          activeFileId: "a",
        },
      });

      render(<MainPlaygroundPage />);
      fireEvent.click(screen.getByText("Close All"));

      expect(fileExplorerState.closeAllFiles).toHaveBeenCalled();
    });

    it("indicates unsaved changes in the file count summary", () => {
      const unsavedFile = makeOpenFile({ hasUnsavedChanges: true });
      setup({
        fileExplorer: {
          openFiles: [unsavedFile],
          activeFileId: unsavedFile.id,
        },
      });

      render(<MainPlaygroundPage />);

      expect(
        screen.getByText("1 File(s) Open • Unsaved changes"),
      ).toBeInTheDocument();
    });
  });
});