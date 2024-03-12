import { SimpleEventSource } from "../lib/synceventsource";
import { YearEntry } from "./AppState";

export enum Command {
  ScrollAlbumToDate = 1,
  SetFocusAlbum = 2,
  ScrollAlbumToStart = 3,
  AddStack = 13,
  MarkHidden = 16,
  AddQuickCollection = 20,
  NavigateBack = 21,
  RemoveStack = 22,
  ImportFolder = 23,
  CreateQuickCollection = 24,
  BuildPHash = 25,
  BuildAltText = 26,
  RescanFolder = 27,
  BuildSimilarityIndex = 28,
  AddReaction = 29,
}

let commandHandlers = new Map<Command, SimpleEventSource<any>>();

/**
 * returns method for disposing command handler
 */
export function addCommandHandler(cmd: Command, func: (...args: any[]) => void): (() => void) {
  let source = commandHandlers.get(cmd);
  if (!source) {
    source = new SimpleEventSource();
    commandHandlers.set(cmd, source);
  }

  let id = source.add(func);
  return () => source!.remove(id);
}

/**
 * issues command to scroll
 */
export function scrollAlbumToDate(dt: { year: number, month: number }) {
  invokeCommand(Command.ScrollAlbumToDate, dt);
}

export function setFocusAlbum() {
  invokeCommand(Command.SetFocusAlbum);
}

export function invokeCommand(cmd: Command, arg: any = undefined) {
  let handler = commandHandlers.get(cmd);
  if (handler) {
    handler.invoke(arg);
  }
}