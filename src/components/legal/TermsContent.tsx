import Link from "next/link";
import type { LandingLang } from "@/lib/i18n/lang";

interface TermsContentProps {
  lang: LandingLang;
}

export function TermsContent({ lang }: TermsContentProps) {
  if (lang === "ko") {
    return (
      <>
        {/* 1. 목적 */}
        <section id="sec-1" className="legal-section">
          <h2>1. 목적</h2>
          <p>
            {
              '본 약관은 TypeDiag(이하 "서비스")가 운영하는 타자 진단 및 연습 웹 플랫폼에서 제공하는 인터넷 관련 서비스(이하 "서비스"라 한다)를 이용함에 있어, 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항, 서비스 이용 조건 및 절차 등을 규정함을 목적으로 합니다.'
            }
          </p>
          <p>
            ※ PC, 모바일 기기, 무선 통신망 등을 이용하는 모든 전자상거래 및 온라인 서비스 이용에
            대해 그 성질에 반하지 않는 한 본 약관이 동일하게 적용됩니다.
          </p>
        </section>

        {/* 2. 정의 */}
        <section id="sec-2" className="legal-section">
          <h2>2. 정의</h2>
          <p>본 약관에서 사용하는 주요 용어의 정의는 다음과 같습니다.</p>
          <ul>
            <li>
              <strong>TypeDiag (플랫폼):</strong> 독자적인 키보드 3D 공간 상의 지연 지형(SKDM) 분석
              수학 모델을 기반으로 타저 지연 진단, 통계 시각화 및 타자 연습 환경을 제공하는 온라인
              가상 서비스 플랫폼을 의미합니다.
            </li>
            <li>
              <strong>이용자:</strong> TypeDiag 플랫폼에 접속하여 본 약관에 따라 서비스를 제공받는
              회원 및 비회원을 말합니다.
            </li>
            <li>
              <strong>회원:</strong> TypeDiag에 Clerk 소셜 인증 등을 통해 회원등록을 마친 자로서,
              계속적으로 플랫폼이 제공하는 모든 분석 모델 및 개인 누적 데이터를 이용하고 관리받을 수
              있는 자를 말합니다.
            </li>
            <li>
              <strong>비회원 (게스트):</strong> 회원에 가입하지 않고 브라우저 임시 세션을 통해
              제한된 타자 연습 기능을 이용하는 자를 말합니다.
            </li>
            <li>
              <strong>SKDM (Spatial Keystroke Dynamics Model):</strong> 사용자의 입력 속도뿐만
              아니라 3D 원통형 좌표계 등 키보드 공간 상에서의 키 전환별 지연 시간(hold_duration,
              latency) 등을 기반으로 고유한 오타 및 지연 병목 구간을 도출해내는 핵심 진단 수학
              모델을 의미합니다.
            </li>
            <li>
              <strong>Topic Mode (토픽 모드):</strong> 사용자가 원하는 주제어를 입력하면 AI(OpenAI
              API 등)를 통해 실시간 맞춤형 타자 연습 문장을 생성하고 학습할 수 있도록 제공하는
              서비스를 의미합니다.
            </li>
          </ul>
        </section>

        {/* 3. 약관의 명시와 개정 */}
        <section id="sec-3" className="legal-section">
          <h2>3. 약관의 명시와 개정</h2>
          <ul>
            <li>
              서비스는 본 약관의 내용과 상호, 전자우편 주소, 개인정보관리책임자 등을 이용자가 쉽게
              알 수 있도록 초기 서비스 화면에 게시하거나 연결 화면을 통해 제공합니다.
            </li>
            <li>
              서비스는 「약관의 규제에 관한 법률」, 「정보통신망 이용촉진 및 정보보호 등에 관한
              법률」, 「개인정보 보호법」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수
              있습니다.
            </li>
            <li>
              약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행 약관과 함께 적용일자 7일
              이전부터 적용일자 전일까지 서비스 화면에 공지합니다. 다만, 이용자에게 불리하게 약관
              내용을 변경하는 경우에는 최소한 30일 이상의 사전 유예기간을 두고 공지 및 공지 메일
              발송 등의 조치를 취합니다.
            </li>
            <li>
              개정 약관에 동의하지 않는 회원은 회원 탈퇴(계정 삭제)를 통해 서비스 이용 계약을 해지할
              수 있습니다. 개정 약관의 적용일 이후에도 서비스를 계속 이용할 경우 개정 약관에 동의한
              것으로 간주합니다.
            </li>
          </ul>
        </section>

        {/* 4. 서비스의 제공 및 변경 */}
        <section id="sec-4" className="legal-section">
          <h2>4. 서비스의 제공 및 변경</h2>
          <p>서비스는 이용자에게 다음과 같은 업무를 수행하고 서비스를 제공합니다.</p>
          <ul>
            <li>실시간 WPM, CPM, 정확도 및 MVSA 알고리즘 기반 한글 자소 대조 오타 판별 서비스</li>
            <li>
              물리 키보드 좌표 매핑 및 3D 원통형 지연 지형(Cylindrical Diagnostics) 분석 데이터
              시각화
            </li>
            <li>
              인공지능(OpenAI API 등) 및 벡터 유사도 검색 엔진 기반의 실시간 맞춤형 타자 연습 예문
              생성 (Topic Mode)
            </li>
            <li>학습 세션 통계 분석 보고 및 영속적인 데이터 관리 서비스 (로그인 회원 대상)</li>
            <li>
              기타 서비스가 개발하거나 추가로 회원에게 제공하는 일체의 진단 기능 및 타자 서비스
            </li>
          </ul>
          <p>
            ※ 서비스는 성능 개선, 기술적 사양의 변경, 서버 인프라 교체 등 합리적인 운영상의 사유가
            발생하는 경우 제공 중인 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다. 이 경우
            변경 사유와 내용을 공지사항을 통해 공지합니다.
          </p>
        </section>

        {/* 5. 서비스의 중단 및 면책 */}
        <section id="sec-5" className="legal-section">
          <h2>5. 서비스의 중단 및 면책</h2>
          <ul>
            <li>
              서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절, 천재지변 또는
              이에 준하는 국가 비상사태가 발생한 경우에는 서비스 제공을 일시적으로 중단할 수
              있습니다.
            </li>
            <li>
              서비스는 제1항의 사유로 서비스 제공이 일시 중단됨으로 인하여 이용자에게 발생한 간접적
              손해에 대해 고의 또는 과실이 없는 한 배상 책임을 지지 않습니다.
            </li>
            <li>
              정기적인 시스템 점검 및 서버 이전 등이 필요한 경우, 사전 공지를 통하여 서비스의 일부
              혹은 전체 기능 이용을 제한할 수 있으며, 이로 인한 지연 사항은 면책됩니다.
            </li>
          </ul>
        </section>

        {/* 6. 회원가입 절차 */}
        <section id="sec-6" className="legal-section">
          <h2>6. 회원가입 절차</h2>
          <ul>
            <li>
              이용자는 서비스가 제공하는 로그인/가입 절차(Clerk 외부 소셜 로그인 및 이메일 링크 인증
              스택 등)에 따라 필수 정보를 입력하고 약관 및 개인정보처리방침에 동의함으로써 회원
              가입을 신청합니다.
            </li>
            <li>
              서비스는 가입 신청자가 타인의 이메일 주소나 인증 정보를 도용하여 가입하는 등
              비정상적인 방법으로 신청한 경우 회원 등록을 승낙하지 않거나, 사후에 확인될 경우 강제
              탈퇴 조치를 취할 수 있습니다.
            </li>
            <li>
              회원가입의 성립 시기는 서비스의 승낙 프로세스가 완료되어 계정이 활성화되고 로그인이
              가능해진 시점으로 합니다.
            </li>
          </ul>
        </section>

        {/* 7. 회원 탈퇴 및 자격 상실 */}
        <section id="sec-7" className="legal-section">
          <h2>7. 회원 탈퇴 및 자격 상실</h2>
          <ul>
            <li>
              회원은 언제든지 서비스 내 설정 메뉴를 통해 회원 탈퇴를 요청할 수 있으며, 서비스는 즉시
              회원 탈퇴를 처리하고 해당 회원 정보를 복구 불가능한 방법으로 파기합니다. (단, 연구
              목적으로 가명화 처리가 끝난 타건 원시 데이터셋 등 재식별이 불가능한 통계 정보는 제외될
              수 있습니다.)
            </li>
            <li>
              회원이 다음 각 호의 사유에 해당하는 경우, 서비스는 사전 통지 없이 회원 자격을
              제한하거나 즉시 정지 및 상실시킬 수 있습니다.
              <ol>
                <li>가입 신청 시에 타인의 정보 도용 및 허위 내용을 등록한 경우</li>
                <li>
                  오토 타이퍼, 매크로 봇 등의 비정상적인 프로그램을 사용하여 타사 기록이나 키
                  이벤트를 부정하게 조작하고 서버 리소스를 과도하게 점유하는 경우
                </li>
                <li>
                  API 엔드포인트를 무단으로 파싱하고 대량으로 호출하여 서비스 시스템 및
                  데이터베이스의 정상적 운영을 방해하는 경우
                </li>
                <li>
                  타인의 서비스 이용을 방해하거나 정보를 도용하는 등 타자 연습 플랫폼 내 질서를
                  방해하는 경우
                </li>
              </ol>
            </li>
            <li>
              동일한 금지 행위가 2회 이상 반복되거나 15일 이내에 서비스의 정정 요구가 시정되지 않는
              경우 서비스는 해당 계정을 강제 영구 제재하고 등록 정보를 말소할 수 있습니다.
            </li>
          </ul>
        </section>

        {/* 8. 회원에 대한 통지 */}
        <section id="sec-8" className="legal-section">
          <h2>8. 회원에 대한 통지</h2>
          <ul>
            <li>
              서비스가 특정 회원에 대해 개별 통지를 하는 경우, 회원이 Clerk 프로필 또는 회원 정보에
              등록한 전자우편 주소를 우선으로 활용합니다.
            </li>
            <li>
              불특정다수 회원에 대한 통지의 경우 1주일 이상 서비스 내 공지사항 게시판 또는 초기 화면
              팝업 등으로 게시함으로써 개별 통지에 갈음할 수 있습니다. 단, 회원 본인의 개인정보 권리
              행사나 계정 보안 등 중대한 영향을 미치는 사항에 대해서는 이메일을 통한 개별 통지를
              원칙으로 합니다.
            </li>
          </ul>
        </section>

        {/* 9. 비회원 게스트 세션 및 데이터 병합 */}
        <section id="sec-9" className="legal-section">
          <h2>9. 비회원 게스트 세션 및 데이터 병합</h2>
          <p>
            비회원 게스트의 데이터 일관성과 영속성을 보장하기 위해 다음과 같은 규칙이 적용됩니다.
          </p>
          <ul>
            <li>
              <strong>게스트 식별자 발급:</strong> 비회원으로 타자 연습을 수행하는 경우, 서비스는
              브라우저 localStorage에 임의의 {"`guest_<uuid>`"} 및 HMAC 무결성 검증 토큰을 자동
              발급하여 게스트 임시 세션을 유지합니다.
            </li>
            <li>
              <strong>회원 가입 및 로그인 시 데이터 병합(Merge):</strong> 비회원 상태에서 측정된
              타자 기록, WPM/CPM 지연 모델, 통계 지형 등의 데이터는 이용자가 회원가입 또는 로그인을
              완료하는 즉시 Clerk 회원 고유 ID와 1:1로 영구 매핑 및 병합(Merge) 처리됩니다.
            </li>
            <li>
              <strong>임시 토큰 폐기:</strong> 데이터 병합이 정상적으로 종료되면, 브라우저 내의 기존
              게스트 식별자 및 HMAC 임시 토큰 정보는 완전하고 안전하게 자동 삭제 및 파기 처리됩니다.
            </li>
          </ul>
          <div className="legal-callout">
            <p>
              ※ <strong>데이터 손실 주의</strong>: 브라우저 쿠키 및 LocalStorage를 임의로
              초기화하거나 시크릿 창을 닫는 경우, 병합되지 않은 비회원 게스트의 연습 기록은 복구할
              수 없으며 서비스는 이에 대해 책임을 지지 않습니다.
            </p>
          </div>
        </section>

        {/* 10. 향후 유료 서비스 및 결제 원칙 */}
        <section id="sec-10" className="legal-section">
          <h2>10. 향후 유료 서비스 및 결제 원칙</h2>
          <p>TypeDiag 비즈니스 모델 설계에 따른 유료화 대비 일반 원칙은 다음과 같습니다.</p>
          <ul>
            <li>
              <strong>기본 정책:</strong> 현재 제공되는 모든 타건 분석 및 연습 기능은 전면 무료로
              제공됩니다.
            </li>
            <li>
              <strong>Pro 플랜(유료 구독) 대비:</strong> 향후 심화 통계 모델, 한도 없는 AI 생성 기능
              등을 제공하는 `Pro` 구독 플랜 및 B2B 좌석 요금제가 신설될 수 있습니다. 유료 플랜이
              도입되는 경우 요금제 적용 및 전환은 회원의 명시적인 개별 동의와 결제 처리를 전제로
              하며, 자동 결제되지 않습니다.
            </li>
            <li>
              <strong>결제 방식 및 취소:</strong> 유료 서비스 이용 시 정식 PG사 및 글로벌 결제
              모듈(Stripe 등)을 연동하며, 디지털 콘텐츠의 특성상 제공이 개시된 당월 구독 분에 대한
              환불 조건 등은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관계법령 및 개별 결제
              화면 내 동의 조건에 따릅니다.
            </li>
          </ul>
        </section>

        {/* 11. 개인정보보호 */}
        <section id="sec-11" className="legal-section">
          <h2>11. 개인정보보호</h2>
          <ul>
            <li>
              서비스는 서비스 제공을 위해 필요한 최소한의 범위 내에서 개인정보를 수집 및 처리합니다.
              (Clerk ID, 이메일, 이름, 게스트 UUID, 타건 키 이벤트 등)
            </li>
            <li>
              개인정보 수집, 이용, 제공, 파기 및 가명화 처리에 관한 상세 사항은 별도로 게시된{" "}
              <Link href="/privacy">개인정보처리방침</Link>을 준수하며, 이는 본 약관과 상호보완적인
              효력을 가집니다.
            </li>
          </ul>
        </section>

        {/* 12. 서비스 제공자의 의무 */}
        <section id="sec-12" className="legal-section">
          <h2>12. 서비스 제공자의 의무</h2>
          <ul>
            <li>
              서비스는 관련 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 본
              약관이 정하는 바에 따라 지속적이고 안정적인 타자 분석 및 연습 서비스를 제공하는 데
              최선을 다하여야 합니다.
            </li>
            <li>
              서비스는 이용자가 안전하게 인터넷 서비스를 이용할 수 있도록 개인정보 및 키 로그 보안을
              위한 보안 시스템을 기술적으로 견고하게 유지해야 합니다.
            </li>
            <li>
              서비스는 이용자가 제기한 의견이나 불만이 정당하다고 객관적으로 인정될 경우에는
              합리적인 절차에 의해 즉각 처리하여야 합니다.
            </li>
          </ul>
        </section>

        {/* 13. 회원의 계정 관리 의무 */}
        <section id="sec-13" className="legal-section">
          <h2>13. 회원의 계정 관리 의무</h2>
          <ul>
            <li>
              소셜 인증 대행 서비스(Clerk 등)를 통해 연동된 로그인 세션 및 계정 관리 책임은 회원
              본인에게 있습니다.
            </li>
            <li>
              회원은 자신의 계정을 제3자에게 임의로 양도하거나 대여하여 사용하게 해서는 안 됩니다.
            </li>
            <li>
              회원은 자신의 계정이 도난당하거나 제3자가 무단으로 사용하고 있음을 인지한 경우에는
              즉시 서비스(support@typediag.com)에 통보하고 지침이 있는 경우 이에 따라야 합니다.
            </li>
          </ul>
        </section>

        {/* 14. 이용자의 금지행위 */}
        <section id="sec-14" className="legal-section">
          <h2>14. 이용자의 금지행위</h2>
          <p>
            이용자는 서비스를 이용할 때 다음 각 호의 행위를 하여서는 안 되며, 적발 시 일시 정지 또는
            강제 탈퇴 등의 서비스 이용 제한을 받을 수 있습니다.
          </p>
          <ul>
            <li>회원가입 신청 또는 정보 변경 시 허위 내용의 등록</li>
            <li>타인의 개인정보 또는 Clerk 계정 인증 정보의 도용</li>
            <li>
              서비스가 공식적으로 허용하지 않는 방식으로 API 및 서버 데이터베이스에 접근하거나
              비정상적인 호출(어뷰징)을 반복하는 행위
            </li>
            <li>
              오토타이핑 프로그램, 키보드 입력 자동화 매크로, 데이터 변조 봇을 사용하여 정상적인
              연습 지표 및 WPM/CPM 지연 모델 데이터의 무결성을 훼손하는 행위
            </li>
            <li>서비스의 저작권 및 지적재산권을 침해하거나 명예를 훼손하는 행위</li>
            <li>
              기타 관계 법령에 위배되거나 플랫폼의 정상적인 서버 운영을 방해하는 해킹 또는 리소스
              점유 행위
            </li>
          </ul>
        </section>

        {/* 15. 저작권의 귀속 및 이용제한 */}
        <section id="sec-15" className="legal-section">
          <h2>15. 저작권의 귀속 및 이용제한</h2>
          <ul>
            <li>
              서비스가 자체적으로 설계, 개발하고 작성한 타자 연습용 텍스트, 3D 원통형 진단 지형
              시각화 화면, SKDM 분석 로직, MVSA 한글 오타 판별 로직 및 기타 디자인 에셋에 대한
              저작권 및 일체의 지적재산권은 TypeDiag에 귀속됩니다.
            </li>
            <li>
              이용자는 서비스를 이용함으로써 얻은 정보 중 서비스에게 지적재산권이 귀속된 정보를
              서비스의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로
              이용하거나 제3자에게 무단으로 이용하게 하여서는 안 됩니다.
            </li>
            <li>
              회원이 입력하여 생성한 Topic Mode 문장에 내포된 개별 텍스트 등은 타인의 권리를
              침해하지 않는 범위 내에서 서비스 내의 코퍼스 보강 및 데이터셋 가명화 연구용으로 활용될
              수 있으며, 회원은 이에 동의합니다.
            </li>
          </ul>
        </section>

        {/* 16. 분쟁해결 및 재판관할 */}
        <section id="sec-16" className="legal-section">
          <h2>16. 분쟁해결 및 재판관할</h2>
          <ul>
            <li>
              서비스는 이용자가 제기하는 정당한 피드백이나 불만 사항을 적극 반영하고 개선하기 위해
              노력합니다. 문의 사항은 고객센터(support@typediag.com) 또는 피드백 전송 폼을 통해
              처리됩니다.
            </li>
            <li>
              서비스와 이용자 간에 발생한 전자상거래 및 온라인 서비스 이용 분쟁에 관한 소송은 제소
              당시 이용자의 주소지에 의하며, 주소가 없는 경우에는 거소를 관할하는 지방법원의
              전속관할로 합니다. 단, 주소 또는 거소가 불분명한 경우에는 민사소송법상의 관할법원에
              제기합니다.
            </li>
            <li>서비스와 이용자 간에 제기된 소송에는 대한민국 법률을 준거법으로 적용합니다.</li>
          </ul>
        </section>
      </>
    );
  }

  return (
    <>
      {/* English Version */}
      <section id="sec-1" className="legal-section">
        <h2>1. Purpose</h2>
        <p>
          {
            'These Terms of Service (the "Terms") aim to define the rights, obligations, responsibilities, and conditions of using the typing diagnostics and practice platform operated by TypeDiag ("we," "our," or the "Service").'
          }
        </p>
        <p>
          ※ These Terms apply equally to all services accessed via PC, mobile devices, or wireless
          networks, provided it is compatible with the nature of the Service.
        </p>
      </section>

      <section id="sec-2" className="legal-section">
        <h2>2. Definitions</h2>
        <ul>
          <li>
            <strong>TypeDiag (Platform):</strong> The online platform that provides typing practice,
            diagnostics, and spatial keystroke dynamics visualizations based on our proprietary
            cylindrical modeling (SKDM).
          </li>
          <li>
            <strong>User:</strong> Anyone who accesses TypeDiag to use our Service, including
            registered members and guest users.
          </li>
          <li>
            <strong>Member:</strong> A user who registers for the Service through authentication
            handlers (such as Clerk Auth) to save typing diagnostics logs and track metrics over
            time.
          </li>
          <li>
            <strong>Guest User:</strong> A user who interacts with typing functions temporarily
            without creating an account.
          </li>
          <li>
            <strong>SKDM (Spatial Keystroke Dynamics Model):</strong> The mathematical analysis
            engine mapping keystroke transitions on a 3D cylindrical landscape to isolate spatial
            bottlenecks and typing latencies.
          </li>
          <li>
            <strong>Topic Mode:</strong>{" "}
            {
              "A practice option where custom practice sentences are generated dynamically by AI models based on a user's typed prompt."
            }
          </li>
        </ul>
      </section>

      <section id="sec-3" className="legal-section">
        <h2>3. Display & Amendment of Terms</h2>
        <ul>
          <li>
            We make the details of these Terms accessible to users on our main landing page or via
            linked pages.
          </li>
          <li>
            We reserve the right to amend these Terms in accordance with applicable digital trade
            laws.
          </li>
          <li>
            Amendments will be posted 7 days prior to enforcement. If modifications significantly
            affect your rights, we will notify you at least 30 days in advance via notification
            panels or registered emails.
          </li>
          <li>
            Continued use of the platform after the enforcement date of the amended Terms
            constitutes acceptance of the modified Terms.
          </li>
        </ul>
      </section>

      <section id="sec-4" className="legal-section">
        <h2>4. Provision & Modification of Service</h2>
        <p>We provide the following services to users:</p>
        <ul>
          <li>Real-time WPM, CPM, accuracy tracking, and MVSA syllabic comparison.</li>
          <li>3D Cylindrical diagnostics and spatial typing latency landscape visuals.</li>
          <li>AI-generated custom practice content in Topic Mode.</li>
          <li>Persistent data storage and cumulative session analytics (for Members).</li>
        </ul>
        <p>
          ※ We may update or restrict parts of the service for performance optimization or server
          migrations. Significant updates will be communicated through the announcements section.
        </p>
      </section>

      <section id="sec-5" className="legal-section">
        <h2>5. Suspension & Limitation of Liability</h2>
        <ul>
          <li>
            We may temporarily suspend the Service during network equipment inspections, failures,
            or natural disasters.
          </li>
          <li>
            We are not liable for any indirect damages arising from service suspensions, provided
            that no willful misconduct or gross negligence is found on our part.
          </li>
        </ul>
      </section>

      <section id="sec-6" className="legal-section">
        <h2>6. Membership Registration</h2>
        <ul>
          <li>
            Users apply for membership by agreeing to these terms and authenticating via the sign-in
            widget (Clerk authentication stack).
          </li>
          <li>
            Using stolen email addresses or fraudulent authentication to sign up will result in
            immediate registration refusal or account deletion.
          </li>
        </ul>
      </section>

      <section id="sec-7" className="legal-section">
        <h2>7. Withdrawal & Disqualification</h2>
        <ul>
          <li>
            Members may withdraw their account at any time. All associated user data will be deleted
            immediately, except for pseudonymized key events already salt-hashed for research.
          </li>
          <li>
            We reserve the right to restrict or terminate memberships immediately under the
            following circumstances:
            <ol>
              <li>Using automated macros, auto-typers, or bots to distort typing records.</li>
              <li>Spamming or flooding our API routes or databases.</li>
              <li>Violating intellectual property rights or engaging in abusive behavior.</li>
            </ol>
          </li>
        </ul>
      </section>

      <section id="sec-8" className="legal-section">
        <h2>8. Notifications</h2>
        <ul>
          <li>
            {
              "Individual notices are sent to the email address registered with the member's profile."
            }
          </li>
          <li>
            General notices may be posted on the announcement boards for at least 7 days in place of
            individual emails, except for critical security updates.
          </li>
        </ul>
      </section>

      <section id="sec-9" className="legal-section">
        <h2>9. Guest Session & Data Merge</h2>
        <ul>
          <li>
            <strong>Guest Identifier:</strong> {"We issue temporary "} {"`guest_<uuid>`"}{" "}
            {
              " cookies and HMAC validation keys in the browser's localStorage to preserve session status."
            }
          </li>
          <li>
            <strong>Data Migration:</strong> All local typing logs, accuracy metrics, and speed maps
            recorded during guest sessions are automatically merged into a Member profile
            immediately when the guest logs in.
          </li>
          <li>
            <strong>Token Destruction:</strong> Following a successful migration, temporary guest
            IDs and tokens are safely and permanently erased from local storage.
          </li>
        </ul>
      </section>

      <section id="sec-10" className="legal-section">
        <h2>10. Future Paid Plans & Payments</h2>
        <ul>
          <li>
            <strong>Current Tier:</strong> The core features of TypeDiag are fully free of charge.
          </li>
          <li>
            <strong>Pro Subscription:</strong>{" "}
            {
              'In the future, a "Pro Plan" providing unrestricted AI features or advanced modeling might be introduced. Transitioning to a paid plan requires explicit checkout actions and will never bill automatically from a free account.'
            }
          </li>
          <li>
            <strong>Refunds:</strong> Digital purchases and subscriptions (e.g., Stripe checkouts)
            are governed by digital consumer protection laws and specific in-app billing terms.
          </li>
        </ul>
      </section>

      <section id="sec-11" className="legal-section">
        <h2>11. Privacy Protection</h2>
        <ul>
          <li>
            We process minimal personal data (e.g., Clerk ID, email, keystroke latencies) to keep
            our services running.
          </li>
          <li>
            All data processing conforms strictly to the <Link href="/privacy">Privacy Policy</Link>
            , which is incorporated into these Terms by reference.
          </li>
        </ul>
      </section>

      <section id="sec-12" className="legal-section">
        <h2>{"12. Provider's Obligations"}</h2>
        <ul>
          <li>
            We will not perform actions that violate these terms or local laws, and we will make
            every effort to maintain safe and stable system performance.
          </li>
          <li>
            We maintain secure databases and network encryption to protect user data from breach or
            unauthorized access.
          </li>
        </ul>
      </section>

      <section id="sec-13" className="legal-section">
        <h2>13. User Account Responsibilities</h2>
        <ul>
          <li>
            Users are solely responsible for maintaining the confidentiality of their authentication
            sessions.
          </li>
          <li>You must not lease or transfer account privileges to external third parties.</li>
        </ul>
      </section>

      <section id="sec-14" className="legal-section">
        <h2>14. Prohibited Activities</h2>
        <p>
          Users must not engage in the following actions, and violations may trigger temporary
          suspension or permanent bans:
        </p>
        <ul>
          <li>Registering with false email addresses or fraudulent profiles.</li>
          <li>Bypassing system controls or overloading API endpoints.</li>
          <li>Employing auto-typing macros or input injection tools.</li>
          <li>Disrupting server stability or reverse-engineering analytical architectures.</li>
        </ul>
      </section>

      <section id="sec-15" className="legal-section">
        <h2>15. Ownership of Intellectual Property</h2>
        <ul>
          <li>
            The copyright, patent, trademark, and other intellectual property rights for the 3D
            cylindrical visualizations, SKDM diagnostic algorithms, MVSA comparison scripts, and
            custom design layouts remain exclusively with TypeDiag.
          </li>
          <li>
            You may not copy, transmit, publish, or distribute any proprietary assets from our
            Service without prior written consent.
          </li>
        </ul>
      </section>

      <section id="sec-16" className="legal-section">
        <h2>16. Dispute Resolution</h2>
        <ul>
          <li>
            We welcome feedback and bug reports at `support@typediag.com` or via our in-app forms.
          </li>
          <li>
            Any legal disputes arising from using our Service shall be governed by the laws of the
            Republic of Korea, and the competent courts defined under Civil Procedure Acts will hold
            jurisdiction.
          </li>
        </ul>
      </section>
    </>
  );
}
