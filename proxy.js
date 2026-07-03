import { NextResponse } from 'next/server';

export function proxy(request) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // ログイン不要でアクセス可能な認証関連ページ (ただし詳細は除く)
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/signup/store' ||
    pathname === '/forgot-password'
  ) {
    // セッションがある場合はトップページにリダイレクト
    if (session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // それ以外のすべての保護されたページ (トップ、プロフィール、詳細登録ページなど)
  // セッションがない場合はログインページにリダイレクト
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // api, _next/static, _next/image, favicon.ico, back_image 以外のすべてのパスに適用
  // /signup は除外せず、proxy内部で判定します。ただし/signup/detailsは保護されます
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|apple_rainbow.svg|back_image).*)',
  ],
};
