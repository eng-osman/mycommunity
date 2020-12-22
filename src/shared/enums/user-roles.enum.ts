export enum Role {
  READ_USER_SELF = 'READ_USER_SELF',
  READ_USER_ALL = 'READ_USER_ALL',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER_SELF = 'UPDATE_USER_SELF',
}

export const UserRoles = Object.keys(Role);
