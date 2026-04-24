export { LoginPage } from './LoginPage'
export { DashboardPage } from './DashboardPage'
export { AccountSelectionPage } from './AccountSelectionPage'
export { AccountStepPage } from './AccountStepPage'
export { IdentityPage } from './IdentityPage'
export { CorporateSetupPage } from './CorporateSetupPage'
export { CompanyDetailsPage } from './CompanyDetailsPage'
export { OwnershipPage } from './OwnershipPage'
export { RelationshipPage } from './RelationshipPage'
export { AuthorisedPeoplePage } from './AuthorisedPeoplePage'
export { QuestionnairePage } from './QuestionnairePage'
export { ReviewSubmitPage } from './ReviewSubmitPage'

// Re-export data interfaces
export type { CorporateSetupData } from './CorporateSetupPage'
// CompanyDetailsPage has no exported data interface (uploadDocuments takes an inline object)
export type { IndividualOwnerData } from './OwnershipPage'
export type { RelationshipData } from './RelationshipPage'
export type { AuthorisedPersonData } from './AuthorisedPeoplePage'
