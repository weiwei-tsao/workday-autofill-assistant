import type { Profile } from '../types/profile'
import { getLocal, setLocal } from './local-store'

const PROFILE_KEY = 'profile'

export async function getProfile(): Promise<Profile | undefined> {
  return getLocal<Profile>(PROFILE_KEY)
}

export async function saveProfile(profile: Profile): Promise<void> {
  await setLocal(PROFILE_KEY, profile)
}
