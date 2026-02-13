const GOOGLE_PLACES_API_KEY = 'AIzaSyDY5mGrbAYiPv7a8L18A9rDiODwrpu2oX8';

export async function searchPlaces(query: string) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.predictions;
    }
    return [];
  } catch (error) {
    console.error('Places search error:', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,formatted_phone_number,rating,opening_hours,website,photos,place_id&key=${GOOGLE_PLACES_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    }
    throw new Error('Could not get place details');
  } catch (error) {
    console.error('Place details error:', error);
    throw error;
  }
}
