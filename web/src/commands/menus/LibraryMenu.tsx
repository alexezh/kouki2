import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import { wireAddDevice } from "../../lib/mobileclient";
import { catchAll } from "../../lib/error";
import { Divider } from "@mui/material";
import { Command, invokeCommand } from "../Commands";
import { MyMenuItem } from "./MyMenuItem";

export function LibraryMenu(props: CommandMenuProps) {
  function handleImportFolder() {
    props.onMenuClose();
    invokeCommand(Command.ImportFolder);
  }

  async function handleAddDevice() {
    props.onMenuClose();
    catchAll(() => wireAddDevice("Ezh14"));
  }

  function handleRescanFolder() {
    props.onMenuClose();
    invokeCommand(Command.RescanFolder);
    // let listId = getAppState().navListId;
    // if (listId.kind === "folder") {
    //   setOpenRescanFolder(true);
    // }
  }

  function handleBuildPHash() {
    props.onMenuClose();
    invokeCommand(Command.BuildPHash);
    // let listId = getAppState().navListId;
    // if (listId.kind === "folder") {
    //   setOpenBuildPHash(true);
    // }
  }

  function handleBuildAltText() {
    props.onMenuClose();
    invokeCommand(Command.BuildAltText);
  }

  function handleBuildSimilarityIndex() {
    props.onMenuClose();
    invokeCommand(Command.BuildSimilarityIndex);
  }

  // <MenuItem key="add_device" onClick={handleAddDevice}>Add Device</MenuItem>
  return (
    <CommandMenu {...props}>
      <MenuItem key="lib_addfolder" onClick={handleImportFolder}>Import Folder</MenuItem>
      <MenuItem key="lib_rescanfolder" onClick={handleRescanFolder}>Rescan Folder</MenuItem>
      <Divider />
      <MyMenuItem key="add_quick" command={Command.CreateQuickCollection} text="New quick collection" />
      <Divider />
      <MenuItem key="lib_buildpash" onClick={handleBuildPHash}>Build PHash</MenuItem>
      <MenuItem key="lib_alt_text" onClick={handleBuildAltText}>Build Alt Text</MenuItem>
      <MenuItem key="lib_similarity" onClick={handleBuildSimilarityIndex}>Build Similarity Index</MenuItem>
    </CommandMenu>
  )
}