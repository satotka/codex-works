export const SUITS = ['S','H','D','C'];
export const card = (rank, suit) => ({rank, suit, joker:false});
export const joker = () => ({rank:0, suit:null, joker:true});
export function validateHand(hand) {
  if (!Array.isArray(hand) || hand.length !== 5) throw new Error('5 cards required');
  const ids = new Set();
  for (const c of hand) {
    if (!c || (c.joker ? c.rank !== 0 || c.suit !== null : !Number.isInteger(c.rank) || c.rank<2 || c.rank>14 || !SUITS.includes(c.suit))) throw new Error('Invalid card');
    const id = c.joker ? 'JOKER' : `${c.rank}${c.suit}`;
    if (ids.has(id)) throw new Error('Duplicate card');
    ids.add(id);
  }
}
