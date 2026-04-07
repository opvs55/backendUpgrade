export const getMonthName = (monthNumber) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  if (monthNumber >= 1 && monthNumber <= 12) {
    return months[monthNumber - 1];
  }
  return 'Mês Inválido';
};

export const sanitizeNumerologyResponse = (reading) => {
  if (!reading) return reading;

  const sanitizedReading = { ...reading };
  delete sanitizedReading.birthday_number;

  if (typeof sanitizedReading.birthday_secret_meaning === 'string') {
    try {
      const parsedMeaning = JSON.parse(sanitizedReading.birthday_secret_meaning);
      if (parsedMeaning && typeof parsedMeaning === 'object') {
        delete parsedMeaning.numerology_details;
        sanitizedReading.birthday_secret_meaning = JSON.stringify(parsedMeaning);
      }
    } catch (parseError) {
      // Mantém string original se não for JSON válido
    }
  }

  return sanitizedReading;
};
