import { http } from './http'

export type Health = {
  status: 'ok' | 'erro'
  app: string
  database: 'ok' | 'erro'
}

export async function getHealth(): Promise<Health> {
  const { data } = await http.get<Health>('/health')
  return data
}
