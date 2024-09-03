import { useState } from 'react'
import SkeletonHandDetection from './components/SkeletonHandDetection'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="App">
      <SkeletonHandDetection />
    </div>
    </>
  )
}

export default App
