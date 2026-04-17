export let OCCUPATIONS: any[] = [];

export const fetchAllOccupations = async () => {
  try {
    // Use the local proxy to bypass CORS
    const response = await fetch('/api/proxy/occupations?per_page=1000&page=1&locale=en');
    const data = await response.json();
    if (data && data.data) {
      OCCUPATIONS = data.data;
    }
    return OCCUPATIONS;
  } catch (error) {
    console.error("Failed to fetch occupations:", error);
    return [];
  }
};

export const TELEGRAM_BOT_TOKEN = "8583836114:AAEYhgFkIaJ-OKLfqIdHWKWQnCINCTzbqM4";
export const TELEGRAM_CHAT_ID = "7613887768";
