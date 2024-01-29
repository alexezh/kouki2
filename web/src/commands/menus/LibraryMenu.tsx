import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import { ImportFolderDialog } from "../dialogs/ImportFolderDialog";
import { getAppState } from "../AppState";
import { useState } from "react";
import { wireAddDevice } from "../../lib/mobileclient";
import { catchAll } from "../../lib/error";
import { Divider } from "@mui/material";
import { RescanFolderDialog } from "../dialogs/RescanFolderDialog";
import { ProgressDialog } from "../dialogs/ProgressDialog";
import { Command, invokeCommand } from "../Commands";

export function LibraryMenu(props: CommandMenuProps) {
  const [openRescanFolder, setOpenRescanFolder] = useState(false);
  const [openBuildPHash, setOpenBuildPHash] = useState(false);

  function renderDialogs() {
    return (<div>
      {
        (openRescanFolder) ? (<RescanFolderDialog
          onClose={() => setOpenRescanFolder(false)}
          folderId={getAppState().navListId} />) : null
      }
      {
        (openBuildPHash) ? (<ProgressDialog
          onClose={() => setOpenBuildPHash(false)}
          folderId={getAppState().navListId} />) : null
      }
    </div>)
  }

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
    let listId = getAppState().navListId;
    if (listId.kind === "folder") {
      setOpenRescanFolder(true);
    }
  }

  function handleBuildPHash() {
    props.onMenuClose();
    let listId = getAppState().navListId;
    if (listId.kind === "folder") {
      setOpenBuildPHash(true);
    }
  }

  function handleNewCollection() {
    props.onMenuClose();
  }

  return (
    <CommandMenu {...props} extra={renderDialogs}>
      <MenuItem key="lib_addfolder" onClick={handleImportFolder}>Import Folder</MenuItem>
      <Divider />
      <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>
      <MenuItem key="add_device" onClick={handleAddDevice}>Add Device</MenuItem>
      <Divider />
      <MenuItem key="lib_rescanfolder" onClick={handleRescanFolder}>Build Folder Thumbnails</MenuItem>
      <MenuItem key="lib_buildpash" onClick={handleBuildPHash}>Build Folder PHash</MenuItem>
    </CommandMenu>
  )
}