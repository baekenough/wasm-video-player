# WASM Video Player

WebAssembly 기반의 고성능 웹 비디오 플레이어입니다. FFmpeg 수준의 포맷 지원과 부드러운 탐색 성능을 제공합니다.

[English](./README.md)

## 주요 기능

- **다양한 포맷 지원**: MKV, AVI, MP4, WebM 등
- **다중 코덱**: FFmpeg.wasm을 통한 H.264, HEVC/H.265, VP9 지원
- **WebCodecs 가속**: 가능한 경우 하드웨어 가속 디코딩
- **빠른 탐색**: 키프레임 인덱싱과 양방향 버퍼링
- **키보드 컨트롤**: 방향키로 5초, Shift+방향키로 60초 이동
- **자막 지원**: SRT, ASS/SSA 포맷
- **모던 UI**: 넷플릭스 스타일의 다크 테마, 반응형 디자인
- **크로스 플랫폼**: 웹 및 데스크톱(Tauri) 지원

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Tauri Shell                          │
│              (데스크톱 컨테이너, 파일 시스템 접근)              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   웹 레이어 (TypeScript)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  UI 컨트롤  │  │   키보드    │  │    자막 렌더러      │  │
│  │ (다크 테마) │  │   핸들러    │  │   (SRT/ASS)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           비디오 캔버스 (WebGL 렌더링)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │ WASM 바인딩
┌─────────────────────────────────────────────────────────────┐
│                       디코딩 레이어                          │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  WebCodecs API  │  │  FFmpeg.wasm (폴백)             │   │
│  │  (HW 가속)      │  │  (범용 포맷 지원)                │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 빠른 시작

### 사전 요구 사항

- Node.js >= 18.0.0
- Rust & wasm-pack (WASM 빌드용)

### 설치

```bash
# 저장소 복제
git clone https://github.com/user/wasm-video-player.git
cd wasm-video-player

# 의존성 설치
npm install

# WASM 모듈 빌드
npm run wasm:build

# 개발 서버 시작
npm run dev
```

브라우저에서 https://localhost:3002 를 엽니다.

### 사용법

1. **비디오 불러오기**: 비디오 파일을 드래그 앤 드롭하거나 클릭하여 파일 선택
2. **재생 컨트롤**:
   - `Space`: 재생/일시정지
   - `←/→`: 5초 뒤로/앞으로
   - `Shift + ←/→`: 60초 뒤로/앞으로
   - `↑/↓`: 볼륨 조절
   - `F`: 전체화면 토글
   - `M`: 음소거 토글

## 개발

### 프로젝트 구조

```
wasm-video-player/
├── src/                    # TypeScript 소스
│   ├── main.ts             # 진입점
│   ├── App.ts              # 애플리케이션 컨트롤러
│   ├── player/             # 재생 코어
│   │   ├── Player.ts       # 플레이어 컨트롤러
│   │   ├── WasmBridge.ts   # 디코더 브릿지
│   │   ├── Demuxer.ts      # 컨테이너 파싱
│   │   └── WebCodecsDecoder.ts
│   ├── renderer/           # 비디오 렌더링
│   │   └── WebGLRenderer.ts
│   ├── ui/                 # UI 컴포넌트
│   │   ├── Controls.ts
│   │   ├── SeekBar.ts
│   │   └── VolumeControl.ts
│   ├── input/              # 입력 처리
│   │   └── KeyboardHandler.ts
│   ├── settings/           # 사용자 설정
│   └── subtitle/           # 자막 처리
├── crates/player-core/     # Rust WASM (선택)
├── src-tauri/              # 데스크톱 쉘
├── e2e/                    # E2E 테스트
└── .specify/               # 스펙 문서
    ├── memory/
    │   └── constitution.md # 프로젝트 원칙
    └── specs/
        ├── 001-core-playback/      # 핵심 재생
        ├── 002-seek-optimization/  # 탐색 최적화
        ├── 003-subtitle-support/   # 자막 지원
        ├── 004-ui-controls/        # UI 컨트롤
        └── 005-settings/           # 설정
```

### NPM 스크립트

```bash
# 개발
npm run dev              # 개발 서버 시작 (포트 3002)
npm run build            # 프로덕션 빌드
npm run preview          # 프로덕션 빌드 미리보기

# WASM
npm run wasm:build       # WASM 빌드 (릴리즈)
npm run wasm:dev         # WASM 빌드 (디버그)

# 테스트
npm test                 # 유닛 테스트 실행
npm run test:ui          # UI와 함께 테스트 실행
npm run test:coverage    # 커버리지 리포트 생성
npm run test:e2e         # E2E 테스트 실행

# 코드 품질
npm run lint             # ESLint 검사
npm run format           # Prettier 포맷팅
```

### 프로덕션 빌드

```bash
# 웹 빌드
npm run build

# 데스크톱 빌드 (Tauri CLI 필요)
npm run tauri build
```

## 기술 스택

| 레이어 | 기술 |
|-------|------|
| 디코딩 | WebCodecs API, FFmpeg.wasm |
| 디먹싱 | mp4box.js |
| 렌더링 | WebGL 2.0, Canvas API |
| 오디오 | Web Audio API |
| UI | TypeScript (Vanilla), CSS |
| 빌드 | Vite |
| 테스트 | Vitest, Playwright |
| 데스크톱 | Tauri (선택) |

## 테스트

### 유닛 테스트

```bash
npm test                 # 워치 모드
npm run test:coverage    # 커버리지 리포트와 함께
```

커버리지 목표: Rust와 TypeScript 모두 **100%**

### E2E 테스트

```bash
# 먼저 개발 서버 시작
npm run dev

# E2E 테스트 실행
npm run test:e2e
```

## 키보드 단축키

| 키 | 동작 |
|----|------|
| `Space` | 재생 / 일시정지 |
| `←` | 5초 뒤로 |
| `→` | 5초 앞으로 |
| `Shift + ←` | 60초 뒤로 |
| `Shift + →` | 60초 앞으로 |
| `↑` | 볼륨 높이기 |
| `↓` | 볼륨 낮추기 |
| `M` | 음소거 / 음소거 해제 |
| `F` | 전체화면 토글 |

## 브라우저 지원

| 브라우저 | 버전 | 비고 |
|---------|------|------|
| Chrome | 94+ | 완전 지원 (WebCodecs) |
| Edge | 94+ | 완전 지원 (WebCodecs) |
| Firefox | 130+ | FFmpeg.wasm 폴백 |
| Safari | 16.4+ | 제한적 WebCodecs 지원 |

> **참고**: SharedArrayBuffer와 WebCodecs API를 위해 HTTPS가 필요합니다.

## 지원 포맷

### 컨테이너
- MP4, M4V, MOV
- MKV, WebM
- AVI (FFmpeg.wasm 통해)

### 비디오 코덱
- H.264 / AVC
- H.265 / HEVC
- VP9
- AV1 (브라우저 의존)

### 오디오 코덱
- AAC
- MP3
- Opus
- Vorbis

### 자막
- SRT
- ASS / SSA

## 설정

설정은 localStorage에 저장되며 커스터마이징 가능합니다:

```typescript
interface Settings {
  playback: {
    autoPlay: boolean;
    loop: boolean;
    volume: number;        // 0-1
    muted: boolean;
    playbackRate: number;  // 0.25-2.0
  };
  seek: {
    shortSeek: number;     // 초 (기본값: 5)
    longSeek: number;      // 초 (기본값: 60)
  };
  subtitle: {
    enabled: boolean;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
  };
  ui: {
    theme: 'dark' | 'light';
    controlsAutoHide: boolean;
    controlsHideDelay: number;
  };
}
```

## 설계 원칙

1. **WASM-First 아키텍처**: 성능이 중요한 작업은 WebAssembly에서 처리
2. **테스트 우선 개발**: 100% 커버리지 목표, TDD 워크플로우
3. **성능 지향**: 키프레임 인덱싱, 양방향 버퍼링
4. **크로스 플랫폼**: 웹과 데스크톱에 동일한 코드베이스
5. **단순함**: 최소한의 의존성, 프레임워크 오버헤드 없음

## 기여하기

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 테스트 먼저 작성 (TDD)
4. 기능 구현
5. 100% 테스트 커버리지 확인
6. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
7. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
8. Pull Request 생성

### 코드 표준

- TypeScript: ESLint + Prettier, strict 모드
- Rust: `cargo fmt`, `cargo clippy`
- 주석: 영어로만, "무엇"이 아닌 "왜"를 설명

## 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE)를 참조하세요.

## 감사의 말

- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - WebAssembly용 FFmpeg
- [mp4box.js](https://github.com/niclas-niclas/niclas-niclas.github.io) - MP4 파싱
- [Tauri](https://tauri.app/) - 데스크톱 프레임워크
