import { SimpleEventSource } from "../lib/synceventsource";

export enum Command {
  ScrollAlbum = 1,
  SetFocusAlbum = 2,
  AddStack = 3,
  MarkFavorite = 4,
  MarkRejected = 5,
  AddQuickCollection = 6,
  NavigateBack = 7,
  RemoveStack = 8,
  ImportFolder,
}

let anyCommandHandler = new SimpleEventSource();
let commandHandlers = new Map<Command, SimpleEventSource>();

export function addCommandHandler(cmd: Command, func: (cmd: Command, ...args: any[]) => void) {
  let source = commandHandlers.get(cmd);
  if (!source) {
    source = new SimpleEventSource();
    commandHandlers.set(cmd, source);
  }

  source.add(func);
}

export function addAnyCommandHandler(func: (cmd: Command, ...args: any[]) => void) {
  return anyCommandHandler.add(func);
}

export function removeAnyCommandHandler(id: number) {
  return anyCommandHandler.remove(id);
}

/**
 * issues command to scroll
 */
export function scrollAlbumToDate(dt: { year: number, month: number }) {
  anyCommandHandler.invoke(Command.ScrollAlbum, dt);
}

export function setFocusAlbum() {
  anyCommandHandler.invoke(Command.SetFocusAlbum);
}

export function invokeCommand(cmd: Command) {
  let handler = commandHandlers.get(cmd);
  if (handler) {
    handler.invoke();
  }
  anyCommandHandler.invoke(cmd);
}