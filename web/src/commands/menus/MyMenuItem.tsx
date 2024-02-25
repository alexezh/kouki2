import ListItemText from "@mui/material/ListItemText/ListItemText";
import MenuItem from "@mui/material/MenuItem/MenuItem";
import Typography from "@mui/material/Typography/Typography";
import { Command, invokeCommand } from "../Commands";
import { useContext } from "react";
import { CommandMenuContext } from "./CommandMenu";

export function MyMenuItem(props: { command: Command, text: string, shortcut?: string }): JSX.Element {
  const onMenuClose = useContext(CommandMenuContext);

  return (
    <MenuItem onClick={() => {
      invokeCommand(props.command);
      if (onMenuClose !== null) {
        onMenuClose();
      }
    }}>
      <ListItemText>{props.text}</ListItemText>
      {
        (props.shortcut) ?
          (<Typography variant="body2" color="text.secondary">{props.shortcut}</Typography>) : null
      }
    </MenuItem >
  );
}