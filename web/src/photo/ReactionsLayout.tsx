import { reactionKindToEmoji } from "../lib/photoclient";
import { PhotoReactions } from "./AlbumPhoto";

// return (<div className="Photo-reactions-thumbnail"><div
// className="Photo-reactions-icon"
// width={20}
// height={20}
// src={favIcon}

export function ReactionsLayout(props: { reactions: PhotoReactions }) {
  return (<div className="Photo-reactions-thumbnail">
    {props.reactions.map((c: string) => (<div>{reactionKindToEmoji(c)}</div>))}
  </div >)
}