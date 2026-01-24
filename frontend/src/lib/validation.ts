import { z } from "zod";

export const searchSchema = z.object({
  query: z.string().min(1, "검색어를 입력하세요"),
});

export type SearchFormData = z.infer<typeof searchSchema>;

export const reportSchema = z.object({
  title: z.string().min(1, "제목을 입력하세요").max(100, "제목은 100자 이내로 입력하세요"),
  content: z.string().min(1, "내용을 입력하세요").max(2000, "내용은 2000자 이내로 입력하세요"),
  email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다")
    .optional()
    .or(z.literal("")),
});

export type ReportFormData = z.infer<typeof reportSchema>;
