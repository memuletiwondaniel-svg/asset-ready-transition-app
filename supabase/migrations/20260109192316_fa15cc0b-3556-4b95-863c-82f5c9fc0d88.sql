-- Add mock Arabic/Iraqi attendees to Compressor Operations Training
UPDATE ora_training_items SET 
  trainees = ARRAY[
    'Ahmed Al-Rashid|Operations Engineer|EMP-1001',
    'Mohammed Al-Saadi|Senior Operator|EMP-1002',
    'Hassan Al-Jubouri|Process Technician|EMP-1003',
    'Ali Al-Khafaji|Control Room Operator|EMP-1004',
    'Omar Al-Dulaimi|Maintenance Supervisor|EMP-1005',
    'Yusuf Al-Tamimi|Plant Operator|EMP-1006',
    'Kareem Al-Obeidi|Field Operator|EMP-1007',
    'Mustafa Al-Ani|Shift Leader|EMP-1008'
  ]
WHERE id = 'd6e7f8a9-b0c1-2345-defa-678901234567';