import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import { AddFolderDialog, ProgressDialog, RescanFolderDialog } from "./AddFolderDialog";
import { getAppState } from "./AppState";
import { useState } from "react";
import { wireAddDevice } from "../lib/mobileclient";
import { catchAll } from "../lib/error";
import { Divider } from "@mui/material";

export function LibraryMenu(props: CommandMenuProps) {
  const [openAddFolder, setOpenAddFolder] = useState(false);
  const [openRescanFolder, setOpenRescanFolder] = useState(false);
  const [openBuildPHash, setOpenBuildPHash] = useState(false);

  function renderDialogs() {
    return (<div>
      {
        (openAddFolder) ? (<AddFolderDialog onClose={() => setOpenAddFolder(false)} />) : null
      }
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

  function handleAddFolder() {
    props.onMenuClose();
    setOpenAddFolder(true);
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
      <MenuItem key="lib_addfolder" onClick={handleAddFolder}>Add Folder</MenuItem>
      <MenuItem key="lib_rescanfolder" onClick={handleRescanFolder}>Build Folder Thumbnails</MenuItem>
      <MenuItem key="lib_buildpash" onClick={handleBuildPHash}>Build Folder PHash</MenuItem>
      <Divider />
      <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>
      <MenuItem key="add_device" onClick={handleAddDevice}>Add Device</MenuItem>
    </CommandMenu>
  )
}