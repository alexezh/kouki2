import AppBar from '@mui/material/AppBar/AppBar';
import Toolbar from '@mui/material/Toolbar/Toolbar';
import Button from '@mui/material/Button/Button';

export function CommandBar(props: { className?: string }) {
  return (
    <AppBar position="static" className={props.className}>
      <Toolbar variant="dense">
        <Button variant="text">Text</Button>
      </Toolbar>
    </AppBar>)
};
