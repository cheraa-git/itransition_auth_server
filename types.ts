export interface User {
  id: number
  name: string
  email: string
  registrationTimestamp: string
  lastLoginTimestamp: string
  status: 'blocked' | 'active'
  token: string
}

export interface UserDb {
  id: number
  name: string
  email: string
  registration_timestamp: string
  last_login_timestamp: string
  status: 'blocked' | 'active'
  password: string
  token: string
}

