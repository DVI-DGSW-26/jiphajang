import logoReverse from '../assets/logo/jiphajang-logo-reverse.svg';

export function App() {
  return (
    <>
      <header className="jh-topbar">
        <div className="jh-topbar__inner">
          <img className="jh-topbar__logo" src={logoReverse} alt="집하장" />
        </div>
      </header>
      <main className="jh-main">
        <h1 className="jh-title">출하 원장</h1>
        <div className="jh-empty">
          <p>아직 등록한 Invoice가 없어요.</p>
        </div>
      </main>
    </>
  );
}
