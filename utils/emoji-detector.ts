// Ingredient emoji mapping
const INGREDIENT_EMOJIS: { [key: string]: string } = {
  // Proteins
  'chicken': '🐔', 'beef': '🥩', 'pork': '🥓', 'lamb': '🐑', 'fish': '🐟',
  'salmon': '🐟', 'tuna': '🐟', 'shrimp': '🦐', 'eggs': '🥚', 'egg': '🥚',
  'bacon': '🥓', 'sausage': '🌭', 'steak': '🥩', 'turkey': '🦃',
  
  // Dairy
  'milk': '🥛', 'cheese': '🧀', 'butter': '🧈', 'cream': '🥛', 'yogurt': '🥛',
  'cheddar': '🧀', 'mozzarella': '🧀', 'parmesan': '🧀',
  
  // Vegetables
  'tomato': '🍅', 'tomatoes': '🍅', 'lettuce': '🥬', 'carrot': '🥕', 'carrots': '🥕',
  'potato': '🥔', 'potatoes': '🥔', 'onion': '🧅', 'onions': '🧅',
  'garlic': '🧄', 'pepper': '🫑', 'peppers': '🫑', 'broccoli': '🥦',
  'cucumber': '🥒', 'corn': '🌽', 'peas': '🫛', 'mushroom': '🍄', 'mushrooms': '🍄',
  'spinach': '🥬', 'avocado': '🥑', 'eggplant': '🍆', 'cabbage': '🥬',
  
  // Fruits
  'apple': '🍎', 'apples': '🍎', 'banana': '🍌', 'bananas': '🍌',
  'orange': '🍊', 'oranges': '🍊', 'lemon': '🍋', 'lemons': '🍋',
  'strawberry': '🍓', 'strawberries': '🍓', 'grape': '🍇', 'grapes': '🍇',
  'watermelon': '🍉', 'pineapple': '🍍', 'mango': '🥭', 'peach': '🍑',
  'cherry': '🍒', 'cherries': '🍒', 'blueberry': '🫐', 'blueberries': '🫐',
  
  // Grains & Bread
  'bread': '🍞', 'rice': '🍚', 'pasta': '🍝', 'noodles': '🍜',
  'flour': '🌾', 'oats': '🌾', 'cereal': '🥣', 'bagel': '🥯',
  'croissant': '🥐', 'tortilla': '🫓', 'pita': '🫓',
  
  // Condiments & Spices
  'salt': '🧂', 'pepper': '🫑', 'sugar': '🍬', 'honey': '🍯',
  'oil': '🫗', 'vinegar': '🫗', 'soy sauce': '🫗', 'ketchup': '🍅',
  'mustard': '🟡', 'mayo': '🥚', 'mayonnaise': '🥚',
  
  // Drinks
  'water': '💧', 'coffee': '☕', 'tea': '🍵', 'juice': '🧃',
  'wine': '🍷', 'beer': '🍺', 'soda': '🥤',
  
  // Other
  'chocolate': '🍫', 'cookie': '🍪', 'cookies': '🍪', 'cake': '🍰',
  'ice cream': '🍦', 'pizza': '🍕', 'burger': '🍔', 'fries': '🍟',
  'hot dog': '🌭', 'taco': '🌮', 'burrito': '🌯', 'sandwich': '🥪',
  'soup': '🍲', 'salad': '🥗', 'curry': '🍛', 'sushi': '🍣',
  'nuts': '🥜', 'peanut': '🥜', 'almond': '🥜', 'beans': '🫘',
};

/**
 * Detect emoji for an ingredient
 * Returns the ingredient with emoji prefix if found
 */
export function detectIngredientEmoji(ingredient: string): string {
  const lowerIngredient = ingredient.toLowerCase().trim();
  
  // Check if ingredient already has an emoji
  const emojiRegex = /\p{Emoji}/u;
  if (emojiRegex.test(ingredient)) {
    return ingredient;
  }
  
  // Try exact match first
  if (INGREDIENT_EMOJIS[lowerIngredient]) {
    return `${INGREDIENT_EMOJIS[lowerIngredient]} ${ingredient}`;
  }
  
  // Try partial match (check if any key is in the ingredient)
  for (const [key, emoji] of Object.entries(INGREDIENT_EMOJIS)) {
    if (lowerIngredient.includes(key)) {
      return `${emoji} ${ingredient}`;
    }
  }
  
  // No match found, return original
  return ingredient;
}

/**
 * Process array of ingredients and add emojis
 */
export function addEmojisToIngredients(ingredients: string[]): string[] {
  return ingredients.map(detectIngredientEmoji);
}
