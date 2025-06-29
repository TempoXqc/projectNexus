// client/src/config/clientConfig.ts
export const clientConfig = {
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  deckImages: {
    assassin: '/addons/randomizers/Assassin.jpg',
    celestial: '/addons/randomizers/Celestial.jpg',
    dragon: '/addons/randomizers/Dragon.jpg',
    wizard: '/addons/randomizers/Wizard.jpg',
    vampire: '/addons/randomizers/Vampire.jpg',
    viking: '/addons/randomizers/Viking.jpg',
    engine: '/addons/randomizers/Engine.jpg',
    samurai: '/addons/randomizers/Samurai.jpg',
  },
};