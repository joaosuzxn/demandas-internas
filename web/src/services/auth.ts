import { csrfCookie, http, type Resource } from './http'

export type Role = 'admin' | 'employee'

// Espelho do UserResource da API.
export type User = {
  id: number
  name: string
  username: string
  cpf: string
  email: string
  role: Role
  is_active: boolean
  must_change_password: boolean
  created_at: string | null
  updated_at: string | null
}

export type LoginCredentials = {
  login: string
  password: string
  remember: boolean
}

export type ChangePasswordPayload = {
  current_password: string
  password: string
  password_confirmation: string
}

type UserResponse = Resource<User>

export async function login(credentials: LoginCredentials): Promise<User> {
  await csrfCookie()
  const { data } = await http.post<UserResponse>('/login', credentials)
  return data.data
}

export async function logout(): Promise<void> {
  await http.post('/logout', null, { skipAuthRedirect: true })
}

export async function fetchMe(): Promise<User> {
  const { data } = await http.get<UserResponse>('/me', { skipAuthRedirect: true })
  return data.data
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await http.put('/me/password', payload)
}
