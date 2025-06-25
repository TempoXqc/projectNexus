// client/src/utils/generateTokenId.ts
let tokenIdCounter = 0;

export const generateTokenId = () => {
  const timestamp = Date.now();
  return `token_assassin_${timestamp}_${tokenIdCounter++}_${Math.random().toString(36).substr(2, 9)}`;
};