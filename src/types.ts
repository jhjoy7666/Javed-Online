export type ExamStatus = 'Pending' | 'Passed' | 'Failed' | 'Unknown';

export interface UserPreferences {
  telegramBotToken?: string;
  telegramChatId?: string;
  autoCheckEnabled?: boolean;
}

export interface PassportEntry {
  id?: string;
  passportNumber: string;
  occupationCode: string;
  occupationName: string;
  nationalityId: string;
  lastStatus: ExamStatus;
  applicantName: string;
  examDate: string;
  testCenter: string;
  lastUpdated: string;
}

export interface HistoryLog {
  id?: string;
  passportNumber: string;
  oldStatus: ExamStatus;
  newStatus: ExamStatus;
  timestamp: any;
}
export interface ApiResponse {
  exam_result: string; // Passed/Pending/Failed/Unknown
  labor: {
    name: string;
    passport_number: string;
  };
  occupation: {
    occupation_name: string;
  };
  exam_details: {
    exam_date: string; // DD-MM-YYYY
    test_center_name: string;
  } | null;
}
