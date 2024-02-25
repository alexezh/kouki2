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

  return (
    <CommandMenu {...props}>
      <MenuItem key="lib_addfolder" onClick={handleImportFolder}>Import Folder</MenuItem>
      <Divider />
      <MyMenuItem key="add_quick" command={Command.CreateQuickCollection} text="New quick collection" />
      <MenuItem key="add_device" onClick={handleAddDevice}>Add Device</MenuItem>
      <Divider />
      <MenuItem key="lib_rescanfolder" onClick={handleRescanFolder}>Build Folder Thumbnails</MenuItem>
      <MenuItem key="lib_buildpash" onClick={handleBuildPHash}>Update Folder PHash</MenuItem>
      <Divider />
      <MenuItem key="lib_describe" onClick={handleBuildAltText}>Build Alt Text</MenuItem>
    </CommandMenu>
  )
}