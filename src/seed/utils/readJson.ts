import fs from "fs/promises";
import path from "path";

export const readJsonFile = async (filePath: string) => {
  const fileData = await fs.readFile(
    path.join(__dirname, "../../../..", "data", filePath),
    "utf-8"
  );
  return JSON.parse(fileData);
};
