import { describe, it, expect, beforeEach, vi } from "vitest";
import { toast } from "sonner";
import { useFileExplorer } from "./useFileExplorer";
import type { TemplateFile, TemplateFolder } from "../lib/path-to-json";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const buildTemplateData = (): TemplateFolder => ({
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
        {
          folderName: "components",
          items: [
            { filename: "button", fileExtension: "tsx", content: "Button" },
          ],
        },
      ],
    },
  ],
});

const rootFile: TemplateFile = {
  filename: "index",
  fileExtension: "ts",
  content: "console.log(1)",
};

const nestedFile: TemplateFile = {
  filename: "app",
  fileExtension: "tsx",
  content: "export default App",
};

const deeplyNestedFile: TemplateFile = {
  filename: "button",
  fileExtension: "tsx",
  content: "Button",
};

describe("useFileExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileExplorer.setState({
      playgroundId: "",
      templateData: null,
      openFiles: [],
      activeFileId: null,
      editorContent: "",
    });
  });

  describe("handleAddFile", () => {
    it("does nothing when templateData is not set", async () => {
      const saveTemplateData = vi.fn();
      const writeFileSync = vi.fn();

      await useFileExplorer.getState().handleAddFile(
        { filename: "new", fileExtension: "ts", content: "" },
        "",
        writeFileSync,
        null,
        saveTemplateData,
      );

      expect(saveTemplateData).not.toHaveBeenCalled();
      expect(writeFileSync).not.toHaveBeenCalled();
      expect(useFileExplorer.getState().templateData).toBeNull();
    });

    it("adds a new file at the root level and opens it", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const writeFileSync = vi.fn().mockResolvedValue(undefined);
      const newFile: TemplateFile = {
        filename: "readme",
        fileExtension: "md",
        content: "# hi",
      };

      await useFileExplorer
        .getState()
        .handleAddFile(newFile, "", writeFileSync, null, saveTemplateData);

      const { templateData, openFiles, activeFileId } = useFileExplorer.getState();
      expect(
        templateData!.items.some(
          (item) => "filename" in item && item.filename === "readme",
        ),
      ).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith("readme.md", "# hi");
      expect(saveTemplateData).toHaveBeenCalledWith(templateData);
      expect(openFiles).toHaveLength(1);
      expect(openFiles[0].filename).toBe("readme");
      expect(activeFileId).toBe(openFiles[0].id);
      expect(toast.success).toHaveBeenCalledWith("Created file: readme.md");
    });

    it("adds a new file inside a nested folder using parentPath", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const writeFileSync = vi.fn().mockResolvedValue(undefined);
      const newFile: TemplateFile = {
        filename: "utils",
        fileExtension: "ts",
        content: "export {}",
      };

      await useFileExplorer
        .getState()
        .handleAddFile(newFile, "src", writeFileSync, null, saveTemplateData);

      const { templateData } = useFileExplorer.getState();
      const srcFolder = templateData!.items.find(
        (item) => "folderName" in item && item.folderName === "src",
      ) as TemplateFolder;
      expect(
        srcFolder.items.some(
          (item) => "filename" in item && item.filename === "utils",
        ),
      ).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith("src/utils.ts", "export {}");
    });

    it("shows an error toast and does not throw when saveTemplateData rejects", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockRejectedValue(new Error("boom"));
      const writeFileSync = vi.fn().mockResolvedValue(undefined);
      const newFile: TemplateFile = {
        filename: "broken",
        fileExtension: "ts",
        content: "",
      };

      await expect(
        useFileExplorer
          .getState()
          .handleAddFile(newFile, "", writeFileSync, null, saveTemplateData),
      ).resolves.toBeUndefined();

      expect(toast.error).toHaveBeenCalledWith("Failed to create file");
    });
  });

  describe("handleAddFolder", () => {
    it("does nothing when templateData is not set", async () => {
      const saveTemplateData = vi.fn();
      await useFileExplorer
        .getState()
        .handleAddFolder({ folderName: "new", items: [] }, "", null, saveTemplateData);
      expect(saveTemplateData).not.toHaveBeenCalled();
    });

    it("adds a folder at the root and calls saveTemplateData", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const newFolder: TemplateFolder = { folderName: "assets", items: [] };

      await useFileExplorer
        .getState()
        .handleAddFolder(newFolder, "", null, saveTemplateData);

      const { templateData } = useFileExplorer.getState();
      expect(
        templateData!.items.some(
          (item) => "folderName" in item && item.folderName === "assets",
        ),
      ).toBe(true);
      expect(saveTemplateData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Created folder: assets");
    });

    it("adds a nested folder and syncs with the webcontainer instance when provided", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const mkdir = vi.fn().mockResolvedValue(undefined);
      const instance = { fs: { mkdir } };
      const newFolder: TemplateFolder = { folderName: "hooks", items: [] };

      await useFileExplorer
        .getState()
        .handleAddFolder(newFolder, "src", instance, saveTemplateData);

      expect(mkdir).toHaveBeenCalledWith("src/hooks", { recursive: true });
    });

    it("does not attempt to sync with the filesystem when no instance is provided", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const newFolder: TemplateFolder = { folderName: "hooks", items: [] };

      await expect(
        useFileExplorer
          .getState()
          .handleAddFolder(newFolder, "src", null, saveTemplateData),
      ).resolves.toBeUndefined();
    });

    it("shows an error toast when saveTemplateData rejects", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockRejectedValue(new Error("fail"));

      await useFileExplorer
        .getState()
        .handleAddFolder({ folderName: "x", items: [] }, "", null, saveTemplateData);

      expect(toast.error).toHaveBeenCalledWith("Failed to create folder");
    });
  });

  describe("handleDeleteFile", () => {
    it("does nothing when templateData is not set", async () => {
      const saveTemplateData = vi.fn();
      await useFileExplorer.getState().handleDeleteFile(rootFile, "", saveTemplateData);
      expect(saveTemplateData).not.toHaveBeenCalled();
    });

    it("removes a root-level file from templateData", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);

      await useFileExplorer.getState().handleDeleteFile(rootFile, "", saveTemplateData);

      const { templateData } = useFileExplorer.getState();
      expect(
        templateData!.items.some(
          (item) => "filename" in item && item.filename === "index",
        ),
      ).toBe(false);
      expect(saveTemplateData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Deleted file: index.ts");
    });

    it("removes a nested file from templateData", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);

      await useFileExplorer
        .getState()
        .handleDeleteFile(nestedFile, "src", saveTemplateData);

      const { templateData } = useFileExplorer.getState();
      const srcFolder = templateData!.items.find(
        (item) => "folderName" in item && item.folderName === "src",
      ) as TemplateFolder;
      expect(
        srcFolder.items.some(
          (item) => "filename" in item && item.filename === "app",
        ),
      ).toBe(false);
    });

    it("closes the file if it is currently open", async () => {
      const templateData = buildTemplateData();
      useFileExplorer.setState({ templateData });
      useFileExplorer.getState().openFile(rootFile);
      expect(useFileExplorer.getState().openFiles).toHaveLength(1);

      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      await useFileExplorer.getState().handleDeleteFile(rootFile, "", saveTemplateData);

      expect(useFileExplorer.getState().openFiles).toHaveLength(0);
      expect(useFileExplorer.getState().activeFileId).toBeNull();
    });

    it("shows an error toast when saveTemplateData rejects", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockRejectedValue(new Error("fail"));

      await useFileExplorer.getState().handleDeleteFile(rootFile, "", saveTemplateData);

      expect(toast.error).toHaveBeenCalledWith("Failed to delete file");
    });
  });

  describe("handleDeleteFolder", () => {
    it("does nothing when templateData is not set", async () => {
      const saveTemplateData = vi.fn();
      await useFileExplorer
        .getState()
        .handleDeleteFolder({ folderName: "src", items: [] }, "", saveTemplateData);
      expect(saveTemplateData).not.toHaveBeenCalled();
    });

    it("removes the folder from templateData", async () => {
      const templateData = buildTemplateData();
      useFileExplorer.setState({ templateData });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const srcFolder = templateData.items.find(
        (item) => "folderName" in item && item.folderName === "src",
      ) as TemplateFolder;

      await useFileExplorer
        .getState()
        .handleDeleteFolder(srcFolder, "", saveTemplateData);

      const { templateData: updated } = useFileExplorer.getState();
      expect(
        updated!.items.some(
          (item) => "folderName" in item && item.folderName === "src",
        ),
      ).toBe(false);
      expect(toast.success).toHaveBeenCalledWith("Deleted folder: src");
    });

    it("recursively closes all open files within the deleted folder and its subfolders", async () => {
      const templateData = buildTemplateData();
      useFileExplorer.setState({ templateData });

      // Open a file directly inside "src" and one nested inside "src/components"
      useFileExplorer.getState().openFile(nestedFile);
      useFileExplorer.getState().openFile(deeplyNestedFile);
      // And a root file that is unrelated to the deleted folder
      useFileExplorer.getState().openFile(rootFile);
      expect(useFileExplorer.getState().openFiles).toHaveLength(3);

      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const srcFolder = templateData.items.find(
        (item) => "folderName" in item && item.folderName === "src",
      ) as TemplateFolder;

      await useFileExplorer
        .getState()
        .handleDeleteFolder(srcFolder, "", saveTemplateData);

      const { openFiles } = useFileExplorer.getState();
      expect(openFiles).toHaveLength(1);
      expect(openFiles[0].filename).toBe("index");
    });

    it("shows an error toast when saveTemplateData rejects", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockRejectedValue(new Error("fail"));

      await useFileExplorer
        .getState()
        .handleDeleteFolder({ folderName: "src", items: [] }, "", saveTemplateData);

      expect(toast.error).toHaveBeenCalledWith("Failed to delete folder");
    });
  });

  describe("handleRenameFile", () => {
    it("does nothing when templateData is not set", async () => {
      const saveTemplateData = vi.fn();
      await useFileExplorer
        .getState()
        .handleRenameFile(rootFile, "renamed", "ts", "", saveTemplateData);
      expect(saveTemplateData).not.toHaveBeenCalled();
    });

    it("renames a file in templateData and calls saveTemplateData", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);

      await useFileExplorer
        .getState()
        .handleRenameFile(rootFile, "main", "ts", "", saveTemplateData);

      const { templateData } = useFileExplorer.getState();
      expect(
        templateData!.items.some(
          (item) => "filename" in item && item.filename === "main",
        ),
      ).toBe(true);
      expect(
        templateData!.items.some(
          (item) => "filename" in item && item.filename === "index",
        ),
      ).toBe(false);
      expect(saveTemplateData).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Renamed file to: main.ts");
    });

    it("updates the open file entry and preserves the active file selection", async () => {
      const templateData = buildTemplateData();
      useFileExplorer.setState({ templateData });
      useFileExplorer.getState().openFile(rootFile);
      const oldId = useFileExplorer.getState().activeFileId;

      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      await useFileExplorer
        .getState()
        .handleRenameFile(rootFile, "main", "ts", "", saveTemplateData);

      const { openFiles, activeFileId } = useFileExplorer.getState();
      expect(openFiles).toHaveLength(1);
      expect(openFiles[0].filename).toBe("main");
      expect(openFiles[0].id).not.toBe(oldId);
      expect(activeFileId).toBe(openFiles[0].id);
    });

    it("does not modify state when the file cannot be found at the given path", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const missingFile: TemplateFile = {
        filename: "does-not-exist",
        fileExtension: "ts",
        content: "",
      };

      await useFileExplorer
        .getState()
        .handleRenameFile(missingFile, "renamed", "ts", "", saveTemplateData);

      expect(saveTemplateData).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("shows an error toast when saveTemplateData rejects", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockRejectedValue(new Error("fail"));

      await useFileExplorer
        .getState()
        .handleRenameFile(rootFile, "main", "ts", "", saveTemplateData);

      expect(toast.error).toHaveBeenCalledWith("Failed to rename file");
    });
  });

  describe("handleRenameFolder", () => {
    it("does nothing when templateData is not set", async () => {
      const saveTemplateData = vi.fn();
      await useFileExplorer
        .getState()
        .handleRenameFolder({ folderName: "src", items: [] }, "lib", "", saveTemplateData);
      expect(saveTemplateData).not.toHaveBeenCalled();
    });

    it("renames a folder in templateData and calls saveTemplateData", async () => {
      const templateData = buildTemplateData();
      useFileExplorer.setState({ templateData });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);
      const srcFolder = templateData.items.find(
        (item) => "folderName" in item && item.folderName === "src",
      ) as TemplateFolder;

      await useFileExplorer
        .getState()
        .handleRenameFolder(srcFolder, "lib", "", saveTemplateData);

      const { templateData: updated } = useFileExplorer.getState();
      expect(
        updated!.items.some(
          (item) => "folderName" in item && item.folderName === "lib",
        ),
      ).toBe(true);
      expect(toast.success).toHaveBeenCalledWith("Renamed folder to: lib");
    });

    it("does not modify state when the folder cannot be found at the given path", async () => {
      useFileExplorer.setState({ templateData: buildTemplateData() });
      const saveTemplateData = vi.fn().mockResolvedValue(undefined);

      await useFileExplorer
        .getState()
        .handleRenameFolder(
          { folderName: "does-not-exist", items: [] },
          "renamed",
          "",
          saveTemplateData,
        );

      expect(saveTemplateData).not.toHaveBeenCalled();
    });

    it("shows an error toast when saveTemplateData rejects", async () => {
      const templateData = buildTemplateData();
      useFileExplorer.setState({ templateData });
      const saveTemplateData = vi.fn().mockRejectedValue(new Error("fail"));
      const srcFolder = templateData.items.find(
        (item) => "folderName" in item && item.folderName === "src",
      ) as TemplateFolder;

      await useFileExplorer
        .getState()
        .handleRenameFolder(srcFolder, "lib", "", saveTemplateData);

      expect(toast.error).toHaveBeenCalledWith("Failed to rename folder");
    });
  });

  describe("updateFileContent", () => {
    it("updates a file's content and marks it as having unsaved changes", () => {
      useFileExplorer.setState({
        templateData: buildTemplateData(),
        openFiles: [
          {
            ...rootFile,
            id: "index.ts",
            content: "console.log(1)",
            originalContent: "console.log(1)",
            hasUnsavedChanges: false,
          },
        ],
        activeFileId: "index.ts",
      });

      useFileExplorer.getState().updateFileContent("index.ts", "console.log(2)");

      const { openFiles, editorContent } = useFileExplorer.getState();
      expect(openFiles[0].content).toBe("console.log(2)");
      expect(openFiles[0].hasUnsavedChanges).toBe(true);
      expect(editorContent).toBe("console.log(2)");
    });

    it("marks hasUnsavedChanges as false when content matches the original content again", () => {
      useFileExplorer.setState({
        openFiles: [
          {
            ...rootFile,
            id: "index.ts",
            content: "console.log(2)",
            originalContent: "console.log(1)",
            hasUnsavedChanges: true,
          },
        ],
        activeFileId: "index.ts",
      });

      useFileExplorer.getState().updateFileContent("index.ts", "console.log(1)");

      expect(useFileExplorer.getState().openFiles[0].hasUnsavedChanges).toBe(false);
    });

    it("does not update editorContent when the changed file is not the active file", () => {
      useFileExplorer.setState({
        openFiles: [
          {
            ...rootFile,
            id: "index.ts",
            content: "console.log(1)",
            originalContent: "console.log(1)",
            hasUnsavedChanges: false,
          },
        ],
        activeFileId: "other-file-id",
        editorContent: "unchanged",
      });

      useFileExplorer.getState().updateFileContent("index.ts", "console.log(2)");

      expect(useFileExplorer.getState().editorContent).toBe("unchanged");
      expect(useFileExplorer.getState().openFiles[0].content).toBe("console.log(2)");
    });

    it("leaves other open files untouched", () => {
      useFileExplorer.setState({
        openFiles: [
          {
            ...rootFile,
            id: "index.ts",
            content: "a",
            originalContent: "a",
            hasUnsavedChanges: false,
          },
          {
            ...nestedFile,
            id: "src/app.tsx",
            content: "b",
            originalContent: "b",
            hasUnsavedChanges: false,
          },
        ],
        activeFileId: "index.ts",
      });

      useFileExplorer.getState().updateFileContent("index.ts", "a-changed");

      const { openFiles } = useFileExplorer.getState();
      expect(openFiles[1].content).toBe("b");
      expect(openFiles[1].hasUnsavedChanges).toBe(false);
    });
  });
});