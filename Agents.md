# Agents Context

이 문서는 `/agents` 폴더의 역할 문서를 제품 기획에 반영하기 위한 기준 요약이다.

## 목적

- 각 에이전트의 강점을 기획/개발 단계에 맞게 연결한다.
- 실제 구현에서 어떤 문서를 우선 참조할지 명확히 한다.

## 에이전트 요약

1. `agents/server-specialist.md`
- Express 서버 구조화, API 응답 포맷 일관성, 에러 처리 패턴에 강점.
- 본 프로젝트에서는 `REST API`, `WebSocket 이벤트 설계`, `서버 레이어 규칙`에 반영.

2. `agents/react-single-file-dev.md`
- 단일 HTML 시나리오 특화 문서이지만, UI 구성 원칙(컴포넌트 분리, 상태 분리)은 활용 가능.
- 본 프로젝트에서는 `탭 기반 레이아웃`, `컴포넌트 계층 설계` 참고용.

3. `agents/auth-specialist.md`
- JWT/인증 중심 문서. 이번 범위는 `Auth 미사용`이라 직접 적용 범위는 제한적.
- 단, `입력 검증`, `오류 메시지 보안`, `DB 파라미터 바인딩` 원칙은 적용.

4. `agents/vercel-deploy-optimizer.md`
- 배포/환경변수/프로젝트 분석 흐름에 강점.
- 본 프로젝트에서는 `배포 전략`, `환경변수 분리`, `프론트/백엔드 분리 배포`에 반영.

## 본 프로젝트 적용 결론

- 핵심 반영: `server-specialist`, `vercel-deploy-optimizer`
- 부분 반영: `auth-specialist`(보안 코딩 규칙만)
- 참고 반영: `react-single-file-dev`(UI 설계 방식만)

## 비적용/제외 범위

- 로그인/회원가입/JWT 토큰 기반 사용자 인증
- 단일 `index.html` 고정 아키텍처

