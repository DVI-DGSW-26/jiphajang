import logoReverse from '../assets/logo/jiphajang-logo-reverse.svg';
import { EmptyState } from './components/EmptyState.tsx';

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
        <EmptyState
          title="아직 올린 Invoice가 없어요"
          description="Invoice 엑셀 파일을 올리면 읽어서 원장에 넣어요."
        />
      </main>
    </>
  );
}
