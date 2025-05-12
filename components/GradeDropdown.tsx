import React from 'react';
import { ChevronDown } from 'lucide-react';
import { GradeOption, Grade } from '../types';

const gradeOptions: GradeOption[] = [
  { id: 0, label: "All Grades", value: Grade.ALL },
  { id: 1, label: "Kindergarten", value: Grade.KINDERGARTEN },
  { id: 2, label: "Grade 1", value: Grade.GRADE_1 },
  { id: 3, label: "Grade 2", value: Grade.GRADE_2 },
  { id: 4, label: "Grade 3", value: Grade.GRADE_3 },
  { id: 5, label: "Grade 4", value: Grade.GRADE_4 },
  { id: 6, label: "Grade 5", value: Grade.GRADE_5 },
  { id: 7, label: "Grade 6", value: Grade.GRADE_6 },
  { id: 8, label: "Grade 7", value: Grade.GRADE_7 },
  { id: 9, label: "Grade 8", value: Grade.GRADE_8 },
  { id: 10, label: "Grade 9", value: Grade.GRADE_9 },
  { id: 11, label: "Grade 10", value: Grade.GRADE_10 },
  { id: 12, label: "Grade 11", value: Grade.GRADE_11 },
  { id: 13, label: "Grade 12", value: Grade.GRADE_12 },
];

interface GradeDropdownProps {
  value: Grade;
  onChange: (value: Grade) => void;
}

export function GradeDropdown({ value, onChange }: GradeDropdownProps) {
  return (
    <div className="relative h-full">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value as Grade)}
        className="appearance-none h-full pl-3 pr-8 bg-gray-100 rounded-md text-sm text-gray-900 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400"
      >
        {gradeOptions.map((grade) => (
          <option key={grade.id} value={grade.value}>
            {grade.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );
}