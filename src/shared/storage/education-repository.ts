import type { Education } from '../types/education'
import { createListRepository } from './list-repository'

export const educationRepository = createListRepository<Education>('educations')
