import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaDiscord, FaTwitter, FaFilter, FaAngleDown } from 'react-icons/fa';
import { clientConfig } from '@/config/clientConfig.ts';

interface Card {
  id: string;
  name: { fr: string; en: string; es: string };
  image: { fr: string; en: string; es: string };
  faction: string;
  cost: number;
  types: { type: string; subTypes?: string }[];
  label?: string[];
  effects?: Record<string, any>;
  on_play?: any[];
}

interface Translation {
  fr: string;
  en: string;
  es: string;
}

interface Translations {
  factions: Record<string, Translation>;
  types: Record<string, Translation>;
  costs: Record<string, Translation>;
  filterButton: Translation;
  nav: {
    home: Translation;
    database: Translation;
  };
}

const CardPage: React.FC = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [language, setLanguage] = useState<'fr' | 'en' | 'es'>(
    (localStorage.getItem('language') as 'fr' | 'en' | 'es') || 'fr'
  );
  const [selectedFactions, setSelectedFactions] = useState<string[]>(['assassin']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCosts, setSelectedCosts] = useState<string[]>([]);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [showSubFilters, setShowSubFilters] = useState<boolean>(false);

  // Traductions pour les boutons avec majuscule
  const translations: Translations = {
    factions: {
      assassin: { fr: 'Assassins', en: 'Assassins', es: 'Asesinos' },
      celestial: { fr: 'Êtres célestes', en: 'Celestials', es: 'Seres celestiales' },
      dragon: { fr: 'Dragons', en: 'Dragons', es: 'Dragones' },
      samurai: { fr: 'Samouraïs', en: 'Samurais', es: 'Samuráis' },
      vampire: { fr: 'Vampires', en: 'Vampires', es: 'Vampiros' },
      engine: { fr: 'Maîtres de siège', en: 'Engines', es: 'Maestros de asedio' },
      wizard: { fr: 'Magiciens', en: 'Wizards', es: 'Magos' },
    },
    types: {
      unit: { fr: 'Unité', en: 'Unit', es: 'Unidad' },
      spell: { fr: 'Sort', en: 'Spell', es: 'Hechizo' },
      attack: { fr: 'Attaque', en: 'Attack', es: 'Ataque' },
      defence: { fr: 'Défense', en: 'Defence', es: 'Defensa' },
      support: { fr: 'Support', en: 'Support', es: 'Apoyo' },
    },
    costs: {
      '0': { fr: 'Gratuite', en: 'Free', es: 'Gratis' },
      '1': { fr: 'Non gratuite', en: 'Non-free', es: 'No gratis' },
    },
    filterButton: {
      fr: 'Filtres',
      en: 'Filters',
      es: 'Filtros',
    },
    nav: {
      home: { fr: 'Accueil', en: 'Home', es: 'Inicio' },
      database: { fr: 'Base de données', en: 'Database', es: 'Base de datos' },
    },
  };

  useEffect(() => {
    // Restore language from localStorage
    const savedLanguage = localStorage.getItem('language') as 'fr' | 'en' | 'es';
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    // Load cards
    fetch(`${clientConfig.apiUrl}/api/card`)
      .then((res) => res.json())
      .then(setCards)
      .catch((err) => console.error('Error fetching cards', err));
  }, []);

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language);
  }, [language]);

  const toggleSelection = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const filteredCards = (selectedFactions.length === 0 && selectedTypes.length === 0 && selectedCosts.length === 0)
    ? []
    : cards
      .filter((card) => {
        const matchesFaction = selectedFactions.length === 0 || selectedFactions.includes(card.faction);
        const matchesType =
          selectedTypes.length === 0 ||
          card.types.some((t) => selectedTypes.includes(t.type) || selectedTypes.includes(t.subTypes || ''));
        const matchesCost =
          selectedCosts.length === 0 || selectedCosts.includes(card.cost.toString());
        return matchesFaction && matchesType && matchesCost;
      })
      .sort((a, b) => {
        const aId = parseInt(a.id.split('_')[1], 10);
        const bId = parseInt(b.id.split('_')[1], 10);
        return aId - bId;
      });

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-white flex flex-col">
      <header className="sticky top-0 z-10 bg-gray-900 shadow-sm w-full">
        <div className="flex justify-center items-center w-full px-4 py-3 sm:px-8 sm:py-4">
          {/* Centered navigation buttons */}
          <div className="flex justify-center flex-1 space-x-4">
            <button
              className="className={`bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
              onClick={() => navigate('/')}
            >
              {translations.nav.home[language]}
            </button>
            <button
              className="bg-blue-600 text-white py-2 px-4 rounded text-sm sm:text-base md:text-lg"
              onClick={() => navigate('/')}
            >
              {translations.nav.database[language]}
            </button>
          </div>

          {/* Icons and language selector on the right */}
          <div className="flex space-x-2 sm:space-x-4 items-center">
            <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">
              <FaGithub className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 hover:text-white" />
            </a>
            <a href="https://discord.example.com" target="_blank" rel="noopener noreferrer">
              <FaDiscord className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 hover:text-white" />
            </a>
            <a href="https://twitter.com/example" target="_blank" rel="noopener noreferrer">
              <FaTwitter className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400 hover:text-white" />
            </a>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'fr' | 'en' | 'es')}
              className="bg-gray-800 text-white border border-gray-700 rounded py-1 px-2 text-sm sm:py-2 sm:px-3 sm:text-base"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </header>

      {/* Centered filters at the top */}
      <div className="flex justify-center p-4 sm:p-6">
        <div className="flex flex-col gap-4 w-full max-w-7xl">
          {/* Line 1: Faction filters + filter button */}
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-center">
            {['assassin', 'celestial', 'dragon', 'samurai', 'vampire', 'engine', 'wizard'].map((faction) => (
              <button
                key={faction}
                className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base border border-gray-600 transition-colors ${
                  selectedFactions.includes(faction) ? 'bg-blue-600' : 'bg-gray-700 hover:bg-blue-700'
                }`}
                onClick={() => toggleSelection(selectedFactions, faction, setSelectedFactions)}
              >
                {translations.factions[faction][language]}
              </button>
            ))}
            <button
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base border border-gray-600 transition-colors flex items-center ${
                showSubFilters ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => setShowSubFilters(!showSubFilters)}
            >
              <FaFilter className="w-4 h-4 mr-2" />
              {translations.filterButton[language]}
              {showSubFilters && <FaAngleDown className="w-4 h-4 ml-2" />}
            </button>
          </div>

          {/* Line 2: Sub-filters (types and costs on the same line) */}
          <div
            className={`flex flex-col gap-4 overflow-hidden transition-all duration-300 ${
              showSubFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            } bg-gray-800 rounded-md p-4`}
          >
            <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
              {['unit', 'spell', 'attack', 'defence', 'support'].map((type) => (
                <button
                  key={type}
                  className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base border border-gray-600 transition-colors ${
                    selectedTypes.includes(type) ? 'bg-green-600' : 'bg-gray-700 hover:bg-green-700'
                  }`}
                  onClick={() => toggleSelection(selectedTypes, type, setSelectedTypes)}
                >
                  {translations.types[type][language]}
                </button>
              ))}
              {[
                { value: '0', label: translations.costs['0'][language] },
                { value: '1', label: translations.costs['1'][language] },
              ].map((cost) => (
                <button
                  key={cost.value}
                  className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md text-sm sm:text-base border border-gray-600 transition-colors ${
                    selectedCosts.includes(cost.value) ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-yellow-700'
                  }`}
                  onClick={() => toggleSelection(selectedCosts, cost.value, setSelectedCosts)}
                >
                  {cost.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Card grid on the left (or top on mobile) */}
        <div className="h-full pt-2 sm:pt-4 px-4 sm:px-6 flex flex-col gap-4 sm:gap-6 overflow-y-auto custom-scrollbar w-full sm:w-7/10">
          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {filteredCards.map((card: Card) => (
              <div
                key={card.id}
                className={`bg-gray-800 rounded-lg p-2 sm:p-3 transition-all ${
                  hoveredCard?.id === card.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
                onTouchStart={() => setHoveredCard(card)}
              >
                <img
                  src={card.image[language]}
                  alt={card.name[language]}
                  className="w-full h-auto rounded max-h-48 sm:max-h-56 md:max-h-64 object-contain"
                />
                <p className="text-center mt-2 text-sm sm:text-base md:text-lg">{card.name[language]}</p>
                <p className="text-center text-xs sm:text-sm text-gray-400">{card.id}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Large card display on the right (or bottom on mobile) */}
        <div className="h-full pt-2 sm:pt-4 px-2 sm:px-4 flex justify-center items-center bg-gray-800 w-full sm:w-3/10">
          {hoveredCard ? (
            <div className="w-full h-full flex justify-center items-center">
              <img
                src={hoveredCard.image[language]}
                alt={hoveredCard.name[language]}
                className="w-full h-auto rounded-lg max-h-[90%] object-contain"
              />
            </div>
          ) : (
            <p className="text-gray-400 text-base sm:text-lg md:text-xl">Hover or tap a card to display it here</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default CardPage;