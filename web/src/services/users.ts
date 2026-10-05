import type { User } from './auth'
import { http, type Paginated, type Resource } from './http'

// Gestão de usuários (só o administrador; a API responde 403 aos demais).

// Campos do cadastro e da edição. O CPF pode ir com máscara: a API normaliza.
export type UserPayload = { name: string; username: string; cpf: string; email: string }

export type ListUsersParams = { search?: string; page?: number }

// Uma página da lista (20 por página, por nome) e o total de usuários que batem com a busca.
export type UserPage = { items: User[]; page: number; lastPage: number; total: number }

type UserResponse = Resource<User>
type UserListResponse = Paginated<User>

export async function listUsers(params: ListUsersParams = {}): Promise<UserPage> {
  const { data } = await http.get<UserListResponse>('/users', { params })
  return {
    items: data.data,
    page: data.meta.current_page,
    lastPage: data.meta.last_page,
    total: data.meta.total,
  }
}

export async function getUser(id: number): Promise<User> {
  const { data } = await http.get<UserResponse>(`/users/${id}`)
  return data.data
}

export async function createUser(payload: UserPayload): Promise<User> {
  const { data } = await http.post<UserResponse>('/users', payload)
  return data.data
}

export async function updateUser(id: number, payload: UserPayload): Promise<User> {
  const { data } = await http.put<UserResponse>(`/users/${id}`, payload)
  return data.data
}

export async function deactivateUser(id: number): Promise<User> {
  const { data } = await http.post<UserResponse>(`/users/${id}/deactivate`)
  return data.data
}

export async function activateUser(id: number): Promise<User> {
  const { data } = await http.post<UserResponse>(`/users/${id}/activate`)
  return data.data
}

// 204: a senha volta à padrão e a sessão aberta do usuário cai na requisição seguinte.
export async function resetUserPassword(id: number): Promise<void> {
  await http.post(`/users/${id}/reset-password`)
}
