import { Command, addCommandHandler } from "./Commands";
import { onImportFolder } from "./dialogs/ImportFolderDialog";

export function registerLibraryCommands() {
  addCommandHandler(Command.ImportFolder, onImportFolder);
}
