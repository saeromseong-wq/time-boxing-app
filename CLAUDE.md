# CLAUDE.md

이 저장소에서 작업할 때 참고할 컨텍스트와 지침.

## 프로젝트 개요

**DeepBox** — 개인용 타임박싱 + 몰입 타이머 웹앱. <딥 워크>를 읽고 타임박싱을 실천하는 사용자가 구글 캘린더의 불편함(입력 마찰, 실제 몰입 시간 측정 불가)을 해결하려고 만듦.

핵심 차별점: 계획한 시간(타임박스)과 **실제 몰입한 시간**(일시정지 제외 누적)을 분리해서 기록·비교한다.

배경/기능 요구사항은 [PRD.md](PRD.md), 개발 순서는 [DEV_PLAN.md](DEV_PLAN.md), 지난 작업 이력은 `PROGRESS_*.md`에 있다.

## 스택 & 구조

- React 19 + Vite + TypeScript, Tailwind CSS v4, react-router-dom
- Supabase (PostgreSQL + Auth + RLS) — 클라이언트에서 직접 REST 호출, 별도 백엔드 서버 없음
- 배포: Vercel (GitHub push 시 자동 배포)

```
app/src/
  lib/          supabase 클라이언트, 시간 유틸(time.ts)
  types/        도메인 타입 (Task, TimeBox, FocusSession)
  features/
    auth/       로그인/회원가입, AuthContext
    tasks/      Task CRUD, TaskPicker (타임박스 생성 시 재사용)
    timeline/   오늘 화면 — 세로 타임라인, 드래그로 타임박스 생성/이동/리사이즈
    timer/      몰입 타이머 — FocusContext(전역 상태), MiniTimerBar, TimerPage
    stats/      주간/월간 통계
  components/   Modal 등 공용 UI
supabase/schema.sql   테이블 + RLS 정책 원본 (Supabase SQL Editor에 붙여넣는 용도)
```

데이터 모델: `tasks` (등록된 할 일) → `time_boxes` (계획, date+start_min/end_min) → `focus_sessions` (실제 몰입, focused_seconds 누적). 몰입 밀도 = focused_seconds / 계획 duration.

## 로컬 개발 시작하는 법

```bash
cd app
npm install        # 처음 한 번만
npm run dev        # http://localhost:5173
```

`app/.env.local`에 Supabase 키가 필요하다 (`.env.example` 참고):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
이 파일은 git에 커밋되지 않는다 (`.gitignore` 처리됨). 없으면 로그인 화면에 안내 문구가 뜬다.

브라우저 프리뷰로 로그인 테스트가 필요하면 `.claude/test-account.local.md`(git에 커밋되지 않음)에 있는 테스트 계정을 쓴다.

빌드 확인: `npm run build` (tsc -b && vite build)

## 배포하는 법

**GitHub push만 하면 끝난다.** Vercel이 `main` 브랜치를 자동으로 감지해서 빌드·배포한다.

```bash
git add .
git commit -m "..."
git push
```

몇십 초 안에 https://app-six-sand-49.vercel.app 에 반영된다. 수동으로 배포하려면 `cd app && npx vercel --prod`.

배포 실패 시 `cd app && npx vercel inspect <deployment-url> --logs`로 원인 확인. Vercel 프로젝트의 **Root Directory는 반드시 `app`이어야 한다** — 저장소 루트에는 package.json이 없어서(app/ 하위에만 있음) 잘못 설정되면 `vite: command not found`로 빌드가 깨진다.

## Supabase

- 프로젝트 ref: `itcrcamyhccqubptbjag`
- 스키마 변경 시 `supabase/schema.sql`을 갱신하고, Supabase 대시보드 SQL Editor에 그 **내용**을 붙여넣어 실행한다 (파일 경로를 붙여넣는 실수 주의 — SQL Editor는 SQL 텍스트만 받는다).
- 모든 테이블에 RLS가 걸려 있고 `user_id`는 `auth.uid()` 기본값으로 채워진다. 새 테이블을 추가하면 반드시 RLS policy를 함께 작성할 것.
- 최신 Supabase UI에는 Email 설정 모달에 "Confirm email" 토글이 없다. 테스트 계정이 필요하면 Authentication → Users → Add user에서 "Auto Confirm User" 옵션으로 생성한다.

## 코드 컨벤션 (기존 코드에서 확인된 것)

- UI 텍스트는 전부 한국어.
- 주석은 거의 없음 — WHY가 비자명한 경우에만 한 줄로 작성 (예: `FocusContext.tsx`의 timestamp 기반 계산 이유).
- 타이머는 **절대 `setInterval`로 시간을 누적하지 않는다.** `focused_seconds` + `Date.now() - last_resumed_at`처럼 timestamp 차이로 계산한다 — 탭이 백그라운드에 있거나 다른 기기로 접속해도 정확해야 하기 때문.
- 차트/색상은 `dataviz` 스킬의 검증된 팔레트를 사용 중 (`StatsPage.tsx`의 `CATEGORY_COLOR`). 색을 추가/변경하면 `validate_palette.js`로 재검증할 것.
- 다크모드는 Tailwind `dark:` 클래스로 전 화면 대응되어 있음 — 새 컴포넌트도 라이트/다크 둘 다 스타일링할 것.

## 이 앱을 수정할 때 체크리스트

1. `cd app && npm run dev`로 로컬 확인 (브라우저 프리뷰 도구로 실제 클릭까지 검증 권장)
2. 스키마를 바꿨다면 Supabase SQL Editor에도 반영했는지 확인
3. `npm run build`로 타입 에러 없는지 확인
4. git push → Vercel 자동 배포 확인 (`npx vercel ls`로 최신 배포 Ready 상태 확인)
