import { existsSync, mkdirSync } from 'fs';
import { sep } from 'path';

export const mkdir = (path: string, _name?: string) =>
  path.split(sep).reduce((currentPath, folder) => {
    currentPath += folder + sep;
    if (!existsSync(currentPath)) {
      mkdirSync(currentPath);
    }
    return currentPath;
  }, '');
