import RNFS from "react-native-fs";
import { deletePlantPhotoById, getPlantPhotoUri, persistTempPlantPhoto, promoteTempPhotoToPlant } from "../photoStorage";

jest.mock("react-native-fs", () => ({
  __esModule: true,
  default: {
    DocumentDirectoryPath: "/documents", mkdir: jest.fn(), exists: jest.fn(),
    readDir: jest.fn(), copyFile: jest.fn(), moveFile: jest.fn(), unlink: jest.fn(),
  },
}));

const files = new Map<string, string>();
const oldPath = "/documents/Flovers/plants/7.jpg";
const tempPath = "/documents/Flovers/tmp/new.png";
const mockMove = RNFS.moveFile as jest.Mock;
const mockCopy = RNFS.copyFile as jest.Mock;
const mockUnlink = RNFS.unlink as jest.Mock;

describe("safe local photo replacement", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    files.clear();
    files.set(oldPath, "old photo");
    files.set(tempPath, "new photo");
    (RNFS.mkdir as jest.Mock).mockResolvedValue(undefined);
    (RNFS.exists as jest.Mock).mockImplementation(async (file: string) => files.has(file));
    (RNFS.readDir as jest.Mock).mockImplementation(async (dir: string) =>
      Array.from(files.keys()).filter((file) => file.startsWith(`${dir}/`)).map((file) => ({
        path: file, name: file.slice(dir.length + 1), isFile: () => true,
      }))
    );
    mockCopy.mockImplementation(async (source: string, destination: string) => {
      if (!files.has(source)) throw new Error("Source missing");
      files.set(destination, files.get(source)!);
    });
    mockMove.mockImplementation(async (source: string, destination: string) => {
      if (!files.has(source)) throw new Error("Source missing");
      files.set(destination, files.get(source)!);
      files.delete(source);
    });
    mockUnlink.mockImplementation(async (file: string) => { files.delete(file); });
  });

  it("preserves the current photo if staging the replacement fails", async () => {
    mockCopy.mockRejectedValueOnce(new Error("Storage full"));
    await expect(persistTempPlantPhoto({ sourceUri: "file:///picked.png", tempKey: "next" })).rejects.toThrow("Storage full");
    expect(files.get(oldPath)).toBe("old photo");
    await expect(getPlantPhotoUri(7)).resolves.toBe(`file://${oldPath}`);
  });

  it("preserves the old photo and excludes a partial new file if promotion fails", async () => {
    mockMove.mockImplementationOnce(async (_source: string, destination: string) => {
      files.set(destination, "partial new photo");
      throw new Error("Rename failed");
    });
    await expect(promoteTempPhotoToPlant({ tempPhotoUri: `file://${tempPath}`, plantId: 7 })).rejects.toThrow("Rename failed");
    expect(files.get(oldPath)).toBe("old photo");
    expect(files.get(tempPath)).toBe("new photo");
    await expect(getPlantPhotoUri(7)).resolves.toBe(`file://${oldPath}`);
  });

  it("commits the new photo before deleting the old one", async () => {
    mockUnlink.mockImplementation(async (file: string) => {
      if (file === oldPath) {
        expect(Array.from(files.entries())).toContainEqual([expect.stringMatching(/\/plants\/7\.\d+-[a-z0-9]*\.png$/), "new photo"]);
      }
      files.delete(file);
    });
    const uri = await promoteTempPhotoToPlant({ tempPhotoUri: `file://${tempPath}`, plantId: 7 });
    expect(files.has(oldPath)).toBe(false);
    await expect(getPlantPhotoUri(7)).resolves.toBe(uri);
  });

  it("uses the committed version even when old-file cleanup fails, and removes all versions on deletion", async () => {
    mockUnlink.mockRejectedValueOnce(new Error("Cleanup failed"));
    const uri = await promoteTempPhotoToPlant({ tempPhotoUri: `file://${tempPath}`, plantId: 7 });
    expect(files.has(oldPath)).toBe(true);
    await expect(getPlantPhotoUri(7)).resolves.toBe(uri);
    files.set("/documents/Flovers/plants/8.jpg", "another plant");
    await deletePlantPhotoById(7);
    await expect(getPlantPhotoUri(7)).resolves.toBeNull();
    expect(files.get("/documents/Flovers/plants/8.jpg")).toBe("another plant");
  });

  it("serializes overlapping replacements so cleanup cannot remove the later commit", async () => {
    let release!: () => void;
    const firstMove = new Promise<void>(resolve => { release = resolve; });
    const normalMove = mockMove.getMockImplementation()!;
    mockMove.mockImplementationOnce(async (source: string, destination: string) => {
      await firstMove;
      await normalMove(source, destination);
    });
    const secondTemp = "/documents/Flovers/tmp/second.png";
    files.set(secondTemp, "second photo");
    const first = promoteTempPhotoToPlant({ tempPhotoUri: `file://${tempPath}`, plantId: 7 });
    const second = promoteTempPhotoToPlant({ tempPhotoUri: `file://${secondTemp}`, plantId: 7 });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(mockMove).toHaveBeenCalledTimes(1);
    expect(files.get(oldPath)).toBe("old photo");
    release();
    const [firstUri, secondUri] = await Promise.all([first, second]);
    expect(firstUri).not.toBe(secondUri);
    await expect(getPlantPhotoUri(7)).resolves.toBe(secondUri);
    expect(Array.from(files.values())).toEqual(["second photo"]);
  });

  it("queues deletion after a pending replacement instead of resurrecting a removed photo", async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const normalMove = mockMove.getMockImplementation()!;
    mockMove.mockImplementationOnce(async (source: string, destination: string) => {
      await gate;
      await normalMove(source, destination);
    });
    const replacing = promoteTempPhotoToPlant({ tempPhotoUri: `file://${tempPath}`, plantId: 7 });
    const deleting = deletePlantPhotoById(7);
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(mockUnlink).not.toHaveBeenCalled();
    release();
    await Promise.all([replacing, deleting]);
    await expect(getPlantPhotoUri(7)).resolves.toBeNull();
  });
});
