import { NextResponse } from 'next/server';

export function proxy(request) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // ログインページへのアクセス
  if (pathname === '/login') {
    // セッションがある場合はトップページにリダイレクト
    if (session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // セッションがない場合はログインページにリダイレクト
  // (matcherでsignupや静的ファイルは除外されています)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // api, _next/static, _next/image, favicon.ico, signup 以外のすべてのパスに適用
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|signup).*)',
  ],
};
