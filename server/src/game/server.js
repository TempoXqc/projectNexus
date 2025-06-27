// import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import fs from 'fs';
// import { MongoClient } from 'mongodb';
// import dotenv from 'dotenv';
//
// dotenv.config();
//
// const app = express();
// const server = createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: [
//       'http://localhost:5176',
//       'https://projectnexus-nynw.onrender.com',
//       'https://projectnexus-staging.up.railway.app',
//     ],
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
//   transports: ['websocket', 'polling'],
// });
//
// app.use(cors());
// app.use(express.static('public'));
// app.use('/addons', express.static('addons'));
// app.get('/api/games', async (req, res) => {
//   try {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const activeGames = await gamesCollection
//       .find({
//         status: { $in: ['waiting', 'started'] },
//       })
//       .project({
//         gameId: 1,
//         status: 1,
//         createdAt: 1,
//         players: 1,
//         _id: 0,
//       })
//       .toArray();
//     res.json(activeGames);
//   } catch (error) {
//     console.error('Erreur lors de la récupération des parties:', error);
//     res.status(500).json({ error: 'Erreur serveur' });
//   }
// });
//
// async function emitActiveGames() {
//   try {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const activeGames = await gamesCollection
//       .find({
//         status: { $in: ['waiting', 'started'] },
//       })
//       .project({
//         gameId: 1,
//         status: 1,
//         createdAt: 1,
//         players: 1,
//         _id: 0,
//       })
//       .toArray();
//     io.emit('activeGamesUpdate', activeGames); // Émet à tous les clients
//   } catch (error) {
//     console.error('Erreur lors de l\'émission des parties actives:', error);
//   }
// }
//
// // Connexion à MongoDB
// const uri = process.env.MONGODB_URI;
// const client = new MongoClient(uri);
//
// async function connectToMongoDB() {
//   try {
//     await client.connect();
//     console.log('Connecté à MongoDB');
//     const db = client.db('projectNexus');
//     // Créer un index sur gameId pour des recherches rapides
//     await db.collection('games').createIndex({ gameId: 1 });
//     return db;
//   } catch (error) {
//     console.error('Erreur de connexion à MongoDB:', error);
//     process.exit(1);
//   }
// }
//
// const players = {};
// const playerReadiness = {};
//
// function emitUpdateGameState(gameId, state) {
//   io.to(gameId).emit('updateGameState', state);
// }
//
// function loadCards() {
//   let deckLists = {};
//   let allCards = [];
//   try {
//     deckLists = JSON.parse(fs.readFileSync('public/deckLists.jsonl', 'utf8'));
//     allCards = JSON.parse(fs.readFileSync('public/cards.jsonl', 'utf8')).map(
//       (card) => ({
//         ...card,
//         exhausted: false,
//       }),
//     );
//   } catch (error) {
//     console.error('Erreur lors du chargement des cartes:', error);
//   }
//   return { deckLists, allCards };
// }
//
// function getRandomDecks() {
//   const allDecks = [
//     'assassin',
//     'celestial',
//     'dragon',
//     'wizard',
//     'vampire',
//     'viking',
//     'engine',
//     'samurai',
//   ];
//   const shuffledDecks = [...allDecks].sort(() => 0.5 - Math.random());
//   return shuffledDecks.slice(0, 4);
// }
//
// function drawCardServer(game, playerKey) {
//   if (game.state[playerKey].deck.length > 0) {
//     const [drawnCard] = game.state[playerKey].deck.splice(0, 1);
//     game.state[playerKey].hand.push(drawnCard);
//     return drawnCard;
//   }
//   return null;
// }
//
// async function checkWinCondition(gameId, game) {
//   const db = client.db('projectNexus');
//   const gamesCollection = db.collection('games');
//   const player1Life = game.state.player1.lifePoints;
//   const player2Life = game.state.player2.lifePoints;
//   if (player1Life <= 0 || player2Life <= 0) {
//     const winner = player1Life <= 0 ? 'player2' : 'player1';
//     game.state.gameOver = true;
//     game.state.winner = winner;
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { state: game.state } }
//     );
//     io.to(gameId).emit('gameOver', { winner });
//     emitUpdateGameState(gameId, game.state);
//   }
// }
//
// io.on('connection', (socket) => {
//   emitActiveGames();
//   socket.onAny((event, ...args) => {
//     if (event === 'yourTurn') {
//       // Logique pour yourTurn si nécessaire
//     }
//   });
//
//   socket.on('createGame', async () => {
//     console.log('Received createGame event from socketService:', socket.id);
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//
//     const newGameId = Math.random().toString(36).substring(2, 10);
//     console.log('Generated gameId:', newGameId);
//
//     const newGame = {
//       gameId: newGameId,
//       players: [socket.id],
//       chatHistory: [],
//       state: {
//         player1: {
//           hand: [], field: Array(8).fill(null), opponentField: Array(8).fill(null),
//           opponentHand: [], deck: [], graveyard: [], mustDiscard: false,
//           hasPlayedCard: false, lifePoints: 30, tokenCount: 0, tokenType: null
//         },
//         player2: {
//           hand: [], field: Array(8).fill(null), opponentField: Array(8).fill(null),
//           opponentHand: [], deck: [], graveyard: [], mustDiscard: false,
//           hasPlayedCard: false, lifePoints: 30, tokenCount: 0, tokenType: null
//         },
//         turn: 1,
//         activePlayer: null, // Pas encore défini
//         phase: 'Main',
//         gameOver: false,
//         winner: null
//       },
//       deckChoices: { '1': null, '2': [] },
//       availableDecks: getRandomDecks(),
//       createdAt: new Date(),
//       status: 'waiting' // Nouveau champ
//     };
//
//     try {
//       console.log('Inserting new game into MongoDB...');
//       await gamesCollection.insertOne(newGame);
//       console.log('Game inserted successfully');
//       const insertedGame = await gamesCollection.findOne({ gameId: newGameId });
//       console.log('Inserted game found:', insertedGame);
//       players[socket.id] = { gameId: newGameId, playerId: null }; // Pas encore attribué
//       socket.join(newGameId);
//       socket.emit('gameCreated', { gameId: newGameId, playerId: null, chatHistory: [] });
//       console.log('Emitted gameCreated to socketService:', socket.id);
//       await emitActiveGames();
//     } catch (error) {
//       console.error('Error creating game:', error);
//       socket.emit('error', 'Erreur lors de la création de la partie');
//     }
//   });
//
//   socket.on('joinGame', async (gameId) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//
//     try {
//       const allGames = await gamesCollection.find({}).toArray();
//       const game = await gamesCollection.findOne({ gameId: gameId });
//       if (!game) {
//         socket.emit('error', 'Partie non trouvée');
//         return;
//       }
//
//       if (game.players.length >= 2) {
//         socket.emit('error', 'La partie est pleine');
//         return;
//       }
//
//       game.players.push(socket.id);
//       socket.join(gameId);
//
//       if (game.players.length === 2) {
//         // Randomiser les rôles
//         const [player1SocketId, player2SocketId] = game.players.sort(() => Math.random() - 0.5);
//         players[player1SocketId] = { gameId, playerId: 1 };
//         players[player2SocketId] = { gameId, playerId: 2 };
//         game.state.activePlayer = player1SocketId;
//
//         await gamesCollection.updateOne(
//           { gameId },
//           {
//             $set: {
//               players: [player1SocketId, player2SocketId],
//               'state.activePlayer': player1SocketId,
//               status: 'started'
//             }
//           }
//         );
//
//         io.to(player1SocketId).emit('gameStart', {
//           playerId: 1,
//           gameId,
//           chatHistory: game.chatHistory,
//           availableDecks: game.availableDecks
//         });
//         io.to(player2SocketId).emit('gameStart', {
//           playerId: 2,
//           gameId,
//           chatHistory: game.chatHistory,
//           availableDecks: game.availableDecks
//         });
//         io.to(gameId).emit('playerJoined', { playerId: 2 });
//         io.to(gameId).emit('initialDeckList', game.availableDecks);
//         io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);
//         if (!game.deckChoices[1]) {
//           io.to(player2SocketId).emit('waitingForPlayer1Choice');
//         }
//       } else {
//         // Premier joueur en attente
//         players[socket.id] = { gameId, playerId: null };
//         socket.emit('waiting', { gameId, message: 'En attente d\'un autre joueur...' });
//       }
//       await emitActiveGames();
//     } catch (error) {
//       console.error('Error joining game:', error);
//       socket.emit('error', 'Erreur lors de la jointure de la partie');
//     }
//   });
//
//   socket.on('playCard', async ({ gameId, card, fieldIndex }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game || game.state.activePlayer !== socket.id) {
//       return;
//     }
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//
//     if (game.state.phase !== 'Main') {
//       return;
//     }
//
//     const updatedCard = { ...card, exhausted: false };
//     game.state[playerKey].field[fieldIndex] = updatedCard;
//     const newPlayerHand = game.state[playerKey].hand.filter(
//       (c) => c.id !== card.id,
//     );
//     game.state[playerKey].hand = newPlayerHand;
//     const newPlayerHandLength = newPlayerHand.length;
//     game.state[playerKey].opponentHand = Array(
//       game.state[opponentKey].hand.length,
//     ).fill({});
//     game.state[opponentKey].opponentHand = Array(
//       newPlayerHandLength,
//     ).fill({});
//
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { state: game.state } }
//     );
//     emitUpdateGameState(gameId, game.state);
//   });
//
//   socket.on('exhaustCard', async ({ gameId, cardId, fieldIndex }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game) {
//       return;
//     }
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//
//     const card = game.state[playerKey].field[fieldIndex];
//     if (!card || card.id !== cardId) {
//       return;
//     }
//
//     const updatedCard = { ...card, exhausted: !card.exhausted };
//     game.state[playerKey].field[fieldIndex] = updatedCard;
//     game.state[opponentKey].opponentField = [
//       ...game.state[opponentKey].opponentField,
//     ];
//     if (fieldIndex < game.state[opponentKey].opponentField.length) {
//       game.state[opponentKey].opponentField[fieldIndex] = { ...updatedCard };
//     }
//
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { state: game.state } }
//     );
//     emitUpdateGameState(gameId, game.state);
//   });
//
//   socket.on('updateLifePoints', async ({ gameId, lifePoints }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game) return;
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//     game.state[playerKey].lifePoints = lifePoints;
//     game.state[opponentKey].lifePoints = game.state[opponentKey].lifePoints || 30;
//
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { state: game.state } }
//     );
//     emitUpdateGameState(gameId, game.state);
//     await checkWinCondition(gameId, game);
//   });
//
//   socket.on('updateTokenCount', async ({ gameId, tokenCount }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game) return;
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     let max = 30;
//     if (game.state[playerKey].tokenType === 'assassin') {
//       max = 8;
//     }
//     if (tokenCount >= 0 && tokenCount <= max) {
//       game.state[playerKey].tokenCount = tokenCount;
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//     }
//   });
//
//   socket.on('addAssassinTokenToOpponentDeck', async ({ gameId, tokenCount, tokenCard }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game || game.state.activePlayer !== socket.id) return;
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//
//     if (
//       game.state[playerKey].tokenType === 'assassin' &&
//       tokenCount >= 0 &&
//       tokenCount <= 8
//     ) {
//       game.state[playerKey].tokenCount = tokenCount;
//       game.state[opponentKey].deck = [...game.state[opponentKey].deck, tokenCard].sort(
//         () => Math.random() - 0.5
//       );
//       game.state[playerKey].opponentHand = Array(
//         game.state[opponentKey].hand.length
//       ).fill({});
//       game.state[opponentKey].opponentHand = Array(
//         game.state[playerKey].hand.length
//       ).fill({});
//
//       console.log('[DEBUG] addAssassinTokenToOpponentDeck:', {
//         gameId,
//         opponentDeckLength: game.state[opponentKey].deck.length,
//         tokenCard,
//       });
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//     }
//   });
//
//   socket.on('placeAssassinTokenAtOpponentDeckBottom', async ({ gameId, tokenCard }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game || game.state.activePlayer !== socket.id) return;
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//
//     if (game.state[playerKey].tokenType === 'assassin') {
//       game.state[playerKey].tokenCount = Math.max(0, game.state[playerKey].tokenCount - 1);
//       game.state[opponentKey].deck = [...game.state[opponentKey].deck, tokenCard];
//       game.state[playerKey].opponentHand = Array(
//         game.state[opponentKey].hand.length
//       ).fill({});
//       game.state[opponentKey].opponentHand = Array(
//         game.state[playerKey].hand.length
//       ).fill({});
//
//       console.log('[DEBUG] placeAssassinTokenAtOpponentDeckBottom:', {
//         gameId,
//         opponentDeckLength: game.state[opponentKey].deck.length,
//         tokenCard,
//       });
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//     }
//   });
//
//   socket.on('handleAssassinTokenDraw', async ({ gameId, playerLifePoints, opponentTokenCount }) => {
//     console.log('[DEBUG] handleAssassinTokenDraw received:', { gameId, playerLifePoints, opponentTokenCount });
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game || game.state.activePlayer !== socket.id) return;
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//
//     if (game.state[opponentKey].tokenType === 'assassin') {
//       game.state[playerKey].lifePoints = playerLifePoints;
//       game.state[opponentKey].tokenCount = opponentTokenCount;
//       game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand.length).fill({});
//       game.state[opponentKey].opponentHand = Array(game.state[playerKey].hand.length).fill({});
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//       io.to(gameId).emit('handleAssassinTokenDraw', { playerLifePoints, opponentTokenCount });
//       await checkWinCondition(gameId, game);
//     }
//   });
//
//   socket.on('updateGameState', async ({ gameId, state }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game) return;
//     const playerKey = players[socket.id].playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = players[socket.id].playerId === 1 ? 'player2' : 'player1';
//
//     game.state[playerKey] = { ...game.state[playerKey], ...state };
//     game.state[opponentKey].opponentGraveyard = game.state[playerKey].graveyard;
//     game.state[opponentKey].hand = game.state[opponentKey].hand || [];
//     game.state[opponentKey].deck = game.state[opponentKey].deck || [];
//     if (state.hand) {
//       game.state[opponentKey].opponentHand = Array(state.hand.length).fill({});
//     }
//     game.state[playerKey].opponentHand = Array(
//       game.state[opponentKey].hand.length,
//     ).fill({});
//
//     console.log('[DEBUG] updateGameState:', {
//       gameId,
//       playerKey,
//       opponentDeckLength: game.state[opponentKey].deck.length,
//     });
//
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { state: game.state } }
//     );
//     emitUpdateGameState(gameId, game.state);
//     await checkWinCondition(gameId, game);
//   });
//
//   socket.on('chooseDeck', async ({ gameId, playerId, deckId }) => {
//     console.log('Received chooseDeck from player', playerId, 'for game', gameId, 'deck', deckId);
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game) {
//       return;
//     }
//
//     if (!game.deckChoices) game.deckChoices = { 1: null, 2: [] };
//
//     if (playerId === 1 && !game.deckChoices[1]) {
//       game.deckChoices[1] = deckId;
//       let tokenType = null;
//       let tokenCount = 0;
//       if (deckId === 'assassin') {
//         tokenType = 'assassin';
//         tokenCount = 8;
//       } else if (deckId === 'engine') {
//         tokenType = 'engine';
//         tokenCount = 0;
//       } else if (deckId === 'viking') {
//         tokenType = 'viking';
//         tokenCount = 1;
//       }
//       game.state.player1.tokenType = tokenType;
//       game.state.player1.tokenCount = tokenCount;
//       const player2SocketId = game.players.find(
//         (id) => players[id].playerId === 2,
//       );
//       if (player2SocketId) {
//         io.to(player2SocketId).emit('player1ChoseDeck');
//       }
//     } else if (playerId === 2 && game.deckChoices[2].length < 2 && game.deckChoices[1]) {
//       if (!game.deckChoices[2].includes(deckId) && deckId !== game.deckChoices[1]) {
//         game.deckChoices[2].push(deckId);
//         let tokenType = game.state.player2.tokenType;
//         let tokenCount = game.state.player2.tokenCount;
//         if (deckId === 'assassin' && !tokenType) {
//           tokenType = 'assassin';
//           tokenCount = 8;
//         } else if (deckId === 'engine' && !tokenType) {
//           tokenType = 'engine';
//           tokenCount = 0;
//         } else if (deckId === 'viking' && !tokenType) {
//           tokenType = 'viking';
//           tokenCount = 1;
//         }
//         game.state.player2.tokenType = tokenType;
//         game.state.player2.tokenCount = tokenCount;
//       }
//     }
//
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { deckChoices: game.deckChoices, state: game.state } }
//     );
//
//     io.to(gameId).emit('deckSelectionUpdate', game.deckChoices);
//
//     const totalDecks = [game.deckChoices[1], ...game.deckChoices[2]].filter(Boolean);
//
//     if (totalDecks.length === 3) {
//       const remaining = game.availableDecks.find(id => !totalDecks.includes(id));
//
//       game.finalDecks = {
//         player1DeckId: game.deckChoices[1],
//         player2DeckIds: game.deckChoices[2],
//         selectedDecks: [...totalDecks, remaining],
//       };
//
//       const { deckLists, allCards } = loadCards();
//       if (!deckLists || !allCards || allCards.length === 0) {
//         return;
//       }
//
//       const getDeckCards = (deckId) => {
//         const cardIds = deckLists[deckId] || [];
//         return allCards.filter(card => cardIds.includes(card.id)).sort(() => Math.random() - 0.5);
//       };
//
//       const player1DeckIds = [game.finalDecks.player1DeckId, remaining];
//       const player2DeckIds = game.finalDecks.player2DeckIds;
//
//       const player1Cards = player1DeckIds.flatMap(deckId => getDeckCards(deckId)).slice(0, 30);
//       const player2Cards = player2DeckIds.flatMap(deckId => getDeckCards(deckId)).slice(0, 30);
//
//       if (player1Cards.length === 0 || player2Cards.length === 0) {
//         return;
//       }
//
//       const initialDraw = (cards) => {
//         const drawn = cards.slice(0, 5);
//         const rest = cards.slice(5);
//         return { hand: drawn, deck: rest };
//       };
//
//       if (game.state.player1 && game.state.player2) {
//         const player1Initial = initialDraw(player1Cards);
//         const player2Initial = initialDraw(player2Cards);
//
//         game.state.player1.hand = player1Initial.hand;
//         game.state.player1.deck = player1Initial.deck;
//         game.state.player2.hand = player2Initial.hand;
//         game.state.player2.deck = player2Initial.deck;
//
//         game.state.player1.opponentHand = Array(player2Initial.hand.length).fill({});
//         game.state.player2.opponentHand = Array(player1Initial.hand.length).fill({});
//
//         await gamesCollection.updateOne(
//           { gameId },
//           { $set: { state: game.state, finalDecks: game.finalDecks } }
//         );
//         emitUpdateGameState(gameId, game.state);
//
//         const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
//         if (isBothReady) {
//           io.to(gameId).emit('deckSelectionDone', game.finalDecks);
//           emitUpdateGameState(gameId, game.state);
//           io.to(gameId).emit('bothPlayersReady');
//         }
//       }
//     }
//   });
//
//   socket.on('disconnect', async () => {
//     const playerInfo = players[socket.id];
//     if (playerInfo) {
//       const { gameId } = playerInfo;
//       const db = client.db('projectNexus');
//       const gamesCollection = db.collection('games');
//
//       try {
//         const game = await gamesCollection.findOne({ gameId });
//         if (game) {
//           const opponentId = game.players.find((id) => id !== socket.id);
//           if (opponentId) {
//             io.to(opponentId).emit('opponentDisconnected');
//           }
//           await gamesCollection.deleteOne({ gameId });
//         }
//         await emitActiveGames();
//       } catch (error) {
//         console.error('Erreur lors de la suppression de la partie:', error);
//       }
//       delete players[socket.id];
//     }
//   });
//
//   socket.on('playerReady', async ({ gameId }) => {
//     const playerInfo = players[socket.id];
//     if (!playerInfo || playerInfo.gameId !== gameId) return;
//
//     const playerId = playerInfo.playerId;
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!playerReadiness[gameId]) {
//       playerReadiness[gameId] = { 1: false, 2: false };
//     }
//
//     playerReadiness[gameId][playerId] = true;
//     io.to(gameId).emit('playerReady', { playerId });
//
//     const isBothReady = playerReadiness[gameId]?.[1] && playerReadiness[gameId]?.[2];
//     const finalDecks = game?.finalDecks;
//
//     if (isBothReady && finalDecks && game) {
//       io.to(gameId).emit('deckSelectionDone', finalDecks);
//       emitUpdateGameState(gameId, game.state);
//       io.to(gameId).emit('bothPlayersReady');
//     }
//   });
//
//   socket.on('updatePhase', async ({ gameId, phase, turn }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game) {
//       console.log('[DEBUG] updatePhase - Jeu non trouvé:', gameId);
//       return;
//     }
//     if (game.state.activePlayer !== socket.id) {
//       console.log('[DEBUG] updatePhase - Tentative par joueur non actif:', socket.id);
//       return;
//     }
//     game.state.phase = phase;
//     game.state.turn = turn;
//     console.log('[DEBUG] updatePhase - Phase mise à jour:', { gameId, phase, turn, activePlayer: game.state.activePlayer });
//
//     await gamesCollection.updateOne(
//       { gameId },
//       { $set: { state: game.state } }
//     );
//     emitUpdateGameState(gameId, game.state);
//     io.to(gameId).emit('updatePhase', { phase, turn });
//     if (phase === 'Main' || phase === 'Battle') {
//       io.to(gameId).emit('phaseChangeMessage', { phase, turn });
//     }
//   });
//
//   socket.on('drawCard', async ({ gameId, playerId }) => {
//     console.log('[DEBUG] drawCard received:', { gameId, playerId });
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (!game || game.state.activePlayer !== socket.id) {
//       console.log('[DEBUG] drawCard - Invalid game or not active player:', { gameId, activePlayer: game?.state.activePlayer, socketId: socket.id });
//       return;
//     }
//     const playerKey = playerId === 1 ? 'player1' : 'player2';
//     const opponentKey = playerId === 1 ? 'player2' : 'player1';
//
//     const drawnCard = drawCardServer(game, playerKey);
//     console.log('[DEBUG] Card drawn:', { playerKey, drawnCard });
//     if (drawnCard && drawnCard.name === 'Assassin Token' && game.state[opponentKey].tokenType === 'assassin') {
//       console.log('[DEBUG] Assassin Token drawn, applying effects');
//       game.state[playerKey].lifePoints = Math.max(0, game.state[playerKey].lifePoints - 2);
//       game.state[opponentKey].tokenCount = Math.min(game.state[opponentKey].tokenCount + 1, 8);
//
//       const newDrawnCard = drawCardServer(game, playerKey);
//       console.log('[DEBUG] Repioche after Assassin Token:', { newDrawnCard });
//
//       game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand.length).fill({});
//       game.state[opponentKey].opponentHand = Array(game.state[playerKey].hand.length).fill({});
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//       io.to(gameId).emit('handleAssassinTokenDraw', {
//         playerLifePoints: game.state[playerKey].lifePoints,
//         opponentTokenCount: game.state[opponentKey].tokenCount,
//       });
//       await checkWinCondition(gameId, game);
//     } else {
//       game.state[playerKey].opponentHand = Array(game.state[opponentKey].hand.length).fill({});
//       game.state[opponentKey].opponentHand = Array(game.state[playerKey].hand.length).fill({});
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//     }
//   });
//
//   socket.on('endTurn', async ({ gameId, nextPlayerId }) => {
//     const db = client.db('projectNexus');
//     const gamesCollection = db.collection('games');
//     const game = await gamesCollection.findOne({ gameId });
//
//     if (game) {
//       const currentPlayerId = players[socket.id].playerId;
//       const nextPlayerSocketId = game.players.find(
//         (id) => players[id].playerId === nextPlayerId,
//       );
//       if (nextPlayerSocketId) {
//         console.log('[DEBUG] endTurn - Avant changement de activePlayer:', {
//           currentPlayerId,
//           currentSocketId: socket.id,
//           nextPlayerId,
//           nextPlayerSocketId,
//         });
//         game.state.activePlayer = nextPlayerSocketId;
//         game.state.turn += 1;
//         game.state.phase = 'Standby';
//         console.log('[DEBUG] endTurn - Après changement de phase et activePlayer:', {
//           activePlayer: game.state.activePlayer,
//           turn: game.state.turn,
//           phase: game.state.phase,
//         });
//       } else {
//         console.log('[DEBUG] endTurn - Erreur: nextPlayerSocketId non trouvé pour playerId:', nextPlayerId);
//         return;
//       }
//       game.state.player1.hasPlayedCard = false;
//       game.state.player2.hasPlayedCard = false;
//       game.state.player1.field = game.state.player1.field.map((card) =>
//         card ? { ...card, exhausted: false } : null,
//       );
//       game.state.player2.field = game.state.player2.field.map((card) =>
//         card ? { ...card, exhausted: false } : null,
//       );
//       game.state.player1.opponentField = [...game.state.player2.field];
//       game.state.player2.opponentField = [...game.state.player1.field];
//
//       const nextPlayerKey = nextPlayerId === 1 ? 'player1' : 'player2';
//       const opponentKey = nextPlayerId === 1 ? 'player2' : 'player1';
//       if (game.state.turn > 1 && game.state[nextPlayerKey].deck.length > 0 && game.state[nextPlayerKey].hand.length < 10) {
//         const drawnCard = drawCardServer(game, nextPlayerKey);
//         console.log('[DEBUG] Automatic draw in endTurn:', { nextPlayerKey, drawnCard });
//         if (drawnCard && drawnCard.name === 'Assassin Token' && game.state[opponentKey].tokenType === 'assassin') {
//           console.log('[DEBUG] Assassin Token drawn in endTurn, applying effects');
//           game.state[nextPlayerKey].lifePoints = Math.max(0, game.state[nextPlayerKey].lifePoints - 2);
//           game.state[opponentKey].tokenCount = Math.min(game.state[opponentKey].tokenCount + 1, 8);
//
//           const newDrawnCard = drawCardServer(game, nextPlayerKey);
//           console.log('[DEBUG] Repioche after Assassin Token in endTurn:', { newDrawnCard });
//
//           game.state[nextPlayerKey].opponentHand = Array(game.state[opponentKey].hand.length).fill({});
//           game.state[opponentKey].opponentHand = Array(game.state[nextPlayerKey].hand.length).fill({});
//
//           await gamesCollection.updateOne(
//             { gameId },
//             { $set: { state: game.state } }
//           );
//           emitUpdateGameState(gameId, game.state);
//           io.to(gameId).emit('handleAssassinTokenDraw', {
//             playerLifePoints: game.state[nextPlayerKey].lifePoints,
//             opponentTokenCount: game.state[opponentKey].tokenCount,
//           });
//           await checkWinCondition(gameId, game);
//         }
//       }
//
//       game.state.player1.opponentHand = Array(game.state.player2.hand.length).fill({});
//       game.state.player2.opponentHand = Array(game.state.player1.hand.length).fill({});
//
//       console.log('[DEBUG] endTurn - Avant émission:', {
//         gameId,
//         activePlayer: game.state.activePlayer,
//         phase: game.state.phase,
//         turn: game.state.turn,
//       });
//
//       await gamesCollection.updateOne(
//         { gameId },
//         { $set: { state: game.state } }
//       );
//       emitUpdateGameState(gameId, game.state);
//       io.to(gameId).emit('endTurn');
//       io.to(nextPlayerSocketId).emit('yourTurn');
//       io.to(gameId).emit('phaseChangeMessage', { phase: 'Standby', turn: game.state.turn, nextPlayerId });
//     }
//   });
// });
//
// // Nettoyage des parties inactives (toutes les heures)
// setInterval(async () => {
//   const db = client.db('projectNexus');
//   const gamesCollection = db.collection('games');
//   await gamesCollection.deleteMany({
//     createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
//   });
//   console.log('Parties inactives supprimées');
//   await emitActiveGames();
// }, 60 * 60 * 1000);
//
// const PORT = process.env.PORT || 3000;
// connectToMongoDB().then(() => {
//   server.listen(PORT, () => {
//     console.log(`Serveur démarré sur le port ${PORT}`);
//   });
// });