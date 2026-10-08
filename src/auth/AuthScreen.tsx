import type { ReactNode } from 'react';
import logo from '../../assets/logo/jiphajang-logo.svg';

/** 로그인 전후에 잠깐 보이는 화면. 아직 누구인지 몰라 상단 바 메뉴를 그리지 않아요 */
export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="jh-auth">
      <div className="jh-auth__box">
        {/* 제목이 무슨 화면인지 말하므로 alt에는 서비스 이름만 담아요 */}
        <img className="jh-auth__logo" src={logo} alt="집하장" />
        <h1 className="jh-title">{title}</h1>
        {children}
      </div>
    </main>
  );
}
