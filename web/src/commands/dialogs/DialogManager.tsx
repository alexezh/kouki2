import { useEffect, useState } from "react";
import { SimpleEventSource } from "../../lib/synceventsource";

/**
 * empty interface for now; maybe will grow to "remodel" framework
 */
export interface IDialogModel {
}

export type DialogProps = {
  /**
   * called to close dialog. Takes optional function to call after close
   */
  onClose: (after?: () => void) => void;
}

class DialogModel implements IDialogModel {
  id: number;
  render: (props: DialogProps) => JSX.Element;
  props: DialogProps;

  public constructor(id: number, render: (props: DialogProps) => JSX.Element) {
    this.id = id;
    this.render = render;
    this.props = {
      onClose: (after?: () => void): void => {
        let idx = dialogs.findIndex((x: DialogModel) => x.id === id);
        if (idx !== -1) {
          dialogs.splice(idx, 1);
        }
        if (after) {
          after();
        }
        dialogVersion++;
        dialogsChanged.invoke();
      }
    }
  }
}

let nextId = 1;
let dialogVersion = 1;
let dialogs: DialogModel[] = [];
let dialogsChanged = new SimpleEventSource();

export function showDialog(render: (props: DialogProps) => JSX.Element): IDialogModel {
  let id = nextId++;
  let model = new DialogModel(id, render);
  dialogs.push(model)
  dialogVersion++;
  dialogsChanged.invoke();
  return model;
}

export function DialogAnchor(props: { className: string }) {
  let [version, setVersion] = useState(1);

  useEffect(() => {
    let id = dialogsChanged.add(() => {
      setVersion(dialogVersion);
    });

    return () => {
      dialogsChanged.remove(id);
    }
  });

  return (<div className={props.className}>
    {dialogs.map((x: DialogModel) => x.render(x.props))}
  </div>)
}