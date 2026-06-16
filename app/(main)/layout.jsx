import Header from '@/components/Header'
import React from 'react'

function layout({children}) {
  return (
    <div>
      <main>
        <Header />
        {children}
      </main>
    </div>
  )
}

export default layout