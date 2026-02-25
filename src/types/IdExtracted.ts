export type IdExtracted = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  sex?: string;
  nationality?: string;
  nationalityCode?: string;

  documentType?: string;
  documentNumber?: string;
  issuingCountryCode?: string;
  issuingCountryName?: string;
  issuingAuthority?: string;
  placeOfIssue?: string;
  issueDate?: string;
  expiryDate?: string;

  mrzLines?: string[];
  mrzParsedOk?: boolean;
  mrzCheckDigitsValid?: boolean;

  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};
