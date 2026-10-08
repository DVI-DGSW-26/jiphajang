/**
 * 가짜 서버(`npm run dev:mock`)로 띄웠을 때만 맨 위에 보여요.
 * 화면의 이름·숫자를 실제로 믿지 않게 해요. 빌드 결과에는 나오지 않아요.
 */
export function MockBanner() {
  if (import.meta.env.MODE !== 'mock') return null;
  return (
    <p className="jh-mock-banner" role="note">
      가짜 서버로 보는 중이에요. 화면의 이름과 값은 실제가 아니에요.
    </p>
  );
}
