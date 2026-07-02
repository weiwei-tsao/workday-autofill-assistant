import type { ExportBundle } from '../types/export-bundle'
import { answerBankRepository } from './answer-bank-repository'
import { applicationRecordRepository } from './application-record-repository'
import { educationRepository } from './education-repository'
import { getProfile, saveProfile } from './profile-repository'
import { workExperienceRepository } from './work-experience-repository'

export async function buildExportBundle(): Promise<ExportBundle> {
  const [profile, workExperiences, educations, answerBank, applicationRecords] =
    await Promise.all([
      getProfile(),
      workExperienceRepository.list(),
      educationRepository.list(),
      answerBankRepository.list(),
      applicationRecordRepository.list(),
    ])

  return {
    exportedAt: new Date().toISOString(),
    profile,
    workExperiences,
    educations,
    answerBank,
    applicationRecords,
  }
}

export async function restoreFromBundle(bundle: ExportBundle): Promise<void> {
  await Promise.all([
    bundle.profile ? saveProfile(bundle.profile) : Promise.resolve(),
    workExperienceRepository.replaceAll(bundle.workExperiences),
    educationRepository.replaceAll(bundle.educations),
    answerBankRepository.replaceAll(bundle.answerBank),
    applicationRecordRepository.replaceAll(bundle.applicationRecords),
  ])
}
