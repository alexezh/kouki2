import ListItemText from "@mui/material/ListItemText/ListItemText";
import MenuItem from "@mui/material/MenuItem/MenuItem";
import Typography from "@mui/material/Typography/Typography";
import { Command, invokeCommand } from "../Commands";

export function MyMenuItem(props: { command: Command, text: string, shortcut: string }): JSX.Element {

  return (
    <MenuItem onClick={() => invokeCommand(props.command)}>
      <ListItemText>{props.text}</ListItemText>
      <Typography variant="body2" color="text.secondary">{props.shortcut}</Typography>
    </MenuItem >
  );
}