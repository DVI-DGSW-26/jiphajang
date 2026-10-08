import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import logoReverse from '../../assets/logo/jiphajang-logo-reverse.svg';
import { type AuthMe, logout } from '../lib/api.ts';
import { HOME_PATH, MENU } from '../menu.ts';

const ROLE_LABEL: Record<AuthMe['role'], string> = {
  REPORTER: '보고자',
  VIEWER: '열람자',
};

/**
 * 상단 바 — 디자인 매뉴얼 7장. 화면에서 `ink`를 넓게 쓰는 유일한 곳이에요.
 * 지금 보는 메뉴에 형광 밑줄. 휴대폰 폭에서는 메뉴만 가로로 밀어요.
 */
export function TopBar({ me }: { me: AuthMe }) {
  const [leaving, setLeaving] = useState(false);

  return (
    <header className="jh-topbar">
      <div className="jh-topbar__inner">
        <Link to={HOME_PATH} className="jh-topbar__home">
          <img className="jh-topbar__logo" src={logoReverse} alt="집하장 처음 화면" />
        </Link>
        <nav className="jh-topbar__nav" aria-label="주 메뉴">
          {MENU.map((item) => (
            <NavLink key={item.path} to={item.path} className="jh-topbar__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="jh-topbar__user">
          <span className="jh-topbar__name">
            {me.name} <span className="jh-topbar__role">{ROLE_LABEL[me.role]}</span>
          </span>
          <button
            type="button"
            className="jh-topbar__logout"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              void logout();
            }}
          >
            {leaving ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
      </div>
    </header>
  );
}
