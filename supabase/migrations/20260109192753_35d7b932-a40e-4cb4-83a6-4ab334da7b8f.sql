-- Insert mock training evidence for Compressor Operations Training
INSERT INTO ora_training_evidence (
  training_item_id,
  file_name,
  file_path,
  file_type,
  file_size,
  evidence_type,
  description,
  uploaded_by
) VALUES 
(
  'd6e7f8a9-b0c1-2345-defa-678901234567',
  'Attendance_Sheet_Jan2026.jpg',
  'mock/attendance-sheet-scan.jpg',
  'image/jpeg',
  245000,
  'attendance_sheet',
  'Signed attendance sheet for Day 1-3 of training',
  '00000000-0000-0000-0000-000000000000'
),
(
  'd6e7f8a9-b0c1-2345-defa-678901234567',
  'Classroom_Session_Day1.jpg',
  'mock/classroom-training-1.jpg',
  'image/jpeg',
  180000,
  'photo',
  'Classroom theory session - Compressor fundamentals',
  '00000000-0000-0000-0000-000000000000'
),
(
  'd6e7f8a9-b0c1-2345-defa-678901234567',
  'Practical_Training_Field.jpg',
  'mock/practical-training-1.jpg',
  'image/jpeg',
  195000,
  'photo',
  'Hands-on training at compressor station',
  '00000000-0000-0000-0000-000000000000'
),
(
  'd6e7f8a9-b0c1-2345-defa-678901234567',
  'Control_Room_Training.jpg',
  'mock/classroom-training-2.jpg',
  'image/jpeg',
  210000,
  'photo',
  'DCS control room familiarization session',
  '00000000-0000-0000-0000-000000000000'
),
(
  'd6e7f8a9-b0c1-2345-defa-678901234567',
  'Field_Operations_Demo.jpg',
  'mock/practical-training-2.jpg',
  'image/jpeg',
  185000,
  'photo',
  'Field demonstration with senior operators',
  '00000000-0000-0000-0000-000000000000'
);