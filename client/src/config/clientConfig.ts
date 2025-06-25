// client/src/config/clientConfig.ts
export const clientConfig = {
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  deckImages: {
    assassin: '/cards/randomizers/Assassin.jpg',
    celestial: '/cards/randomizers/Celestial.jpg',
    dragon: '/cards/randomizers/Dragon.jpg',
    wizard: '/cards/randomizers/Wizard.jpg',
    vampire: '/cards/randomizers/Vampire.jpg',
    viking: '/cards/randomizers/Viking.jpg',
    engine: '/cards/randomizers/Engine.jpg',
    samurai: '/cards/randomizers/Samurai.jpg',
  },
};