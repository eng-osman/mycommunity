export const parseArabicNumbers = (num: string) =>
  num.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => (d.charCodeAt(0) - 1632).toString()); // Convert Arabic numbers)
