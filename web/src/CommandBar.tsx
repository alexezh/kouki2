import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import IconButton from '@mui/material/IconButton/IconButton';
import Typography from '@mui/material/Typography/Typography';
import Button from '@mui/material/Button/Button';

export function CommandBar() {
  return (
    <AppBar position="static">
      <Toolbar variant="dense">
        <Button variant="text">Text</Button>
      </Toolbar>
    </AppBar>)
};
