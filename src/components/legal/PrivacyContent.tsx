import type { LandingLang } from "@/lib/i18n/lang";

interface PrivacyContentProps {
  lang: LandingLang;
}

export function PrivacyContent({ lang }: PrivacyContentProps) {
  if (lang === "ko") {
    return (
      <>
        {/* 1. 개인정보의 처리 목적 */}
      <section id="sec-1" className="legal-section">
        <h2>1. 개인정보의 처리 목적</h2>
        <p>TypeDiag는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
        <ul>
          <li><strong>회원 가입 및 관리:</strong> 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 고충처리 목적으로 개인정보를 처리합니다.</li>
          <li><strong>타자 연습 세션 및 분석 데이터 영속화:</strong> 사용자의 타이핑 지연 병목 구간 분석(WPM, CPM, 정확도, 개별 키 입력 지연) 및 시각화 모델 제공을 목적으로 타건 데이터와 세션 데이터를 기록하고 영속화합니다.</li>
          <li><strong>AI 기반 타이핑 문장 생성:</strong> 토픽 연습 모드(Topic Mode)에서 정보주체가 입력한 주제어를 바탕으로 인공지능 문장을 맞춤 생성하기 위한 목적으로 데이터를 처리합니다.</li>
          <li><strong>API 오남용 방지:</strong> 비회원 게스트 사용자의 무분별한 API 호출 및 어뷰징 행위를 식별·방지하고 세션의 일관성을 검증하기 위해 게스트 토큰 시스템을 운영합니다.</li>
        </ul>
      </section>

      {/* 2. 처리하는 개인정보의 항목 */}
      <section id="sec-2" className="legal-section">
        <h2>2. 처리하는 개인정보의 항목</h2>
        <p>TypeDiag는 서비스 제공을 위해 필요한 최소한의 범위 내에서 아래와 같이 개인정보를 수집 및 처리하고 있습니다.</p>
        
        <div className="legal-table-container">
          <table className="legal-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>수집 목적</th>
                <th>수집 항목</th>
                <th>수집 근거 / 방법</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>로그인 회원</strong></td>
                <td>회원 서비스 가입 및 인증 관리</td>
                <td>Clerk ID, 이메일 주소, 이름/닉네임, 프로필 사진</td>
                <td>Clerk Auth 연동 / 최초 가입 시 수집</td>
              </tr>
              <tr>
                <td><strong>비로그인 게스트</strong></td>
                <td>임시 세션 유지 및 API 오남용 방지</td>
                <td>Guest UUID, HMAC 토큰</td>
                <td>브라우저 localStorage 생성 / API 헤더 전송</td>
              </tr>
              <tr>
                <td><strong>타자 연습 데이터</strong></td>
                <td>WPM, CPM, 정확도 계산 및 3D 지연 지형 분석</td>
                <td>연습 세션 기록(시작/종료 시각, WPM, CPM, 정확도), 개별 키 이벤트 로그(latency, hold_duration_ms, key_char, seq, 정타 여부)</td>
                <td>연습 완료 시 클라이언트 벌크 업로드</td>
              </tr>
              <tr>
                <td><strong>사용자 피드백</strong></td>
                <td>서비스 오류 접수 및 개선 의견 수렴</td>
                <td>유저 식별 정보(Clerk ID 또는 Guest UUID), 피드백 메시지 본문, 접속 IP 주소</td>
                <td>피드백 전송 폼 작성 시 전송</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="legal-callout">
          <p>※ <strong>비로그인 게스트 데이터의 병합</strong>: 비회원 상태에서 수집된 세션 및 타자 기록은 회원이 로그인 시 클라이언트에서 유효한 게스트 HMAC 토큰 검증을 거쳐 Clerk 회원 계정의 고유 ID로 영구 머지(Merge) 처리된 후 브라우저 내 게스트 식별자는 완전히 파기됩니다.</p>
        </div>
      </section>

      {/* 3. 타건 데이터 가명처리 및 연구 활용 */}
      <section id="sec-3" className="legal-section">
        <h2>3. 타건 데이터 가명처리 및 연구 활용</h2>
        <p>TypeDiag는 사용자의 타자 연습 결과 및 키 입력 이벤트 로그(`key_events`)를 타자 메트릭 개선과 타건 지연 패턴의 학술 연구 목적으로 활용할 수 있습니다. 이때 정보주체의 개인정보가 절대 특정·재식별될 수 없도록 강력한 기술적 보호 조치를 수행합니다.</p>
        
        <h3>사용자 특정 차단 및 가명처리 기법</h3>
        <ul>
          <li><strong>Secret Salt 결합 일방향 해시화:</strong> 정보주체를 직접 식별할 수 있는 이메일, 이름 등의 정보는 연구용 분석 데이터셋에서 원천 제외됩니다.</li>
          <li>또한, Clerk ID 등 고유 식별자는 외부로 절대 유출되지 않는 <strong>서버 고유의 비밀 키(Secret Salt)</strong>를 ID 뒤에 강제로 결합한 후, HMAC-SHA256 방식으로 일방향 해시 변환한 임의의 가명 ID(`Hash(Clerk_ID + Secret_Salt_Key)`)로 대체하여 처리됩니다.</li>
          <li>솔트(Salt) 비밀 키는 서버 내부의 독립적인 환경 변수로 엄격히 통제되며 외부 유출이 불가능하므로, 일방향 해시 처리된 가명 ID는 역방향으로 재식별하거나 본래 사용자와 링크하는 행위가 완전히 차단됩니다.</li>
        </ul>
      </section>

      {/* 4. 개인정보의 처리 및 보유 기간 */}
      <section id="sec-4" className="legal-section">
        <h2>4. 개인정보의 처리 및 보유 기간</h2>
        <p>TypeDiag는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 수집 시 동의받은 보유·이용 기간 내에서 개인정보를 처리하고 보유합니다.</p>
        <ul>
          <li><strong>홈페이지 회원 가입 및 관리 정보:</strong> 회원 탈퇴 시까지</li>
          <li><strong>비회원 게스트 임시 세션 정보:</strong> 브라우저 내 localStorage 파기 시 혹은 회원 머지 완료 시 즉시 삭제</li>
          <li><strong>가명처리된 타건 연구 데이터:</strong> 서비스 개선 및 연구 완료 시까지 (식별성이 완전히 제거된 익명 데이터는 통계 분석을 위해 계속 보관될 수 있음)</li>
          <li><strong>사용자 피드백 및 제안 사항:</strong> 피드백 접수 후 1년 보관 후 파기</li>
        </ul>
      </section>

      {/* 5. 개인정보의 파기 절차 및 방법 */}
      <section id="sec-5" className="legal-section">
        <h2>5. 개인정보의 파기 절차 및 방법</h2>
        <p>TypeDiag는 개인정보 보유기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
        
        <h3>파기 절차</h3>
        <p>이용자가 회원탈퇴를 신청하거나 보유기간이 경과한 개인정보는 파기 사유가 발생한 시점부터 지체 없이 복구 불가능한 방법으로 파기합니다. 단, 게스트 데이터를 로그인 회원으로 머지한 경우 머지 완료된 기존 임시 게스트 기록은 DB상에서 즉시 물리적으로 삭제됩니다.</p>
        
        <h3>파기 방법</h3>
        <ul>
          <li>전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 로우레벨 포맷(Low-Level Format) 또는 복구 불가능한 암호화 파기 기술을 사용하여 영구 삭제합니다.</li>
          <li>종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다. (본 서비스는 오프라인 종이 문서를 수집하지 않습니다.)</li>
        </ul>
      </section>

      {/* 6. 개인정보처리의 위탁 및 국외이전 */}
      <section id="sec-6" className="legal-section">
        <h2>6. 개인정보처리의 위탁 및 국외이전</h2>
        <p>TypeDiag는 원활한 서비스 제공과 글로벌 수준의 인프라 및 기능 연동을 위하여 아래와 같이 개인정보 처리 업무를 일부 위탁하며, 위탁받는 자가 국외에 소재함에 따라 국외 이전을 수행하고 있습니다.</p>
        
        <div className="legal-table-container">
          <table className="legal-table">
            <thead>
              <tr>
                <th>위탁받는 자 (수탁자)</th>
                <th>위탁 국가 / 연락처</th>
                <th>위탁 업무 및 수집 목적</th>
                <th>이전되는 개인정보 항목</th>
                <th>이전 시기 및 방법</th>
                <th>보유 및 이용 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OpenAI, L.L.C.</strong></td>
                <td>미국 (USA)<br/>support@openai.com</td>
                <td>토픽 모드(Topic Mode) 문장 생성을 위한 AI 모델 연동 및 텍스트 분석</td>
                <td>이용자가 직접 입력한 주제어 및 프롬프트 텍스트</td>
                <td>토픽 모드 실행 시 API 호출을 통한 암호화 전송 (HTTPS)</td>
                <td><strong>Zero Data Retention 계약 적용</strong> (답변 생성 직후 즉시 삭제되며 OpenAI의 AI 모델 학습에 활용 배제)</td>
              </tr>
              <tr>
                <td><strong>Clerk, Inc.</strong></td>
                <td>미국 (USA)<br/>privacy@clerk.com</td>
                <td>회원 가입, 로그인 인증 처리 및 세션 상태 검증 위탁</td>
                <td>로그인 정보(Clerk ID, 이메일 주소, 이름)</td>
                <td>회원 가입 및 로그인 시 Clerk SDK를 통한 암호화 전송 (HTTPS)</td>
                <td>회원 탈퇴 시 또는 서비스 종료 시까지</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. 생성형 AI 서비스 개인정보 처리 */}
      <section id="sec-7" className="legal-section">
        <h2>7. 생성형 AI 서비스 개인정보 처리</h2>
        <p>TypeDiag는 OpenAI의 생성형 인공지능(AI) API 기술을 적용하여 실시간 타자 연습 제시문을 생성하고 있습니다. 정보주체의 데이터 주권 보호를 위해 생성형 AI 서비스 부록 지침에 맞춰 안전조치 사항을 준수합니다.</p>
        <ul>
          <li><strong>의도된 용례(Intended Use):</strong> 사용자가 선택한 학습 토픽에 관한 맞춤형 타자 연습 예문을 실시간으로 생성하여 제공하는 보조 기능에 한정됩니다.</li>
          <li><strong>모델 학습의 원천 배제(Opt-out):</strong> OpenAI API 호출 시, 전송된 텍스트가 OpenAI의 대형언어모델(LLM) 학습 및 고도화 학습에 무단 활용되지 않도록 API 전용 정책 및 계약을 적용하고 있으며, 입력된 프롬프트는 답변 생성 직후 즉시 파기되도록 설정되어 있습니다.</li>
          <li><strong>입력 주의사항:</strong> 타자 문장 생성을 위한 프롬프트/주제어 입력창에는 본인 또는 타인의 민감정보(사상, 병력 등) 및 주민등록번호, 계좌번호 등의 고유식별정보를 입력하지 않도록 각별히 유의해 주시기 바랍니다.</li>
        </ul>
      </section>

      {/* 8. 정보주체와 법정대리인의 권리·의무 */}
      <section id="sec-8" className="legal-section">
        <h2>8. 정보주체와 법정대리인의 권리·의무 및 행사방법</h2>
        <p>정보주체는 TypeDiag에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>권리 행사는 TypeDiag 고객센터 혹은 개인정보 보호담당부서에 서면, 전자우편 등을 통하여 신청하실 수 있으며, 당사는 이에 대해 지체 없이 조치하겠습니다.</li>
          <li>회원 가입 시 제공된 정보는 언제든지 서비스 내 설정 화면을 통해 직접 열람하고 정정하거나 회원탈퇴를 통해 직접 삭제하실 수 있습니다.</li>
          <li>정보주체가 개인정보의 오류에 대한 정정 및 삭제를 요구한 경우에는 정정 및 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</li>
          <li>만 14세 미만 아동의 개인정보 처리가 필요한 경우 법정대리인의 동의를 받으며, 법정대리인은 아동의 개인정보에 대하여 열람, 정정, 삭제 및 동의 철회권을 가집니다. (TypeDiag는 기본적으로 만 14세 미만 아동에 대하여 별도의 맞춤 마케팅이나 개인정보를 적극적으로 수집하지 않습니다.)</li>
        </ul>
      </section>

      {/* 9. 개인정보의 안전성 확보조치 */}
      <section id="sec-9" className="legal-section">
        <h2>9. 개인정보의 안전성 확보조치</h2>
        <p>TypeDiag는 개인정보의 안전성 확보를 위해 다음과 같은 기술적, 관리적, 물리적 조치를 취하고 있습니다.</p>
        <ul>
          <li><strong>관리적 조치:</strong> 내부관리계획의 수립 및 시행, 정기적인 직원 교육 및 보안 점검을 진행합니다.</li>
          <li><strong>기술적 조치:</strong> 개인정보처리시스템의 접근권한 관리, 접근통제시스템 설치, 고유식별정보의 전송 및 데이터베이스 암호화 적용, 접속기록의 최소 1년 이상 보관 및 위·변조 방지, 보안프로그램의 주기적 업데이트를 수행합니다.</li>
          <li><strong>물리적 조치:</strong> 서버 인프라(AWS 등 클라우드 보안 환경)를 안전한 외부 데이터센터에서 위탁 관리하며 이에 대한 물리적 비인가자 출입 통제 조치를 확인합니다.</li>
        </ul>
      </section>

      {/* 10. 개인정보 보호책임자 및 권익침해 구제 */}
      <section id="sec-10" className="legal-section">
        <h2>10. 개인정보 보호책임자 및 권익침해 구제방법</h2>
        <p>TypeDiag는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        
        <div className="legal-table-container">
          <table className="legal-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>부서 / 성명</th>
                <th>연락처 (이메일)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>개인정보 보호책임자</strong></td>
                <td>TypeDiag 운영 본부 / 김태영 책임자</td>
                <td>support@typediag.com</td>
              </tr>
              <tr>
                <td><strong>개인정보보호 담당부서</strong></td>
                <td>TypeDiag 데이터보호팀</td>
                <td>privacy@typediag.com</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>정보주체는 아래의 기관에 대해 개인정보 침해에 대한 피해구제, 상담 등을 문의하실 수 있습니다. (아래 기관은 TypeDiag와는 별개의 독립된 기관입니다.)</p>
        <ul>
          <li><strong>개인정보 침해신고센터 (KISA):</strong> (국번없이) 118 / <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer">privacy.kisa.or.kr</a></li>
          <li><strong>개인정보 분쟁조정위원회:</strong> (국번없이) 1833-6972 / <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer">www.kopico.go.kr</a></li>
          <li><strong>대검찰청 사이버수사과:</strong> (국번없이) 1301 / <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer">www.spo.go.kr</a></li>
          <li><strong>경찰청 사이버수사국:</strong> (국번없이) 182 / <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer">ecrm.cyber.go.kr</a></li>
        </ul>
      </section>

      {/* 11. 개인정보 처리방침의 변경 */}
      <section id="sec-11" className="legal-section">
        <h2>11. 개인정보 처리방침의 변경에 관한 사항</h2>
        <p>이 개인정보 처리방침은 <strong>2026년 6월 27일</strong>부터 적용됩니다.</p>
        <p>이전의 개인정보 처리방침은 아래 링크를 통해 확인하실 수 있습니다.</p>
        <ul>
          <li>(현재 최초 제정 버전으로 이전 개정 이력이 존재하지 않습니다.)</li>
        </ul>
      </section>
    </>
    );
  }

  return (
    <>
      {/* English Content Summary */}
      <section id="sec-1" className="legal-section">
      <h2>1. Purpose of Processing</h2>
      <p>TypeDiag processes personal data for the following purposes. The processed data will not be used for purposes other than the following, and if the purpose changes, necessary measures, such as obtaining separate consent under the Personal Information Protection Act, will be implemented.</p>
      <ul>
        <li><strong>Membership Signup and Management:</strong> Identification, authentication, membership maintenance, and abuse prevention.</li>
        <li><strong>Typing Sessions and Analytical Data Persistence:</strong> Collecting typing metrics (WPM, CPM, accuracy, latency) to analyze and visualize the user&apos;s keystroke bottleneck.</li>
        <li><strong>AI-based Practice Content Generation:</strong> Processing theme words in Topic Mode to generate custom AI sentences.</li>
        <li><strong>API Abuse Prevention:</strong> Verifying guest token systems using HMAC verification and guest user identifiers (<code>guest_&lt;uuid&gt;</code>).</li>
      </ul>
      </section>

      <section id="sec-2" className="legal-section">
      <h2>2. Categories of Personal Data</h2>
      <p>We collect minimum required personal data to provide our service:</p>
      <ul>
        <li><strong>Registered Users:</strong> Clerk ID, Email Address, Name, Profile Image.</li>
        <li><strong>Guest Users:</strong> Guest UUID, HMAC Token (stored in browser&apos;s localStorage and transmitted via API headers).</li>
        <li><strong>Keystroke Data:</strong> Session metrics (start/end time, WPM, CPM, accuracy), individual key events (latency, hold duration, keys pressed, correctness).</li>
        <li><strong>User Feedbacks:</strong> User identifiers, message body, IP address.</li>
      </ul>
      </section>

      <section id="sec-3" className="legal-section">
      <h2>3. Keystroke Dynamics Pseudonymization</h2>
      <p>TypeDiag utilizes typing metrics and `key_events` to improve typing diagnostics and conduct academic research. Strictly pseudonymized methods are used to prevent re-identification:</p>
      <ul>
        <li><strong>One-Way Secret Salt Hashing:</strong> Email, names, and other direct identifiers are completely excluded from research datasets.</li>
        <li>User IDs (e.g., Clerk ID) are combined with an <strong>undisclosed server-side Secret Salt Key</strong> and hashed using HMAC-SHA256 (`Hash(Clerk_ID + Secret_Salt_Key)`) before dataset storage.</li>
        <li>Since the Secret Salt key is protected securely on our servers, it is mathematically impossible to reverse-engineer or link pseudonymized IDs back to actual identities.</li>
      </ul>
      </section>

      <section id="sec-4" className="legal-section">
      <h2>4. Retention and Processing Period</h2>
      <p>We process and retain personal data within the designated retention period consented by the user or required by law:</p>
      <ul>
        <li><strong>Membership Data:</strong> Until account withdrawal.</li>
        <li><strong>Guest User Data:</strong> Destroyed upon localStorage deletion or immediately after merging to a member account.</li>
        <li><strong>Pseudonymized Research Data:</strong> Stored until service improvement and research are completed. Fully anonymized statistics may be kept indefinitely.</li>
      </ul>
      </section>

      <section id="sec-5" className="legal-section">
      <h2>5. Destruction Procedures and Methods</h2>
      <p>TypeDiag destroys personal data without delay when the retention period expires or the purpose of processing is achieved:</p>
      <ul>
        <li><strong>Procedure:</strong> Expired data or user-withdrawn data are selected and deleted permanently using unrecoverable methods.</li>
        <li><strong>Methods:</strong> Electronic files are deleted using low-level formats or secure encryption destruction techniques. Paper documents (not collected by this service) are shredded or incinerated.</li>
      </ul>
      </section>

      <section id="sec-6" className="legal-section">
      <h2>6. Entrustment and Overseas Transfer</h2>
      <p>To provide advanced global features, we entrust data processing to overseas partners:</p>
      <ul>
        <li><strong>OpenAI, L.L.C. (USA):</strong> Processing user prompts for custom sentence generation in Topic Mode. Subject to <strong>Zero Data Retention policies</strong> (data deleted immediately after response generation and excluded from AI training).</li>
        <li><strong>Clerk, Inc. (USA):</strong> User sign-up, authentication, and session status verification.</li>
      </ul>
      </section>

      <section id="sec-7" className="legal-section">
      <h2>7. Generative AI Service Data Handling</h2>
      <p>TypeDiag integrates generative AI technologies via OpenAI API. We abide by strict safety guidelines:</p>
      <ul>
        <li><strong>Intended Use:</strong> Generating real-time custom practice sentences tailored to user-defined topics.</li>
        <li><strong>Opt-out / No Training:</strong> All API data transfers enforce the zero-retention policy to prevent user inputs from being used for LLM model training.</li>
        <li><strong>Input Warning:</strong> Users must avoid entering personal, sensitive, or unique identifiers (e.g., resident IDs, passwords, billing accounts) inside prompt input areas.</li>
      </ul>
      </section>

      <section id="sec-8" className="legal-section">
      <h2>8. Rights and Obligations of Data Subjects</h2>
      <p>Data subjects have the right to request access, correction, deletion, and suspension of processing of their personal data:</p>
      <ul>
        <li>You can request changes via customer support or by emailing `privacy@typediag.com`.</li>
        <li>You can directly access, edit, or delete personal profile details via the account settings panel or withdraw membership to immediately erase all associated profiles.</li>
      </ul>
      </section>

      <section id="sec-9" className="legal-section">
      <h2>9. Measures to Ensure Data Safety</h2>
      <p>TypeDiag enforces technical, administrative, and physical security measures:</p>
      <ul>
        <li><strong>Technical:</strong> Restricting administrator access privileges, installing encryption keys, secure database backups, and keeping logs for at least one year.</li>
        <li><strong>Administrative:</strong> Formulating internal security management plans and regularly training handlers.</li>
      </ul>
      </section>

      <section id="sec-10" className="legal-section">
      <h2>10. Chief Privacy Officer and Remedies</h2>
      <p>We designate the CPO to oversee personal data inquiries:</p>
      <ul>
        <li><strong>Chief Privacy Officer:</strong> TypeDiag Operations / CPO (support@typediag.com)</li>
        <li><strong>Inquiries for remedies:</strong> Personal Information Infringement Report Center (privacy.kisa.or.kr / Call: 118)</li>
      </ul>
      </section>

      <section id="sec-11" className="legal-section">
      <h2>11. Amendments to the Privacy Policy</h2>
      <p>This privacy policy is effective as of <strong>June 27, 2026</strong>. There are no prior amendments (Initial version).</p>
      </section>
    </>
  );
}
