import { getAppState } from "./AppState";
import { Command, addCommandHandler } from "./Commands";
import { onImportFolder } from "./dialogs/ImportFolderDialog";
import { showAltTextDialog, showBuildPhashDialog, showRescanFolderDialog, showSimilarityIndexDialog } from "./dialogs/ProgressDialog";

export function registerLibraryCommands() {
  addCommandHandler(Command.ImportFolder, onImportFolder);
  addCommandHandler(Command.BuildPHash, () => showBuildPhashDialog(getAppState().navListId.id));
  addCommandHandler(Command.RescanFolder, () => showRescanFolderDialog(getAppState().navListId.id));
  addCommandHandler(Command.BuildAltText, () => showAltTextDialog(getAppState().navListId));
  addCommandHandler(Command.BuildSimilarityIndex, () => showSimilarityIndexDialog(getAppState().navListId));
}
