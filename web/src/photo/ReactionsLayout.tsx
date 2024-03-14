import { reactionKindToEmoji } from "../lib/photoclient";
import { PhotoReactions } from "./AlbumPhoto";

// return (<div className="Photo-reactions-thumbnail"><div
// className="Photo-reactions-icon"
// width={20}
// height={20}
// src={favIcon}

export function ReactionsLayout(props: { reactions: PhotoReactions, thumbnail: boolean }) {
  return (<div className={(props.thumbnail) ? "Photo-reactions-thumbnail" : "Photo-reactions-big"}>
    {props.reactions.map((c: string, idx?: number) => (<div key={"r_" + idx}>{reactionKindToEmoji(c)}</div>))}
  </ div >)
}