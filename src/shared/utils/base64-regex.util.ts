export const Base64Regex = (data: string, exact = true) => {
  const regex = '(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)';
  return exact ? new RegExp(`(?:^${regex}?$)`).test(data) : new RegExp(regex, 'g').test(data);
};
