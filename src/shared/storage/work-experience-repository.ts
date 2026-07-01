import type { WorkExperience } from '../types/work-experience'
import { createListRepository } from './list-repository'

export const workExperienceRepository = createListRepository<WorkExperience>('workExperiences')
