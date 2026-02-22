import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/index';
import { useAuthStore } from '../store/authStore';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password || !displayName.trim()) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(email.trim(), password, displayName.trim());
      if (res.success && res.data) {
        setAuth(res.data);
        navigate('/friends', { replace: true });
      } else {
        setError(res.message || '회원가입에 실패했습니다.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <img src="/ego_logo.svg" alt="EgoTalk" className="register-logo" />
        <p className="register-subtitle">회원가입</p>

        <form className="register-form" onSubmit={handleSubmit}>
          <input
            className="register-input"
            type="text"
            placeholder="이름"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
          <input
            className="register-input"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="register-input"
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          {error && <p className="register-error">{error}</p>}

          <button className="register-btn" type="submit" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="register-login-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
