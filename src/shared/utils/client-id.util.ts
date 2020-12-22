export const getIdFromNamespace = (id: string): string =>
  id.includes('#') ? id.split('#')[1] : id;
