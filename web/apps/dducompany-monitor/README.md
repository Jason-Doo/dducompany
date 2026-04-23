# DDUCompany Monitor (Web)

화이트 기반의 심플한 대시보드 + 가운데 캔버스(직원 아바타) + 우측 채팅 패널을 가진 모니터링 웹앱 스캐폴드입니다.

## Run
그냥 파일 열기만 해도 동작합니다.
- `web/apps/dducompany-monitor/index.html`

## Live data (optional)
현재는 기본이 **Mock 모드**입니다.

Supabase(DDUCompany 모니터링 DB) 연동을 하려면 `app.js`의 TODO 영역에
anon key + RLS 정책을 포함한 “읽기 전용” 구성을 추가하세요.

