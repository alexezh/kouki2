import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import Button from '@mui/material/Button/Button';
import { AlbumPhoto, triggerRefreshFolders } from './PhotoStore';
import { select } from 'underscore';
import { Fragment, useState } from 'react';
import Menu from '@mui/material/Menu/Menu';
import MenuItem from '@mui/material/MenuItem/MenuItem';
import Box from '@mui/material/Box/Box';
import Dialog from '@mui/material/Dialog/Dialog';
import DialogTitle from '@mui/material/DialogTitle/DialogTitle';
import DialogContent from '@mui/material/DialogContent/DialogContent';
import DialogContentText from '@mui/material/DialogContentText/DialogContentText';
import TextField from '@mui/material/TextField/TextField';
import DialogActions from '@mui/material/DialogActions/DialogActions';
import { wireAddFolder, wireCheckFolder } from './lib/fetchadapter';
import { selectionManager } from './SelectionManager';

export default function AddFolderDialog(props: { onClose: () => void }) {
  const [value, setValue] = useState("");

  function handleClose() {
    props.onClose();
  };

  async function handleAdd() {
    if (!await wireAddFolder(value)) {
      return;
    }
    triggerRefreshFolders();
    props.onClose();
  };

  async function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    setValue(event.target.value);
  }

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>Add Folder</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter folder name starting with root of drive (such as /Users/myname/Pictures).
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Folder"
          type="text"
          fullWidth
          variant="standard"
          value={value}
          onChange={handleChanged}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleAdd}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}

export function CommandBar(props: { className?: string, photos: AlbumPhoto[] }) {
  const [anchorElEdit, setAnchorElEdit] = useState<null | HTMLElement>(null);
  const [anchorElLibrary, setAnchorElLibrary] = useState<null | HTMLElement>(null);
  const [openAddFolder, setOpenAddFolder] = useState(false);

  const handleOpenEditMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElEdit(event.currentTarget);
  };

  function handleCloseEditMenu() {
    setAnchorElEdit(null);
  }

  function handleSelectAll() {
    selectionManager.add(props.photos);
    handleCloseEditMenu();
  }

  function handleSelectNone() {
    selectionManager.remove(props.photos);
    handleCloseEditMenu();
  }

  function handleInvertSelect() {
    let select: AlbumPhoto[] = [];
    for (let x of props.photos) {
      if (!selectionManager.items.get(x.wire.hash)) {
        select.push(x);
      }
    }
    selectionManager.clear();
    selectionManager.add(select);
    handleCloseEditMenu();
  }

  const handleOpenLibraryMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElLibrary(event.currentTarget);
  };

  const handleCloseLibraryMenu = () => {
    setAnchorElLibrary(null);
  }

  function handleAddFolder() {
    handleCloseLibraryMenu();
    setOpenAddFolder(true);
  }

  function handleNewCollection() {
    handleCloseLibraryMenu();
  }

  // <Button variant="text" onClick={handleSelectAll}>Add Quick</Button>
  //  <Button variant="text" onClick={handleSelectAll}>Select All</Button>
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <Box sx={{ flexGrow: 0 }}>
          <Button onClick={handleOpenEditMenu} sx={{ p: 0 }}>Edit</Button>
          <Menu
            id="menu-edit"
            sx={{ mt: '0px' }}
            anchorEl={anchorElEdit}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElEdit)}
            onClose={handleCloseEditMenu}
          >
            <MenuItem key="edit_all" onClick={handleSelectAll}>Select All</MenuItem>
            <MenuItem key="edit_none" onClick={handleSelectNone}>Select None</MenuItem>
            <MenuItem key="invert_select" onClick={handleInvertSelect}>Invert Selection</MenuItem>
          </Menu>
        </Box>
        <Box sx={{ flexGrow: 0 }}>
          <Button onClick={handleOpenLibraryMenu} sx={{ p: 0 }}>Library</Button>
          <Menu
            id="menu-library"
            sx={{ mt: '0px' }}
            anchorEl={anchorElLibrary}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorElLibrary)}
            onClose={handleCloseLibraryMenu}
          >
            <MenuItem key="lib_addfolder" onClick={handleAddFolder}>Add Folder</MenuItem>
            <MenuItem key="new_coll" onClick={handleNewCollection}>New Collection</MenuItem>
          </Menu>
          {
            (openAddFolder) ? (<AddFolderDialog onClose={() => setOpenAddFolder(false)} />) : null
          }

        </Box>
      </Toolbar>
    </AppBar>)
};
