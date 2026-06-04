import Head from 'next/head'
import '../src/App.css'

export default function Home() {
  return (
    <>
      <Head>
        <title>matiapu-web (Next)</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <div>
        {/* 既存の App コンポーネントの内容をここに移すか、さらに移行してください */}
        <h1>Welcome to matiapu-web (Next.js)</h1>
      </div>
    </>
  )
}
