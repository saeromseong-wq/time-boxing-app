# 개발 계획 — Time Boxing App

목표: 내일까지 MVP(P0) 완성 + Vercel 배포

## 스택
- React 19 + Vite + TypeScript, Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS)
- react-router-dom (라우팅)
- 차트: 경량 커스텀 SVG (외부 차트 라이브러리 없이)

## 프로젝트 구조
```
app/
  src/
    lib/          supabase 클라이언트, 시간 유틸
    types/        도메인 타입 (Task, TimeBox, FocusSession)
    features/
      auth/       로그인/회원가입
      tasks/      Task 라이브러리 CRUD
      timeline/   오늘 뷰 (세로 타임라인, 타임박스 생성/이동/리사이즈)
      timer/      몰입 타이머 (비주얼 타이머, 일시정지/재개, 미니 바)
      stats/      주간/월간 통계
    components/   공용 UI
supabase/
  schema.sql      테이블 + RLS 정책 (Supabase SQL Editor에 붙여넣기)
```

## 데이터 스키마
- `tasks`: name, color, category(deep/shallow/rest), default_duration_min, archived, last_used_at
- `time_boxes`: task_id, date, start_min, end_min (계획)
- `focus_sessions`: time_box_id, state(running/paused/done), started_at, ended_at,
  focused_seconds(일시정지 제외 누적), last_resumed_at, pause_count
- 모든 테이블 user_id + RLS → 본인 데이터만 접근
- 타이머는 timestamp 기반 계산: 진행 중 = focused_seconds + (now − last_resumed_at).
  탭을 닫아도 DB에 상태가 있어 어느 기기에서든 복원됨.

## 작업 순서
1. **스캐폴딩** — Vite 프로젝트 생성, Tailwind, Supabase 클라이언트, 라우팅 뼈대
2. **스키마 + 인증** — schema.sql 작성, 이메일/비밀번호 로그인
3. **Task 라이브러리** — CRUD, 색상/카테고리, 최근 사용순
4. **오늘 타임라인** — 세로 타임라인, 클릭/드래그로 타임박스 생성, 이동/리사이즈/삭제
5. **몰입 타이머** — 원형 비주얼 타이머, 일시정지/재개/종료, 상단 미니 타이머 바, 상태 복원
6. **통계** — 주간/월간 몰입 시간, 몰입 밀도, 카테고리 분포, 빈 시간 시각화
7. **마무리** — 다크 모드, 반응형 점검, Vercel 배포

## 사용자가 해야 할 일 (개발과 병행)
1. https://supabase.com 에서 무료 프로젝트 생성
2. SQL Editor에 `supabase/schema.sql` 내용 실행
3. Project Settings → API 에서 URL과 anon key를 `app/.env.local`에 입력
4. 배포 시: GitHub repo 생성 → Vercel 연결 (환경변수 동일하게 입력)
