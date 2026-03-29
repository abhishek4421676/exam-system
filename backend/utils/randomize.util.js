/**
 * Shuffle array using Fisher-Yates algorithm
 * Used for randomizing question order and options
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const createSeededRandom = (seedInput) => {
  const seedString = String(seedInput ?? 'seed');
  let hash = 2166136261;

  for (let i = 0; i < seedString.length; i++) {
    hash ^= seedString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const seededShuffleArray = (array, seedInput) => {
  const random = createSeededRandom(seedInput);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Generate random question order for exam
 * @param {Number} totalQuestions - Total number of questions
 * @returns {Array} Array of random question orders
 */
const generateRandomOrder = (totalQuestions) => {
  const orders = Array.from({ length: totalQuestions }, (_, i) => i + 1);
  return shuffleArray(orders);
};

/**
 * Randomize question options
 * @param {Array} options - Array of options with option_id and option_text
 * @returns {Array} Randomized options
 */
const randomizeOptions = (options, seedInput = null) => {
  if (seedInput === null || seedInput === undefined) {
    return shuffleArray(options);
  }
  return seededShuffleArray(options, seedInput);
};

/**
 * Generate unique code for exam attempts
 * @returns {String} Unique code
 */
const generateUniqueCode = () => {
  return `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

module.exports = {
  shuffleArray,
  seededShuffleArray,
  createSeededRandom,
  generateRandomOrder,
  randomizeOptions,
  generateUniqueCode
};
