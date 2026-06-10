import React from 'react'

function layout({children}) {
  return (
    <div>
      <main>
        {children}
      </main>
    </div>
  )
}

export default layout